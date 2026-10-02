# 007 — Code Reference

## ## How It Works

| Dominio | Especialidades |
|---------|---------------|
| **Codigo** | Python, Node/JS, supply chain, SAST, dependencias |
| **Infra** | Linux/Ubuntu, Windows, SSH, firewall, containers, VPS, cloud |
| **APIs** | REST, GraphQL, OAuth, JWT, webhooks, CORS, rate limit |
| **Bots/Social** | WhatsApp, Instagram, Telegram (anti-ban, rate limit, policies) |
| **Pagamentos** | PCI-DSS mindset, antifraude, idempotencia, webhooks financeiros |
| **IA/Agentes** | Prompt injection, jailbreak, isolamento, explosao de custo, LLM security |
| **Compliance** | OWASP Top 10 (Web/API/LLM), LGPD/GDPR, SOC2, Zero Trust |
| **Operacoes** | Observabilidade, logging, resposta a incidentes, playbooks |


## ## Processo De Analise — 6 Fases

```

## Fase 1: Mapeamento Da Superficie De Ataque

Antes de qualquer analise, mapear completamente o sistema:

**Entradas e Saidas**
- De onde vem dados? (usuario, API, arquivo, banco, agente, webhook)
- Para onde vao dados? (tela, API, banco, arquivo, log, email, mensagem)
- Quais sao os limites de confianca? (trust boundaries)

**Ativos Criticos**
- Segredos (API keys, tokens, passwords, certificates)
- Dados sensiveis (PII, financeiros, medicos)
- Infraestrutura (servidores, bancos, filas, storage)
- Reputacao (contas de bot, dominio, IP)

**Pontos de Execucao**
- Onde ha execucao de codigo (eval, exec, subprocess, child_process)
- Onde ha chamada de API externa
- Onde ha acesso a filesystem
- Onde ha acesso a rede
- Onde ha decisoes automaticas (agentes, regras, ML)
- Onde ha loops e automacoes

**Dependencias Externas**
- Bibliotecas de terceiros (com versoes)
- APIs externas (com SLA e politicas)
- Servicos cloud (com permissoes)

Para automacao, executar:
```bash


```
Gera mapa JSON da superficie de ataque.

## Fase 2: Threat Modeling (Stride + Pasta)

O 007 usa dois frameworks complementares:

#### STRIDE (Tecnico — por componente)

Para cada componente identificado na Fase 1, analisar:

| Ameaca | Pergunta | Exemplo |
|--------|----------|---------|
| **S**poofing | Alguem pode se passar por outro? | Token roubado, webhook falso |
| **T**ampering | Alguem pode alterar dados/codigo em transito? | Man-in-the-middle, SQL injection |
| **R**epudiation | Ha logs e rastreabilidade de acoes? | Acao sem audit trail |
| **I**nformation Disclosure | Pode vazar dados, tokens, prompts? | Segredo em log, PII em URL |
| **D**enial of Service | Pode travar, gerar custo infinito? | Loop de agente, flood de API |
| **E**levation of Privilege | Pode escalar permissoes? | IDOR, agente acessando tool proibida |

Para cada ameaca identificada, documentar:
- **Vetor de ataque**: como o atacante explora
- **Impacto**: dano tecnico e de negocio (1-5)
- **Probabilidade**: chance de ocorrer (1-5)
- **Severidade**: impacto x probabilidade = score
- **Mitigacao**: controle proposto

#### PASTA (Negocio — orientado a risco)

Process for Attack Simulation and Threat Analysis em 7 estagios:

1. **Definir Objetivos de Negocio**: Que valor o sistema protege? Qual o impacto de falha?
2. **Definir Escopo Tecnico**: Quais componentes estao no escopo?
3. **Decompor Aplicacao**: Fluxos de dados, trust boundaries, pontos de entrada
4. **Analise de Ameacas**: Que ameacas existem no ecossistema similar?
5. **Analise de Vulnerabilidades**: Onde o sistema e fraco especificamente?
6. **Modelar Ataques**: Arvores de ataque com probabilidade e impacto
7. **Analise de Risco e Impacto**: Priorizar por risco de negocio real

Para automacao:
```bash


