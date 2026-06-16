import { parse } from '@babel/parser';

export interface NeverDoRule {
  pattern: RegExp;
  message: string;
}

export interface ASTRule {
  id: string;
  check: (ast: any, code: string) => string[];
}

export interface CodeLoopContext {
  file_path: string;
  task_id: string;
  never_do_rules: NeverDoRule[];
  ast_rules: ASTRule[];
  previous_loops: { number: number; changes: string[] }[];
}

export interface CodeLoopResult {
  code: string;
  changes: string[];
}

export interface CodeLoop {
  number: 1 | 2 | 3 | 4 | 5;
  name: string;
  transform: (code: string, context: CodeLoopContext) => Promise<CodeLoopResult>;
}

function validateWithAST(code: string, filePath: string, rules: ASTRule[]): { ruleId: string; violations: string[] }[] {
  // Only parse JS/TS for AST rules, otherwise skip
  if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) {
    return [];
  }
  
  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      errorRecovery: true
    });
    
    const results = [];
    for (const rule of rules) {
      const violations = rule.check(ast, code);
      if (violations.length > 0) {
        results.push({ ruleId: rule.id, violations });
      }
    }
    return results;
  } catch (err: any) {
    return [{ ruleId: 'PARSE_ERROR', violations: [`Line 1: Failed to parse AST: ${err.message}`] }];
  }
}

export const CODE_LOOP_TRANSFORMS: CodeLoop[] = [
  {
    number: 1,
    name: "NORMALIZE",
    transform: async (code) => {
      const changes: string[] = [];
      const normalized = code.split("\n").map(line => line.trimEnd()).join("\n");
      if (normalized !== code) changes.push("Removed trailing whitespace");
      const withEof = normalized.replace(/\n*$/, "\n");
      if (withEof !== normalized) changes.push("Normalized EOF newline");
      return { code: withEof, changes };
    },
  },
  {
    number: 2,
    name: "PREFLIGHT_GUARD",
    transform: async (code, ctx) => {
      const changes: string[] = [];
      let guarded = code;
      for (const rule of ctx.never_do_rules) {
        if (rule.pattern.test(guarded)) {
          guarded = guarded.replace(rule.pattern, (match) => `/* ⚠️ ASE_VIOLATION[${rule.message}]: ${match} */`);
          changes.push(`Flagged never_do violation: ${rule.message}`);
        }
      }
      return { code: guarded, changes };
    },
  },
  {
    number: 3,
    name: "IMPORT_HYGIENE",
    transform: async (code, ctx) => {
      const changes: string[] = [];
      const lines = code.split("\n");
      const importLines = lines.filter(l => l.trim().startsWith("import "));
      const bodyLines = lines.filter(l => !l.trim().startsWith("import "));
      const bodyText = bodyLines.join("\n");
      
      const unusedImports = importLines.filter(imp => {
        const match = imp.match(/import\s+(?:\{([^}]+)\}|(\w+))/);
        if (!match) return false;
        const names = (match[1] ?? match[2]).split(",").map(n => n.trim().split(" as ").pop()!.trim());
        return names.every(name => !bodyText.includes(name));
      });

      if (unusedImports.length > 0) {
        changes.push(`Flagged ${unusedImports.length} potentially unused imports`);
        let newCode = code;
        unusedImports.forEach(imp => {
          newCode = newCode.replace(imp, `// ⚠️ ASE_UNUSED_IMPORT: ${imp}`);
        });
        return { code: newCode, changes };
      }
      return { code, changes };
    },
  },
  {
    number: 4,
    name: "TYPE_SAFETY",
    transform: async (code, ctx) => {
      const changes: string[] = [];
      const astViolations = validateWithAST(code, ctx.file_path, ctx.ast_rules);
      
      if (astViolations.length === 0) {
        return { code, changes: ["No AST violations found"] };
      }

      const lines = code.split("\n");
      for (const { ruleId, violations } of astViolations) {
        for (const v of violations) {
          const lineMatch = v.match(/Line (\d+):/);
          if (lineMatch) {
            const lineIdx = parseInt(lineMatch[1]) - 1;
            if (lines[lineIdx] !== undefined) {
              lines[lineIdx] += ` // ⚠️ ASE_TYPE[${ruleId}]: ${v}`;
              changes.push(`Annotated: ${v}`);
            }
          }
        }
      }
      return { code: lines.join("\n"), changes };
    },
  },
  {
    number: 5,
    name: "FINAL_CLEAN",
    transform: async (code, ctx) => {
      const changes: string[] = [];
      const hasUnresolvedViolations = 
        code.includes("⚠️ ASE_VIOLATION") || 
        code.includes("⚠️ ASE_TYPE") || 
        code.includes("⚠️ ASE_UNUSED_IMPORT");

      if (hasUnresolvedViolations) {
        changes.push("UNRESOLVED VIOLATIONS PRESENT — file write will be blocked");
        return { code, changes };
      }
      
      changes.push("All loops clean — code is write-ready");
      return { code, changes };
    },
  },
];
