import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';
import { BootstrapFewShotOptimizer } from '../services/teleprompter';
import { SignatureDefinition } from '../core/dspy/types';
import { ChainOfThoughtModule, PredictModule, ReActModule } from '../core/dspy/modules';

const CompileOptimizedPromptSchema = z.object({
  signature: z.object({
    name: z.string().describe('Signature name e.g. CodeGenerator'),
    description: z.string().describe('Task objective for this signature'),
    inputs: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'code']).optional(),
        required: z.boolean().optional()
      })
    ),
    outputs: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'code']).optional(),
        prefix: z.string().optional()
      })
    )
  }).describe('DSPy Declarative Signature defining input and output specification'),
  inputs: z.record(z.string(), z.unknown()).describe('Current input values to populate the task template with'),
  module_type: z.enum(['predict', 'chain_of_thought', 'react']).default('chain_of_thought').describe('Reasoning module style to compile for'),
  max_demonstrations: z.number().optional().default(3).describe('Maximum number of bootstrapped few-shot examples to include')
});

type CompileOptimizedPromptArgs = z.infer<typeof CompileOptimizedPromptSchema>;

export default class CompileOptimizedPromptTool extends BaseTool<CompileOptimizedPromptArgs> {
  name = 'compile_optimized_prompt';
  description = 'Compiles an optimized DSPy-style prompt using historical high-utility demonstrations, AST scoring, and Cobb-Douglas token budgeting.';
  schema = CompileOptimizedPromptSchema;

  protected async execute(args: CompileOptimizedPromptArgs, context: ToolContext): Promise<Record<string, unknown>> {
    const orchDb = context.container.resolve<unknown>('OrchestrationDB');
    let dbHandle = null;
    if (orchDb && typeof (orchDb as { getDB?: () => unknown }).getDB === 'function') {
      dbHandle = (orchDb as { getDB: () => unknown }).getDB();
    }

    const optimizer = new BootstrapFewShotOptimizer(dbHandle);

    let moduleInstance;
    const signature = args.signature as SignatureDefinition;

    if (args.module_type === 'react') {
      const toolRegistry = context.container.resolve<{ list?: () => Array<{ name: string; description: string }> }>('ToolRegistry');
      const availableTools = toolRegistry && typeof toolRegistry.list === 'function'
        ? toolRegistry.list().map(t => ({ name: t.name, description: t.description }))
        : [];
      moduleInstance = new ReActModule(signature, availableTools);
    } else if (args.module_type === 'predict') {
      moduleInstance = new PredictModule(signature);
    } else {
      moduleInstance = new ChainOfThoughtModule(signature);
    }

    const compiled = optimizer.compile(signature, args.inputs, {
      maxDemonstrations: args.max_demonstrations,
      module: moduleInstance
    });

    return {
      signature_name: compiled.signatureName,
      module_type: args.module_type,
      system_prompt: compiled.systemPrompt,
      user_prompt: compiled.userPromptTemplate,
      demonstrations_count: compiled.demonstrations.length,
      estimated_tokens: compiled.estimatedTokens
    };
  }
}