```

## Fase 3: Checklist Tecnico De Seguranca

Verificar explicitamente cada item. O checklist adapta-se ao tipo de sistema:

#### Universal (sempre verificar)
- [ ] Segredos fora do codigo (env vars, vault, secrets manager)
- [ ] Nenhum segredo em logs, URLs, mensagens de erro
- [ ] Rotacao de chaves definida e documentada
- [ ] Principio do menor privilegio aplicado
- [ ] Validacao e sanitizacao de TODOS os inputs externos
- [ ] Rate limit e anti-abuso configurados
- [ ] Timeouts em todas as chamadas externas
- [ ] Limites de custo/recursos definidos
- [ ] Logs de auditoria para acoes criticas
- [ ] Monitoramento e alertas configurados
- [ ] Fail-safe (erro = estado seguro, nao estado aberto)
- [ ] Backups e procedimento de rollback testados
- [ ] Dependencias auditadas (sem CVEs criticos)
- [ ] HTTPS em toda comunicacao externa

#### Python-Especifico
- [ ] Nenhum uso de eval(), exec() com input externo
- [ ] Nenhum uso de pickle com dados nao confiaveis
- [ ] subprocess com shell=False
- [ ] requests com verify=True e timeouts
- [ ] Ambiente virtual isolado (venv)
- [ ] pip install de fontes confiaveis (PyPI oficial)
- [ ] Dependencias pinadas com hashes
- [ ] Nenhum import dinamico de modulos nao confiaveis

#### APIs
- [ ] Autenticacao em todos os endpoints (exceto health check)
- [ ] Autorizacao por recurso (RBAC/ABAC)
- [ ] Validacao de payload (schema, tipos, tamanho)
- [ ] Idempotencia para operacoes de escrita
- [ ] Protecao contra replay (nonce, timestamp)
- [ ] Assinatura de webhooks verificada
- [ ] CORS configurado restritivamente
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] Protecao contra SSRF, IDOR, injection

#### IA/Agentes
- [ ] Protecao contra prompt injection (system prompt robusto)
- [ ] Protecao contra jailbreak (guardrails, content filter)
- [ ] Isolamento entre agentes (sem acesso cruzado a contexto)
- [ ] Limite de ferramentas por agente (principio do menor poder)
- [ ] Limite de iteracoes/custo por execucao
- [ ] Nenhuma execucao de codigo de usuario sem sandbox
- [ ] Au

## Fase 4: Red Team Mental (Ataque Realista)

Pensar como atacante. Para cada vetor, simular o ataque completo:

**Personas de Atacante:**
1. **Usuario malicioso** — tem conta legitima, quer escalar privilegios
2. **Bot abusivo** — automacao hostil tentando explorar APIs
3. **Agente comprometido** — um agente do ecossistema foi manipulado
4. **API externa hostil** — servico de terceiro retorna dados maliciosos
5. **Operador descuidado** — erro humano com consequencias de seguranca
6. **Insider malicioso** — tem acesso ao codigo/infra e ma intencao
7. **Supply chain attacker** — dependencia maliciosa inserida

Para cada cenario relevante, documentar:
```


```

## Fase 5: Blue Team (Defesa E Hardening)

Para cada ameaca identificada, propor defesas concretas:

**Categorias de Defesa:**

1. **Arquitetura** — mudancas estruturais que eliminam classes de vulnerabilidade
   - Segregacao de ambientes (dev/staging/prod)
   - Trust boundaries explicitos
   - Defense in depth (multiplas camadas)

2. **Guardrails Tecnicos** — limites codificados que impedem abuso
   - Rate limiting por usuario/IP/agente
   - Tamanho maximo de payload
   - Timeout em todas as operacoes
   - Budget maximo por execucao (custo, tokens, tempo)

3. **Sandboxing** — isolamento que contem dano em caso de comprometimento
   - Containers com capabilities minimas
   - Agentes com tool-set restrito
   - Execucao de codigo em sandbox (nsjail, gVisor, Firecracker)

4. **Monitoramento** — visibilidade para detectar e responder
   - Metricas de seguranca (failed auths, rate limit hits, anomalias)
   - Alertas para eventos criticos (novo admin, acesso a segredos, erro incomum)
   - Audit trail imutavel

5. **Resposta** — procedimentos para quando algo da errado
   - Playbooks de incidente por tipo
   - Kill switches para automacoes
   - Procedimento de revogacao de segredos
   - Comunicacao de incidente

Para automacao de hardening:
```bash


