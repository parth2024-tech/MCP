const { toJsonSchemaCompat } = require('@modelcontextprotocol/sdk/server/zod-json-schema-compat.js');
const { z } = require('zod');

const schema = z.object({
  task_id: z.string(),
  session_id: z.string().optional()
});

console.log(JSON.stringify(toJsonSchemaCompat(schema), null, 2));
