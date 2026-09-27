/**
 * DSPy Declarative Modules in TypeScript
 *
 * Implements core execution modules:
 * - BaseModule: Foundations for input/output templating and response extraction
 * - PredictModule: Standard zero-shot or few-shot structured generation
 * - ChainOfThoughtModule: Step-by-step reasoning augmentation (adds rationale)
 * - ReActModule: Interleaved Reasoning and Action execution with tool registry
 */

import { Demonstration, OutputField, SignatureDefinition } from './types';

export abstract class BaseModule {
  public signature: SignatureDefinition;

  constructor(signature: SignatureDefinition) {
    this.signature = signature;
  }

  /**
   * Generates the system prompt instructing the model on its task, input structure,
   * and expected output format according to the declared signature.
   */
  public renderSystemPrompt(): string {
    const lines: string[] = [
      `TASK: ${this.signature.description}`,
      '',
      'INPUT FIELDS:',
      ...this.signature.inputs.map(
        inp => `- ${inp.name} (${inp.type || 'string'}): ${inp.description}${inp.required ? ' [REQUIRED]' : ''}`
      ),
      '',
      'OUTPUT FIELDS (Follow this exact format):',
      ...this.signature.outputs.map(
        out => `- ${out.prefix || out.name}: ${out.description} (${out.type || 'string'})`
      ),
      '',
      'Respond strictly following the output field prefixes.'
    ];

    return lines.join('\n');
  }

  /**
   * Formats a set of demonstrations into DSPy-style few-shot blocks.
   */
  public renderDemonstrations(demos: Demonstration[]): string {
    if (!demos || demos.length === 0) return '';

    const blocks: string[] = [];
    demos.forEach((demo, idx) => {
      const demoLines: string[] = [`--- DEMONSTRATION ${idx + 1} ---`];
      for (const inp of this.signature.inputs) {
        let val = demo.inputs[inp.name];
        if (val === undefined) {
          val = demo.inputs.task ?? demo.inputs.goal ?? demo.inputs.input ?? demo.inputs.requirement ?? Object.values(demo.inputs)[0] ?? '';
        }
        demoLines.push(`${inp.name}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`);
      }
      if (demo.rationale) {
        demoLines.push(`Reasoning: ${demo.rationale}`);
      }
      for (const out of this.signature.outputs) {
        const prefix = out.prefix || out.name;
        let val = demo.outputs[out.name];
        if (val === undefined) {
          val = demo.outputs.code ?? demo.outputs.output ?? demo.outputs.refined_code ?? Object.values(demo.outputs)[0] ?? '';
        }
        demoLines.push(`${prefix}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`);
      }
      blocks.push(demoLines.join('\n'));
    });

    return blocks.join('\n\n') + '\n\n';
  }

  /**
   * Formats the current input values for user prompt invocation.
   */
  public formatInputs(inputs: Record<string, unknown>): string {
    const lines: string[] = ['--- CURRENT TASK INPUTS ---'];
    for (const inp of this.signature.inputs) {
      const val = inputs[inp.name] !== undefined ? inputs[inp.name] : (inp.default ?? '');
      lines.push(`${inp.name}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`);
    }
    return lines.join('\n');
  }

  /**
   * Parses the raw string response from the LLM into structured key-value outputs.
   */
  public parseOutputs(rawText: string): Record<string, unknown> {
    const results: Record<string, unknown> = {};
    const outputs = this.signature.outputs;

    for (let i = 0; i < outputs.length; i++) {
      const current = outputs[i];
      const currentPrefix = (current.prefix || current.name).trim();
      const nextOutput = outputs[i + 1];
      const nextPrefix = nextOutput ? (nextOutput.prefix || nextOutput.name).trim() : null;

      const pattern = nextPrefix
        ? new RegExp(`${currentPrefix}:\\s*([\\s\\S]*?)(?=(?:${nextPrefix}:|$))`, 'i')
        : new RegExp(`${currentPrefix}:\\s*([\\s\\S]*)`, 'i');

      const match = rawText.match(pattern);
      if (match && match[1] !== undefined) {
        let extracted = match[1].trim();
        // Remove trailing markdown codeblock markers if present
        if (current.type === 'code' || current.type === 'string') {
          extracted = extracted.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
        }
        if (current.type === 'number') {
          results[current.name] = Number(extracted) || 0;
        } else if (current.type === 'boolean') {
          results[current.name] = extracted.toLowerCase().includes('true');
        } else if (current.type === 'object' || current.type === 'array') {
          try {
            results[current.name] = JSON.parse(extracted);
          } catch {
            results[current.name] = extracted;
          }
        } else {
          results[current.name] = extracted;
        }
      } else {
        results[current.name] = '';
      }
    }

    return results;
  }
}

/**
 * PredictModule: Basic DSPy Predict wrapper for declarative generation.
 */
export class PredictModule extends BaseModule {
  constructor(signature: SignatureDefinition) {
    super(signature);
  }
}

/**
 * ChainOfThoughtModule: Augments any signature with an initial 'reasoning' field.
 * This instructs the model to produce step-by-step rationales before the final output.
 */
export class ChainOfThoughtModule extends BaseModule {
  constructor(signature: SignatureDefinition) {
    const hasReasoning = signature.outputs.some(
      o => o.name.toLowerCase() === 'reasoning' || o.name.toLowerCase() === 'rationale'
    );

    const augmentedOutputs: OutputField[] = hasReasoning
      ? [...signature.outputs]
      : [
          {
            name: 'reasoning',
            description: 'Step-by-step thinking process and intermediate deductions before answering.',
            type: 'string',
            prefix: 'Reasoning'
          },
          ...signature.outputs
        ];

    super({
      ...signature,
      outputs: augmentedOutputs
    });
  }
}

/**
 * ReActModule: Configures signatures for Reason-Act cycles using registered tools.
 */
export class ReActModule extends BaseModule {
  public tools: Array<{ name: string; description: string }>;

  constructor(
    signature: SignatureDefinition,
    tools: Array<{ name: string; description: string }>
  ) {
    const reactOutputs: OutputField[] = [
      {
        name: 'thought',
        description: 'Current analysis of what to do next.',
        type: 'string',
        prefix: 'Thought'
      },
      {
        name: 'action',
        description: `The tool name and JSON arguments to execute. Valid tools: ${tools.map(t => t.name).join(', ')}`,
        type: 'string',
        prefix: 'Action'
      },
      {
        name: 'observation',
        description: 'The output returned from the action execution.',
        type: 'string',
        prefix: 'Observation'
      },
      ...signature.outputs
    ];

    super({
      ...signature,
      outputs: reactOutputs
    });
    this.tools = tools;
  }

  public override renderSystemPrompt(): string {
    const base = super.renderSystemPrompt();
    const toolDescriptions = this.tools
      .map(t => `- ${t.name}: ${t.description}`)
      .join('\n');

    return [
      base,
      '',
      'AVAILABLE TOOLS FOR REACT ACTIONS:',
      toolDescriptions,
      '',
      'REACT INSTRUCTIONS:',
      '1. State your Thought about the sub-goal.',
      '2. Issue an Action formatted as: tool_name({"arg": "value"}).',
      '3. In subsequent turns, review the Observation to derive the next Thought or final Answer.'
    ].join('\n');
  }
}
