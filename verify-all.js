const fs = require('fs');
const path = require('path');
const { selectTopSkills } = require('./src/services/context-budget');
const { routeModel } = require('./src/services/model-router');
const { generateProjectPrompt } = require('./src/services/project-prompt-generator');
const { validate } = require('./src/services/output-validator');

(async () => {
  console.log("\n=======================================================");
  console.log("TEST 1: CONTEXT BUDGET (Simulated 10-skill pool)");
  console.log("=======================================================");
  // Let's use real skills from the directory that cover different domains
  const mockPool = [
    'react-ui-patterns', 'postgresql-optimization', 'testing-patterns', 
    'security-scanning-security-dependencies', 'aws-serverless', 
    'docker-compose-setup', 'seo-content-writer', 'marketing-psychology',
    'python-testing-patterns', 'firebase-firestore'
  ];

  const prompts = [
    "I need to build a new React component with complex loading states",
    "How do I optimize my slow PostgreSQL database queries?",
    "Write some unit tests using Jest and TDD",
    "Audit my project dependencies for security vulnerabilities",
    "Deploy a serverless lambda function to AWS"
  ];

  for (const prompt of prompts) {
    console.log(`\nPrompt: "${prompt}"`);
    const result = selectTopSkills(mockPool, prompt, 3);
    result.selected.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.name} (Score: ${s.score})`);
    });
  }

  console.log("\n=======================================================");
  console.log("TEST 2: MODEL ROUTER (5 Task Types)");
  console.log("=======================================================");
  const routerPrompts = [
    "How should I structure the microservice architecture and database schema?", // architecture
    "Generate a boilerplate Next.js component", // boilerplate
    "Investigate why this code is throwing a null pointer exception in production", // debugging
    "Do a full OWASP security review of this authentication code", // security_audit
    "Brainstorm some creative naming ideas for my new startup" // ideation
  ];

  for (const prompt of routerPrompts) {
    console.log(`\nPrompt: "${prompt}"`);
    const result = await routeModel(prompt);
    console.log(`  Task:  ${result.task_type}`);
    console.log(`  Model: ${result.model} (Temp: ${result.temperature})`);
  }

  console.log("\n=======================================================");
  console.log("TEST 3: PROJECT PROMPT GENERATOR");
  console.log("=======================================================");
  // Create a temporary valid config in a temp dir
  const tmpDir = fs.mkdtempSync('/tmp/ase-test-');
  fs.writeFileSync(path.join(tmpDir, '.ase-project.json'), JSON.stringify({
    name: "VerifyApp",
    description: "A test application for verification.",
    tech_stack: ["TypeScript", "Node.js"],
    conventions: ["Use async/await"],
    never_do: ["Never use var"],
    sprint_focus: "Testing the generator"
  }));
  const promptResult = await generateProjectPrompt(tmpDir);
  console.log("\nGenerated Prompt (Preview):");
  console.log(promptResult.prompt.split('\n').slice(0, 15).join('\n'));
  console.log("...");

  console.log("\n=======================================================");
  console.log("TEST 4: OUTPUT VALIDATOR (Dirty File)");
  console.log("=======================================================");
  // We'll run the output validator on a dummy project with a deliberate error
  const dirtyDir = fs.mkdtempSync('/tmp/ase-dirty-');
  // Setup minimal TS project
  fs.writeFileSync(path.join(dirtyDir, 'package.json'), JSON.stringify({
    name: "dirty-test",
    devDependencies: { "typescript": "^5.0.0" }
  }));
  fs.writeFileSync(path.join(dirtyDir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { strict: true, noEmit: true }
  }));
  // Deliberate type error
  fs.writeFileSync(path.join(dirtyDir, 'index.ts'), "const x: number = 'hello';\n");

  // We need to install typescript locally or have it globally for this to run
  console.log("Running validator on dirty TS project...");
  const validResult = await validate(dirtyDir);
  console.log(`Passed: ${validResult.passed}`);
  console.log(`Critical Failure: ${validResult.critical_failure}`);
  console.log(`Summary: ${validResult.summary}`);
  const tsStep = validResult.results.find(r => r.step === 'TypeScript type check');
  if (tsStep) {
    console.log("\nTypeScript Output Snippet:");
    console.log(tsStep.output.split('\n').slice(0, 3).join('\n'));
  }

  console.log("\n=======================================================");
  console.log("ALL VERIFICATION TESTS COMPLETE");
  console.log("=======================================================\n");
})();

