const fs = require('fs');
const path = require('path');

const toolsDir = path.join(__dirname, 'src', 'tools');
const files = fs.readdirSync(toolsDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(toolsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add extra to handler signature
  content = content.replace(/handler:\s*async\s*\(([^)]*)\)\s*=>\s*\{/, (match, args) => {
    if (args.includes('extra')) return match;
    const newArgs = args.trim() ? `${args}, extra` : 'args, extra';
    return `handler: async (${newArgs}) => {`;
  });

  // 2. Replace logAccess calls
  content = content.replace(/logAccess\(([^)]+)\)/g, (match, args) => {
    return `(extra?.reqLogger || require('../utils/logger')).logAccess(${args})`;
  });

  // 3. Replace warn calls
  content = content.replace(/warn\(([^)]+)\)/g, (match, args) => {
    return `(extra?.reqLogger || require('../utils/logger')).warn(${args})`;
  });

  // 4. Track timing if logAccess is missing but user asked for it
  // Actually the user just asked to wire it. The existing logAccess calls will be wired correctly now.
  // Wait, the prompt says "Walk through each of the 8 tool handlers and add the logAccess call at the end".
  // If some tools don't have logAccess, we should add them. Let's check which don't have it.

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Patched', files.length, 'tools.');
