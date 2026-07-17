import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
export class BaseTool {
    get inputSchema() {
        return toJsonSchemaCompat(this.schema);
    }
    async validateAndExecute(rawArgs, context) {
        const parseResult = this.schema.safeParse(rawArgs);
        if (!parseResult.success) {
            throw new Error(`Validation Error for tool ${this.name}: ${parseResult.error.message}`);
        }
        return this.execute(parseResult.data, context);
    }
}
