---
name: github-workflow-automation
description: "Patterns for automating GitHub workflows with AI assistance, inspired by [Gemini CLI](https://github.com/google-gemini/gemini-cli) and modern DevOps practices. Use when the task involves github workflow automation."
risk: critical
source: community
date_added: "2026-02-27"
---

# 🔧 GitHub Workflow Automation

> Patterns for automating GitHub workflows with AI assistance, inspired by [Gemini CLI](https://github.com/google-gemini/gemini-cli) and modern DevOps practices.

## When to Use This Skill

Use this skill when:

- Automating PR reviews with AI
- Setting up issue triage automation
- Creating GitHub Actions workflows
- Integrating AI into CI/CD pipelines
- Automating Git operations (rebases, cherry-picks)

---

## 1. Automated PR Review

### 1.1 PR Review Action

> See [references/details.md](references/details.md) for full code examples.

### 1.2 Review Comment Patterns

````markdown
# AI Review Structure

## 📋 Summary

Brief description of what this PR does.

## ✅ What looks good

- Well-structured code
- Good test coverage
- Clear naming conventions

## ⚠️ Potential Issues

1. **Line 42**: Possible null pointer exception
   ```javascript
   // Current
   user.profile.name;
   // Suggested
   user?.profile?.name ?? "Unknown";
   ```
````

2. **Line 78**: Consider error handling
   ```javascript
   // Add try-catch or .catch()
   ```

## 💡 Suggestions

- Consider extracting the validation logic into a separate function
- Add JSDoc comments for public methods

## 🔒 Security Notes

- No sensitive data exposure detected
- API key handling looks correct

````

### 1.3 Focused Reviews

> See [references/details.md](references/details.md) for full code examples.

---

## 2. Issue Triage Automation

### 2.1 Auto-label Issues

> See [references/details.md](references/details.md) for full code examples.

### 2.2 Issue Analysis Prompt

> See [references/details.md](references/details.md) for full code examples.

### 2.3 Stale Issue Management

> See [references/details.md](references/details.md) for full code examples.

---

## 3. CI/CD Integration

### 3.1 Smart Test Selection

> See [references/details.md](references/details.md) for full code examples.

### 3.2 Deployment with AI Validation

> See [references/details.md](references/details.md) for full code examples.

### 3.3 Rollback Automation

> See [references/details.md](references/details.md) for full code examples.

---

## 4. Git Operations

### 4.1 Automated Rebasing

> See [references/details.md](references/details.md) for full code examples.

### 4.2 Smart Cherry-Pick

> See [references/details.md](references/details.md) for full code examples.

### 4.3 Branch Cleanup

> See [references/details.md](references/details.md) for full code examples.

---

## 5. On-Demand Assistance

### 5.1 @mention Bot

> See [references/details.md](references/details.md) for full code examples.

### 5.2 Command Patterns

```markdown
## Available Commands

> See [references/details.md](references/details.md) for full code examples.
```

---

## 6. Repository Configuration

### 6.1 CODEOWNERS

> See [references/details.md](references/details.md) for full code examples.

### 6.2 Branch Protection

> See [references/details.md](references/details.md) for full code examples.

---

## Best Practices

### Security

- [ ] Store API keys in GitHub Secrets
- [ ] Use minimal permissions in workflows
- [ ] Validate all inputs
- [ ] Don't expose sensitive data in logs

### Performance

- [ ] Cache dependencies
- [ ] Use matrix builds for parallel testing
- [ ] Skip unnecessary jobs with path filters
- [ ] Use self-hosted runners for heavy workloads

### Reliability

- [ ] Add timeouts to jobs
- [ ] Handle rate limits gracefully
- [ ] Implement retry logic
- [ ] Have rollback procedures

---

## Resources

- [Gemini CLI GitHub Action](https://github.com/google-github-actions/run-gemini-cli)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub REST API](https://docs.github.com/en/rest)
- [CODEOWNERS Syntax](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
