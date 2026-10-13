"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTool = void 0;
const zod_json_schema_compat_js_1 = require("@modelcontextprotocol/sdk/server/zod-json-schema-compat.js");
class BaseTool {
    get inputSchema() {
        return (0, zod_json_schema_compat_js_1.toJsonSchemaCompat)(this.schema);
    }
    async validateAndExecute(rawArgs, context) {
        const parseResult = this.schema.safeParse(rawArgs);
        if (!parseResult.success) {
            throw parseResult.error;
        }
        return this.execute(parseResult.data, context);
    }
}
exports.BaseTool = BaseTool;
