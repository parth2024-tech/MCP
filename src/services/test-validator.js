const fs = require('fs');
const path = require('path');
const { validate } = require('./output-validator');

console.log("\n=======================================================");
console.log("TEST 4: OUTPUT VALIDATOR (Dirty File)");
console.log("=======================================================");

const dirtyDir = '/tmp/ase-dirty-test';
if (!fs.existsSync(dirtyDir)) fs.mkdirSync(dirtyDir);

fs.writeFileSync(path.join(dirtyDir, 'package.json'), JSON.stringify({
  name: "dirty-test",
  devDependencies: { "typescript": "^5.0.0" }
}));
fs.writeFileSync(path.join(dirtyDir, 'tsconfig.json'), JSON.stringify({
  compilerOptions: { strict: true, noEmit: true }
}));
fs.writeFileSync(path.join(dirtyDir, 'index.ts'), "const x: number = 'hello';\n");

console.log("Running validator...");
const validResult = validate(dirtyDir);
console.log(`Passed: ${validResult.passed}`);
console.log(`Critical Failure: ${validResult.critical_failure}`);
console.log(`Summary: ${validResult.summary}`);
const tsStep = validResult.results.find(r => r.step === 'TypeScript type check');
if (tsStep) {
  console.log("\nTypeScript Output Snippet:");
  console.log(tsStep.output.split('\n').slice(0, 3).join('\n'));
}
