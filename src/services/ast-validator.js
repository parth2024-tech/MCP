const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const builtinASTRules = [
  {
    id: 'no-inline-styles',
    description: 'Inline style props are banned in JSX',
    check(ast, violations) {
      traverse(ast, {
        JSXAttribute(pathObj) {
          if (pathObj.node.name && pathObj.node.name.name === 'style') {
            const loc = pathObj.node.loc?.start;
            violations.push({
              line: loc ? loc.line : 'unknown',
              message: 'Inline style attribute detected. Use Tailwind utility classes instead.'
            });
          }
        }
      });
    }
  },
  {
    id: 'no-any',
    description: "TypeScript 'any' type is banned",
    check(ast, violations) {
      traverse(ast, {
        TSAnyKeyword(pathObj) {
          const loc = pathObj.node.loc?.start;
          violations.push({
            line: loc ? loc.line : 'unknown',
            message: "'any' type detected. Use explicit typing or 'unknown'."
          });
        }
      });
    }
  },
  {
    id: 'no-console-log',
    description: 'console.log is banned in committed code',
    check(ast, violations) {
      traverse(ast, {
        CallExpression(pathObj) {
          const callee = pathObj.node.callee;
          if (
            callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'console' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'log'
          ) {
            const loc = pathObj.node.loc?.start;
            violations.push({
              line: loc ? loc.line : 'unknown',
              message: 'console.log statement detected. Remove before committing.'
            });
          }
        }
      });
    }
  },
  {
    id: 'no-useEffect-fetching',
    description: 'Bans useEffect hook to prevent client-side data fetching',
    check(ast, violations) {
      traverse(ast, {
        CallExpression(pathObj) {
          const callee = pathObj.node.callee;
          if (callee.type === 'Identifier' && callee.name === 'useEffect') {
            const loc = pathObj.node.loc?.start;
            violations.push({
              line: loc ? loc.line : 'unknown',
              message: 'useEffect hook detected. Ensure this is not used for data fetching (use React Server Components instead).'
            });
          }
        }
      });
    }
  }
];

function validateWithAST(code, filename) {
  const isJSOrTS = /\.[jt]sx?$/.test(filename);
  if (!isJSOrTS) return [];

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    });
  } catch (err) {
    // If parsing fails, return the parse error as a violation
    return [{
      ruleId: 'syntax-error',
      violations: [`Parse Error: ${err.message}`]
    }];
  }

  const results = [];
  for (const rule of builtinASTRules) {
    const violations = [];
    rule.check(ast, violations);
    if (violations.length > 0) {
      results.push({
        ruleId: rule.id,
        violations: violations.map(v => `Line ${v.line}: ${v.message}`)
      });
    }
  }

  return results;
}

module.exports = { validateWithAST, builtinASTRules };