```

## Fase 6: Veredito Final

Apos todas as fases, emitir veredito com scoring quantitativo:

#### Sistema de Scoring

Cada dominio recebe uma nota de 0-100:

| Dominio | Peso | Descricao |
|---------|------|-----------|
| Segredos & Credenciais | 20% | Gestao de segredos, rotacao, armazenamento |
| Input Validation | 15% | Sanitizacao, validacao de tipos/tamanho |
| Autenticacao & Autorizacao | 15% | AuthN, AuthZ, RBAC, session management |
| Protecao de Dados | 15% | Criptografia, PII handling, data classification |
| Resiliencia | 10% | Error handling, timeouts, circuit breakers, backups |
| Monitoramento | 10% | Logging, alertas, audit trail, observabilidade |
| Supply Chain | 10% | Dependencias, imagens base, CI/CD security |
| Compliance | 5% | OWASP, LGPD, PCI-DSS conforme aplicavel |

**Score Final** = media ponderada de todos os dominios.

**Vereditos:**
- **90-100**: Aprovado — pronto para producao
- **70-89**: Aprovado com ressalvas — pode ir para producao com mitigacoes documentadas
- **50-69**: Bloqueado parcial — precisa correcoes antes de producao
- **0-49**: Bloqueado total — inseguro, requer redesign

Para automacao:
```bash


## ## Formato De Resposta

```

## 1. Resumo Do Sistema

[O que foi analisado, escopo, contexto]

## 2. Mapa De Ataque

[Superficie de ataque, pontos criticos, trust boundaries]

## 3. Vulnerabilidades Encontradas

[Lista priorizada por severidade com detalhes tecnicos]

| # | Severidade | Vulnerabilidade | Vetor | Impacto | Correcao |
|---|-----------|----------------|-------|---------|----------|
| 1 | CRITICA   | ...            | ...   | ...     | ...      |

## 4. Threat Model

[Resultado STRIDE e/ou PASTA com arvore de ameacas]

## 5. Correcoes Propostas

[Mudancas especificas com codigo/configuracao quando aplicavel]

## 6. Hardening E Melhorias

[Defesas adicionais alem das correcoes obrigatorias]

## 7. Scoring

[Tabela de scores por dominio + score final]

## 8. Veredito Final

[Aprovado / Aprovado com Ressalvas / Bloqueado]
[Justificativa tecnica]
[Condicoes para reavaliacao, se bloqueado]
```


## ## Integracao Com O Ecossistema

| Skill | Integracao |
|-------|-----------|
| **skill-sentinel** | 007 herda e aprofunda os checks de seguranca do sentinel |
| **web-scraper** | 007 audita scraping quanto a legalidade, etica e riscos tecnicos |
| **whatsapp-cloud-api** | 007 verifica compliance, anti-ban, seguranca de webhooks |
| **instagram** | 007 verifica tokens, rate limits, policies de plataforma |
| **telegram** | 007 verifica seguranca de bot, token storage, webhook validation |
| **leiloeiro-*** | 007 verifica scraping etico e protecao de dados coletados |
| **skill-creator** | 007 revisa novas skills antes de deploy |
| **agent-orchestrator** | 007 valida isolamento entre agentes e permissoes |


## ## Playbook: Token/Segredo Vazado

```
SEVERIDADE: CRITICA
TEMPO DE RESPOSTA: IMEDIATO

1. CONTER
   - Revogar o token/chave imediatamente
   - Se exposto em repositorio publico: revogar AGORA, commit pode ser revertido depois
   - Verificar se ha outros segredos no mesmo commit/arquivo

2. AVALIAR
   - Quando o vazamento ocorreu?
   - Quais sistemas o segredo acessa?
   - Ha evidencia de uso nao autorizado?

3. REMEDIAR
   - Gerar novo segredo
   - Atualizar todos os sistemas que usam o segredo
   - Mover segredo para vault/secrets manager se nao estava

4. PREVENIR
   - Implementar pre-commit hook para detectar segredos
   - Revisar politica de gestao de segredos
   - Treinar equipe sobre segredos

5. DOCUMENTAR
   - Timeline do incidente
   - Impacto avaliado
   - Acoes tomadas
   - Licoes aprendidas
```


## ## Playbook: Prompt Injection / Jailbreak

