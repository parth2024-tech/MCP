const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '../../');
const IGNORED_ENTRIES = new Set(['.git', '.github', 'node_modules', 'tools', 'docs', 'data', 'scripts', 'package.json', 'package-lock.json', 'global_auto_detector.md', 'skills_setup_report.md', 'benchmark_skills.py']);

function findMainMd(skillPath) {
  for (const name of ['SKILL.md', 'README.md']) {
    const p = path.join(skillPath, name);
    if (fs.existsSync(p)) return p;
  }
  try {
    const files = fs.readdirSync(skillPath);
    for (const f of files) {
      if (f.endsWith('.md')) return path.join(skillPath, f);
    }
  } catch (err) {}
  return null;
}

function validateSkill(name, filePath) {
  const errors = [];
  let content;
  
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return [`Failed to read file: ${err.message}`];
  }

  // 1. Check frontmatter presence
  if (!content.startsWith('---')) {
    errors.push('Missing Frontmatter header (---)');
  } else {
    const fmEnd = content.indexOf('---', 3);
    if (fmEnd === -1) {
      errors.push('Unclosed Frontmatter header');
    } else {
      const fm = content.substring(3, fmEnd);
      
      // 2. Validate Risk Metadata
      const riskMatch = fm.match(/^risk:\s*(.*)/m);
      if (!riskMatch) {
        errors.push('Missing "risk" metadata in frontmatter');
      } else {
        const risk = riskMatch[1].trim();
        const validRisks = new Set(['none', 'safe', 'critical', 'offensive', 'unknown']);
        if (!validRisks.has(risk)) {
          errors.push(`Invalid risk value: "${risk}". Must be one of: none, safe, critical, offensive, unknown`);
        }
      }

      // 3. Validate Category Metadata
      const catMatch = fm.match(/^category:\s*(.*)/m);
      if (!catMatch) {
        errors.push('Missing "category" metadata in frontmatter');
      }
    }
  }

  // 4. Validate Core Headings (e.g. When to Use)
  if (!/#+\s+When\s+to\s+Use/i.test(content) && !/when\s+to\s+use/i.test(content)) {
    errors.push('Missing "When to Use" deployment guidelines section');
  }

  // 5. Check for Truncation anomalies
  if (content.trim().endsWith('...')) {
    errors.push('Possible truncated description or incomplete instructions');
  }

  return errors;
}

function main() {
  console.log('ASE CI Release Validator: Starting checks...');
  let totalFiles = 0;
  let totalErrors = 0;
  
  try {
    const entries = fs.readdirSync(SKILLS_DIR);
    for (const entry of entries) {
      if (IGNORED_ENTRIES.has(entry) || entry.startsWith('.')) continue;
      
      const skillPath = path.join(SKILLS_DIR, entry);
      const stat = fs.statSync(skillPath);
      if (!stat.isDirectory()) continue;
      
      const mdFile = findMainMd(skillPath);
      if (!mdFile) continue;
      
      totalFiles++;
      const errors = validateSkill(entry, mdFile);
      if (errors.length > 0) {
        console.error(`\n❌ Error in skill [${entry}]:`);
        errors.forEach(err => console.error(`  - ${err}`));
        totalErrors += errors.length;
      }
    }
  } catch (err) {
    console.error(`Fatal directory read error: ${err.message}`);
    process.exit(1);
  }

  console.log('\n----------------------------------------');
  console.log(`Scan Complete: Audited ${totalFiles} skills.`);
  if (totalErrors > 0) {
    console.error(`Validation Failed! Found ${totalErrors} architectural errors.`);
    process.exit(1);
  } else {
    console.log('✓ Validation Succeeded! All skills are compliant with enterprise release standards.');
    process.exit(0);
  }
}

main();
