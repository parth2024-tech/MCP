import { z } from 'zod';
import type { Container } from './Container';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';

export interface ToolContext {
  container: Container;
  reqId: string;
  reqLogger?: any; // To be typed properly later
  extra?: any;
}

export abstract class BaseTool<TArgs> {
  abstract name: string;
  abstract description: string;
  abstract schema: z.ZodType<TArgs>;

  get inputSchema(): any {
    return toJsonSchemaCompat(this.schema);
  }

  async validateAndExecute(rawArgs: unknown, context: ToolContext): Promise<any> {
    const parseResult = this.schema.safeParse(rawArgs);
    if (!parseResult.success) {
      throw parseResult.error;
    }
    return this.execute(parseResult.data, context);
  }

  protected abstract execute(args: TArgs, context: ToolContext): Promise<any>;
}
