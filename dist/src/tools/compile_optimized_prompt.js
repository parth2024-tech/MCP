"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
const teleprompter_1 = require("../services/teleprompter");
const modules_1 = require("../core/dspy/modules");
const CompileOptimizedPromptSchema = zod_1.z.object({
    signature: zod_1.z.object({
        name: zod_1.z.string().describe('Signature name e.g. CodeGenerator'),
        description: zod_1.z.string().describe('Task objective for this signature'),
        inputs: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            description: zod_1.z.string(),
            type: zod_1.z.enum(['string', 'number', 'boolean', 'array', 'object', 'code']).optional(),
            required: zod_1.z.boolean().optional()
        })),
        outputs: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            description: zod_1.z.string(),
            type: zod_1.z.enum(['string', 'number', 'boolean', 'array', 'object', 'code']).optional(),
            prefix: zod_1.z.string().optional()
        }))
    }).describe('DSPy Declarative Signature defining input and output specification'),
    inputs: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).describe('Current input values to populate the task template with'),
    module_type: zod_1.z.enum(['predict', 'chain_of_thought', 'react']).default('chain_of_thought').describe('Reasoning module style to compile for'),
    max_demonstrations: zod_1.z.number().optional().default(3).describe('Maximum number of bootstrapped few-shot examples to include')
});
class CompileOptimizedPromptTool extends BaseTool_1.BaseTool {
    name = 'compile_optimized_prompt';
    description = 'Compiles an optimized DSPy-style prompt using historical high-utility demonstrations, AST scoring, and Cobb-Douglas token budgeting.';
    schema = CompileOptimizedPromptSchema;
    async execute(args, context) {
        const orchDb = context.container.resolve('OrchestrationDB');
        let dbHandle = null;
        if (orchDb && typeof orchDb.getDB === 'function') {
            dbHandle = orchDb.getDB();
        }
        const optimizer = new teleprompter_1.BootstrapFewShotOptimizer(dbHandle);
        let moduleInstance;
        const signature = args.signature;
        if (args.module_type === 'react') {
            const toolRegistry = context.container.resolve('ToolRegistry');
            const availableTools = toolRegistry && typeof toolRegistry.list === 'function'
                ? toolRegistry.list().map(t => ({ name: t.name, description: t.description }))
                : [];
            moduleInstance = new modules_1.ReActModule(signature, availableTools);
        }
        else if (args.module_type === 'predict') {
            moduleInstance = new modules_1.PredictModule(signature);
        }
        else {
            moduleInstance = new modules_1.ChainOfThoughtModule(signature);
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
exports.default = CompileOptimizedPromptTool;
