/**
 * DSPy Declarative Signatures & Types
 *
 * Implements Stanford DSPy's declarative programming abstractions for TypeScript:
 * - Signature: Typed specification of inputs and outputs
 * - Demonstration: Few-shot exemplar paired with score and reasoning
 * - OptimizationMetric: Evaluator signature for scoring LLM traces
 */

export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'code';

export interface InputField {
  name: string;
  description: string;
  type?: FieldType;
  required?: boolean;
  default?: unknown;
}

export interface OutputField {
  name: string;
  description: string;
  type?: FieldType;
  prefix?: string;
}

export interface SignatureDefinition {
  name: string;
  description: string;
  inputs: InputField[];
  outputs: OutputField[];
}

export interface Demonstration {
  id?: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  score?: number;
  rationale?: string;
}

export interface CompiledPrompt {
  signatureName: string;
  systemPrompt: string;
  userPromptTemplate: string;
  demonstrations: Demonstration[];
  estimatedTokens: number;
}

export interface MetricEvaluationResult {
  passed: boolean;
  score: number; // 0.0 to 1.0
  violations: string[];
  metrics: {
    astValid: boolean;
    ruleScore: number;
    tokenEfficiency: number;
  };
}

export type EvaluationMetric = (
  prediction: Record<string, unknown>,
  target?: Record<string, unknown>
) => Promise<MetricEvaluationResult> | MetricEvaluationResult;
