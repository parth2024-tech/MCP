# Claude Code Expert — Code Reference

## ## Estrutura Recomendada

```markdown

## Contexto

O que e este projeto, tecnologias, arquitetura

## Comandos Essenciais

Scripts mais usados: npm run dev, pytest, etc.

## Convencoes De Codigo

Estilo, naming, patterns obrigatorios

## Arquitetura

Estrutura de pastas, responsabilidades de cada modulo

## Regras De Negocio Criticas

O que NUNCA fazer, invariantes do sistema

## Agentes E Skills Disponiveis

Lista de skills, quando usar cada uma

## Protocolo Pre-Tarefa

Sempre rodar orchestrator antes de responder
```


## ## Instrucao De Salvamento Automatico:

```

## Context Guardian - Prevenir Perda De Contexto

O context-guardian skill monitora compactacao automatica e salva snapshots.
Ativar no inicio de sessoes longas ou criticas.

---

## 4. Hooks - Automacao Poderosa

Hooks executam comandos automaticamente em eventos do Claude Code.

## Localizacao Dos Hooks

- Global: ~/.claude/settings.json
- Por projeto: .claude/settings.json (na raiz do projeto)

## Tipos De Hooks Disponiveis

| Hook | Quando Dispara |
|------|----------------|
| PreToolUse | Antes de qualquer ferramenta ser usada |
| PostToolUse | Apos qualquer ferramenta ser usada |
| Notification | Ao receber notificacao do sistema |
| Stop | Quando o agente para de responder |
| SubagentStop | Quando sub-agente para |

## Exemplo: Hook De Beep Ao Terminar

```json


## ## Adicionar Mcp Customizado

```

---

## 6. Sub-Agentes - Paralelismo Total

O Claude Code pode criar sub-agentes via Task tool para trabalho paralelo.
Cada sub-agente roda de forma independente com seu proprio contexto.

## Padroes De Orquestracao

**Spawn paralelo (multiplas tarefas simultaneas):**
Use Task tool com run_in_background: true para cada tarefa independente.
Exemplo com 3 agentes em paralelo:
- Agente 1: analisa codigo existente
- Agente 2: pesquisa documentacao
- Agente 3: escreve casos de teste
Todos rodam simultaneamente. Resultado chega via TaskOutput.

**Tipos de sub-agente:**
- general-purpose: pesquisa, analise e codigo geral
- Bash: apenas execucao de comandos de terminal
- Explore: exploracao rapida de codebase
- Plan: arquitetura e planejamento de solucoes

**Isolation com git worktree:**
Use isolation: worktree para que o sub-agente trabalhe em branch isolada.
Ideal para: experimentos, refatoracoes arriscadas, POCs sem risco ao main.

## Boas Praticas Com Sub-Agentes

1. Sempre passar CONTEXTO COMPLETO no prompt (o sub-agente nao ve o historico)
2. Especificar exatamente onde salvar outputs (use paths absolutos)
3. Usar run_in_background: true para tarefas longas
4. Verificar resultado com TaskOutput apos conclusao
5. Passar o CLAUDE.md do projeto no contexto inicial do sub-agente

---

## Configurar Permissoes Por Projeto (.Claude/Settings.Json)

```json


## ## .Github/Workflows/Claude-Review.Yml

```

---

## Tabela De Problemas Comuns

| Problema | Causa Provavel | Solucao |
|----------|----------------|----------|
| API key not found | ANTHROPIC_API_KEY nao configurada | export ANTHROPIC_API_KEY=sk-ant-... |
| Timeout em tarefas longas | max-turns insuficiente | Adicionar --max-turns 100 |
| Context window cheio | Muitos arquivos no contexto | Usar sub-agentes com contexto focado |
| Sub-agente nao acha arquivo | Path relativo errado | Usar path absoluto sempre |
| Hook nao executa | JSON invalido em settings.json | python -m json.tool ~/.claude/settings.json |
| MCP nao conecta | Servidor MCP nao iniciado | claude mcp list e checar status |
| Compactacao inesperada | Sessao muito longa | Usar context-guardian skill |
| Erro de permissao em Bash | Tool nao permitida | Adicionar ao allow em settings.json |

## Ver Logs E Historico De Sessoes

```bash


## ## ~/.Claude/Settings.Json Completo E Recomendado

```json
{
  "theme": "dark",
  "verbose": false,
  "cleanupPeriodDays": 30,
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell -c \\"[Console]::Beep(800,200); Start-Sleep -Milliseconds 100; [Console]::Beep(1000,200)\\""
          }
        ]
      }
    ]
  },
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(npm *)",
      "Bash(python *)",
      "Bash(powershell *)",
      "Read(*)",
      "Write(*)"
    ]
  }
}
```


## ## Comandos Rapidos Do Ecossistema

```

## Quando Esta Skill E Ativada

Esta skill e ativada automaticamente quando o usuario quer:
- Configurar ou otimizar o Claude Code CLI
- Criar, debugar ou otimizar hooks
- Adicionar ou configurar MCP servers
- Criar sub-agentes e orquestracao paralela
- Entender qualquer feature do Claude Code
- Resolver erros ou comportamentos inesperados do CLI
- Otimizar CLAUDE.md e arquivos de memoria
- Configurar permissoes e seguranca

---

## 12. Slash Commands No Claude Code

| Comando | Acao |
|---------|------|
| /status | Ver estado atual da sessao e contexto |
| /clear | Limpar historico da conversa atual |
| /compact | Compactar contexto (Claude resume o historico) |
| /memory | Ver e editar arquivos de memoria |
| /hooks | Ver hooks configurados e ativos |
| /mcp | Ver MCPs conectados e seus status |
| /cost | Ver custo em tokens e USD da sessao |
| /model | Trocar modelo em uso (opus, sonnet, haiku) |
| /help | Ver todos os comandos e atalhos disponiveis |

---

## 13. Referencias Oficiais

- Documentacao principal: https://docs.anthropic.com/claude-code
- Referencia de hooks: https://docs.anthropic.com/claude-code/hooks
- Referencia de settings: https://docs.anthropic.com/claude-code/settings
- MCP SDK e exemplos: https://github.com/modelcontextprotocol/sdk
- Repositorio oficial: https://github.com/anthropics/claude-code
- Release notes: https://docs.anthropic.com/claude-code/changelog

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `007` - Complementary skill for enhanced analysis
- `matematico-tao` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


