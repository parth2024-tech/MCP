const fs = require('fs').promises;
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { logger } = require('../utils/logger');

class ASTIndexer {
  constructor(kgService) {
    this.kg = kgService;
  }

  async indexFile(filePath, content) {
    let ast;
    try {
      ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });
    } catch (err) {
      logger.warn('ASTIndexer', `Failed to parse ${filePath}: ${err.message}`);
      return;
    }

    // Upsert File node
    await this.kg.writeTransaction(
      `MERGE (f:File {path: $path})`,
      { path: filePath }
    );

    const symbols = [];
    const calls = [];
    const imports = [];

    traverse(ast, {
      FunctionDeclaration(pathObj) {
        if (pathObj.node.id) {
          symbols.push({
            id: `${filePath}::${pathObj.node.id.name}`,
            name: pathObj.node.id.name,
            type: 'Function',
            line: pathObj.node.loc?.start?.line || 0
          });
        }
      },
      VariableDeclarator(pathObj) {
        if (pathObj.node.id && pathObj.node.id.type === 'Identifier') {
          let type = 'Variable';
          if (pathObj.node.init && (pathObj.node.init.type === 'ArrowFunctionExpression' || pathObj.node.init.type === 'FunctionExpression')) {
            type = 'Function';
          }
          symbols.push({
            id: `${filePath}::${pathObj.node.id.name}`,
            name: pathObj.node.id.name,
            type,
            line: pathObj.node.loc?.start?.line || 0
          });
        }
      },
      ClassDeclaration(pathObj) {
        if (pathObj.node.id) {
          symbols.push({
            id: `${filePath}::${pathObj.node.id.name}`,
            name: pathObj.node.id.name,
            type: 'Class',
            line: pathObj.node.loc?.start?.line || 0
          });
        }
      },
      CallExpression(pathObj) {
        if (pathObj.node.callee.type === 'Identifier') {
          let caller = 'global';
          let p = pathObj.parentPath;
          while (p) {
            if (p.node.type === 'FunctionDeclaration' && p.node.id) {
              caller = p.node.id.name;
              break;
            }
            if (p.node.type === 'VariableDeclarator' && p.node.id) {
              caller = p.node.id.name;
              break;
            }
            p = p.parentPath;
          }
          calls.push({
            callerId: `${filePath}::${caller}`,
            calleeName: pathObj.node.callee.name
          });
        }
      },
      ImportDeclaration(pathObj) {
        const source = pathObj.node.source.value;
        pathObj.node.specifiers.forEach(spec => {
          if (spec.local) {
            imports.push({
              file: filePath,
              source,
              local: spec.local.name
            });
          }
        });
      }
    });

    // Write Symbols to DB
    for (const sym of symbols) {
      await this.kg.writeTransaction(
        `
        MERGE (s:Symbol {id: $id})
        SET s.name = $name, s.type = $type, s.line = $line, s.file = $file
        WITH s
        MATCH (f:File {path: $file})
        MERGE (f)-[:DEFINES]->(s)
        `,
        { ...sym, file: filePath }
      );
    }

    // Write Calls (heuristically link to same-file symbols)
    for (const call of calls) {
      await this.kg.writeTransaction(
        `
        MATCH (caller:Symbol {id: $callerId})
        MATCH (callee:Symbol {name: $calleeName, file: $file})
        MERGE (caller)-[:CALLS]->(callee)
        `,
        { callerId: call.callerId, calleeName: call.calleeName, file: filePath }
      );
    }

    // Write Imports
    for (const imp of imports) {
      await this.kg.writeTransaction(
        `
        MATCH (f:File {path: $file})
        MERGE (dep:File {path: $source})
        MERGE (f)-[:IMPORTS {local: $local}]->(dep)
        `,
        imp
      );
    }
    
    logger.debug('ASTIndexer', `Indexed file ${filePath} with ${symbols.length} symbols.`);
  }
}

module.exports = ASTIndexer;
