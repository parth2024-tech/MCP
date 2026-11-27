"use strict";
/**
 * VaultExporter — Obsidian Knowledge Vault Generator
 *
 * Implements the "Connect the ideas" pillar of the Second Brain framework:
 * - Exports skills, project conventions, and learned lessons into an Obsidian-compatible markdown vault.
 * - Injects bidirectional [[wiki-links]] connecting related skills, rules, and lessons.
 * - Generates Map of Content (MoC) indexes for visual exploration in Obsidian Graph View.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultExporter = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const episodic_learning_1 = require("./episodic-learning");
class VaultExporter {
    projectDir;
    skillsDir;
    vaultDir;
    learningService;
    constructor(options = {}) {
        this.projectDir = options.projectDir || process.cwd();
        this.skillsDir = options.skillsDir || path_1.default.resolve(this.projectDir, '../');
        this.vaultDir = options.vaultDir || path_1.default.join(this.projectDir, 'vault');
        this.learningService = new episodic_learning_1.EpisodicLearningService(options.dbHandle);
    }
    ensureDir(dirPath) {
        if (!fs_1.default.existsSync(dirPath)) {
            fs_1.default.mkdirSync(dirPath, { recursive: true });
        }
    }
    /**
     * Generates the entire Obsidian markdown vault.
     */
    exportVault() {
        this.ensureDir(this.vaultDir);
        const skillsFolder = path_1.default.join(this.vaultDir, 'Skills');
        const conventionsFolder = path_1.default.join(this.vaultDir, 'Conventions');
        const lessonsFolder = path_1.default.join(this.vaultDir, 'Lessons');
        this.ensureDir(skillsFolder);
        this.ensureDir(conventionsFolder);
        this.ensureDir(lessonsFolder);
        let filesGenerated = 0;
        // ── 1. Export Conventions & Rules from .ase-project.json ──────────────
        let conventionsCount = 0;
        const configPath = path_1.default.join(this.projectDir, '.ase-project.json');
        let projectConfig = {};
        if (fs_1.default.existsSync(configPath)) {
            try {
                projectConfig = JSON.parse(fs_1.default.readFileSync(configPath, 'utf8'));
            }
            catch {
                projectConfig = {};
            }
        }
        const techStack = Array.isArray(projectConfig.tech_stack) ? projectConfig.tech_stack : [];
        const conventions = Array.isArray(projectConfig.conventions) ? projectConfig.conventions : [];
        const neverDo = Array.isArray(projectConfig.never_do) ? projectConfig.never_do : [];
        const conventionsMd = [
            '---',
            'title: Project Conventions & Guardrails',
            'tags: [conventions, guardrails, architecture]',
            'type: convention',
            '---',
            '',
            `# Project Conventions: ${projectConfig.name || 'ASE Workspace'}`,
            '',
            `> ${projectConfig.description || 'Core engineering conventions and rules.'}`,
            '',
            '## Tech Stack',
            ...techStack.map(t => `- \`\`${t}\`\``),
            '',
            '## Coding Conventions',
            ...conventions.map(c => `- ${c}`),
            '',
            '## Never-Do Guardrails (Strict Enforcement)',
            ...neverDo.map(nd => `- ⚠️ **${nd}**`),
            '',
            '---',
            'Links: [[Index]] | [[Skills_Hub]] | [[Lessons_Hub]]'
        ].join('\n');
        fs_1.default.writeFileSync(path_1.default.join(conventionsFolder, 'Conventions.md'), conventionsMd, 'utf8');
        filesGenerated++;
        conventionsCount++;
        // ── 2. Export Skills with [[wiki-links]] ──────────────────────────────
        let skillsCount = 0;
        const skillNames = [];
        // Scan workspace root for skill folders
        const candidateDirs = [this.projectDir, this.skillsDir];
        for (const baseDir of candidateDirs) {
            if (!fs_1.default.existsSync(baseDir))
                continue;
            try {
                const entries = fs_1.default.readdirSync(baseDir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                        const skillMd = path_1.default.join(baseDir, entry.name, 'SKILL.md');
                        if (fs_1.default.existsSync(skillMd)) {
                            const content = fs_1.default.readFileSync(skillMd, 'utf8');
                            const skillNoteName = entry.name;
                            skillNames.push(skillNoteName);
                            const exportContent = [
                                '---',
                                `title: Skill - ${skillNoteName}`,
                                `tags: [skill, agent, ${skillNoteName}]`,
                                'type: skill',
                                '---',
                                '',
                                `# Skill: ${skillNoteName}`,
                                '',
                                'Related Notes: [[Conventions]] | [[Skills_Hub]]',
                                '',
                                '## Raw Skill Specification',
                                '',
                                content
                            ].join('\n');
                            fs_1.default.writeFileSync(path_1.default.join(skillsFolder, `${skillNoteName}.md`), exportContent, 'utf8');
                            filesGenerated++;
                            skillsCount++;
                        }
                    }
                }
            }
            catch {
                // Continue if directory read fails
            }
        }
        // Skills Hub Map of Content
        const skillsHubMd = [
            '---',
            'title: Skills Hub',
            'tags: [moc, skills]',
            'type: hub',
            '---',
            '',
            '# Agent Skills Hub',
            '',
            'Explore active agent skills indexed in the Second Brain:',
            '',
            ...Array.from(new Set(skillNames)).map(s => `- [[${s}]]`),
            '',
            '---',
            'Links: [[Index]] | [[Conventions]] | [[Lessons_Hub]]'
        ].join('\n');
        fs_1.default.writeFileSync(path_1.default.join(skillsFolder, 'Skills_Hub.md'), skillsHubMd, 'utf8');
        filesGenerated++;
        // ── 3. Export Learned Lessons ──────────────────────────────────────────
        const lessons = this.learningService.getAllLessons();
        let lessonsCount = 0;
        for (const lesson of lessons) {
            const tagLinks = lesson.tags.map(t => `#${t.replace(/[^a-zA-Z0-9_]/g, '_')}`).join(' ');
            const lessonMd = [
                '---',
                `id: ${lesson.id}`,
                `confidence: ${lesson.confidence}`,
                `reinforcements: ${lesson.reinforcementCount}`,
                `tags: [lesson, ${lesson.tags.join(', ')}]`,
                'type: lesson',
                '---',
                '',
                `# Lesson: ${lesson.id}`,
                '',
                `**Tags**: ${tagLinks || '#lesson'} | **Reinforcement Score**: ${lesson.reinforcementCount}x`,
                '',
                '## Problem Pattern',
                '> ' + lesson.problem,
                '',
                '## Verified Solution',
                lesson.solution,
                '',
                '---',
                'Related Notes: [[Lessons_Hub]] | [[Conventions]] | [[Index]]'
            ].join('\n');
            fs_1.default.writeFileSync(path_1.default.join(lessonsFolder, `${lesson.id}.md`), lessonMd, 'utf8');
            filesGenerated++;
            lessonsCount++;
        }
        // Lessons Hub Map of Content
        const lessonsHubMd = [
            '---',
            'title: Lessons Learned Hub',
            'tags: [moc, lessons, second_brain]',
            'type: hub',
            '---',
            '',
            '# Episodic Memory: Lessons Learned',
            '',
            'Solutions and heuristics distilled from past task execution:',
            '',
            ...(lessons.length > 0
                ? lessons.map(l => `- [[${l.id}]]: ${l.problem.slice(0, 60)}... (${l.reinforcementCount}x verified)`)
                : ['*No lessons recorded yet. Use `record_learned_lesson` or complete autonomous goal loops to populate.*']),
            '',
            '---',
            'Links: [[Index]] | [[Skills_Hub]] | [[Conventions]]'
        ].join('\n');
        fs_1.default.writeFileSync(path_1.default.join(lessonsFolder, 'Lessons_Hub.md'), lessonsHubMd, 'utf8');
        filesGenerated++;
        // ── 4. Main Index (Map of Content) ────────────────────────────────────
        const indexMd = [
            '---',
            'title: Agent Second Brain — Map of Content',
            'tags: [moc, root, second_brain]',
            'type: root',
            '---',
            '',
            '# 🧠 Agent Second Brain Map of Content',
            '',
            '> *"Your second brain should get sharper after every session."*',
            '',
            '## 🧭 Navigation Hubs',
            '- 🛠️ **Skills**: [[Skills_Hub]] — Catalog of all indexed agent tools & capabilities',
            '- 📜 **Conventions**: [[Conventions]] — Project constraints, architecture, and `never_do` rules',
            '- 💡 **Learned Lessons**: [[Lessons_Hub]] — Episodic heuristics and bug fixes captured across sessions',
            '',
            '## 🔄 The Closed Learning Loop',
            '```',
            'Capture Source ──► Link Knowledge ──► Recall Context ──► Act with Tools ──► Write Back Lesson',
            '```',
            '',
            '---',
            `*Generated on ${new Date().toISOString()} across ${filesGenerated} connected notes.*`
        ].join('\n');
        const indexFile = path_1.default.join(this.vaultDir, 'Index.md');
        fs_1.default.writeFileSync(indexFile, indexMd, 'utf8');
        filesGenerated++;
        return {
            vaultDir: this.vaultDir,
            filesGenerated,
            skillsCount,
            lessonsCount,
            conventionsCount,
            indexFile
        };
    }
}
exports.VaultExporter = VaultExporter;
