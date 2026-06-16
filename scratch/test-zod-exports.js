const zjs = require('zod-to-json-schema');
const { z } = require('zod');

console.log('Keys exported:', Object.keys(zjs));
console.log('default export:', typeof zjs.default);
const schema = z.object({
  task_id: z.string(),
  session_id: z.string().optional()
});

const fn = zjs.zodToJsonSchema || zjs.default || zjs;
console.log(JSON.stringify(fn(schema), null, 2));
