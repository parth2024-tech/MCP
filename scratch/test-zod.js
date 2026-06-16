const { zodToJsonSchema } = require('zod-to-json-schema');
const { z } = require('zod');

const schema = z.object({
  task_id: z.string(),
  session_id: z.string().optional()
});

console.log(JSON.stringify(zodToJsonSchema(schema), null, 2));