```
SEVERIDADE: ALTA
TEMPO DE RESPOSTA: URGENTE

1. CONTER
   - Identificar o prompt malicioso
   - Verificar se o agente executou acoes nao autorizadas
   - Suspender o agente se necessario

2. AVALIAR
   - Que acoes o agente realizou?
   - Que dados foram acessados/vazados?
   - Ha cascata para outros agentes?

3. REMEDIAR
   - Fortalecer system prompt com guardrails
   - Adicionar filtro de input
   - Limitar ferramentas disponiveis para o agente
   - Adicionar content filter na saida

4. PREVENIR
   - Testes de prompt injection no pipeline
   - Monitoramento de comportamento anomalo
   - Limites de iteracao e custo
```


## ## Playbook: Bot Banido (Whatsapp/Instagram/Telegram)

```
SEVERIDADE: ALTA
TEMPO DE RESPOSTA: URGENTE

1. CONTER
   - Parar TODA automacao imediatamente
   - Nao tentar criar nova conta (agrava a situacao)
   - Documentar o que estava rodando no momento do ban

2. AVALIAR
   - Qual regra foi violada?
   - Quantos usuarios foram afetados?
   - Ha dados que precisam ser migrados?

3. REMEDIAR
   - Se ban temporario: aguardar e reduzir agressividade
   - Se ban permanente: solicitar apelacao via canal oficial
   - Revisar rate limits e compliance com policies

4. PREVENIR
   - Implementar rate limiting mais conservador
   - Adicionar monitoramento de metricas de entrega
   - Implementar backoff exponencial
   - Respeitar horarios e limites da plataforma
```


## ## Playbook: Webhook Falso / Replay Attack

```
SEVERIDADE: ALTA
TEMPO DE RESPOSTA: URGENTE

1. CONTER
   - Suspender processamento de webhooks
   - Verificar ultimas N transacoes processadas

2. AVALIAR
   - Quais webhooks foram aceitos indevidamente?
   - Houve acao financeira baseada em webhook falso?
   - O atacante conhece o endpoint e formato?

3. REMEDIAR
   - Implementar verificacao de assinatura (HMAC)
   - Adicionar verificacao de timestamp (rejeitar > 5min)
   - Implementar idempotency key
   - Validar source IP se possivel

4. PREVENIR
   - Assinatura obrigatoria em TODOS os webhooks
   - Nonce + timestamp em cada request
   - Monitoramento de volume anomalo
   - Alertas para webhooks de fontes desconhecidas
```


## ## Comandos Rapidos

| Comando | O que faz |
|---------|-----------|
| `audite <caminho>` | Auditoria completa de seguranca |
| `threat-model <caminho>` | Threat modeling STRIDE + PASTA |
| `aprove <caminho>` | Veredito para producao |
| `bloqueie <descricao>` | Documentar bloqueio de seguranca |
| `hardening <caminho>` | Recomendacoes de hardening |
| `score <caminho>` | Scoring quantitativo de seguranca |
| `incidente: <tipo>` | Ativar playbook de resposta |
| `checklist <dominio>` | Checklist tecnico por dominio |
| `monitor <caminho>` | Estrategia de monitoramento |
| `scan <caminho>` | Scan automatizado rapido |


## ## Scripts De Automacao

```bash

## Scan Rapido De Seguranca (Automatizado)

python C:/Users/renat/skills/007/scripts/quick_scan.py --target <caminho>

## Auditoria Completa

python C:/Users/renat/skills/007/scripts/full_audit.py --target <caminho>

## Threat Modeling Automatizado

python C:/Users/renat/skills/007/scripts/threat_modeler.py --target <caminho> --framework both

## Checklist Tecnico

python C:/Users/renat/skills/007/scripts/security_checklist.py --target <caminho>

## Scoring De Seguranca

python C:/Users/renat/skills/007/scripts/score_calculator.py --target <caminho>

## Mapa De Superficie De Ataque

python C:/Users/renat/skills/007/scripts/surface_mapper.py --target <caminho>

## Advisor De Hardening

python C:/Users/renat/skills/007/scripts/hardening_advisor.py --target <caminho>

## Scan De Segredos

python C:/Users/renat/skills/007/scripts/scanners/secrets_scanner.py --target <caminho>

## Scan De Dependencias

python C:/Users/renat/skills/007/scripts/scanners/dependency_scanner.py --target <caminho>

## Scan De Injection Patterns

python C:/Users/renat/skills/007/scripts/scanners/injection_scanner.py --target <caminho>
```


