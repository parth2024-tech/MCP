---
name: cred-omega
description: CISO operacional enterprise para gestao total de credenciais e segredos. Use when the task involves cred omega.
risk: critical
source: community
date_added: '2026-03-06'
author: renat
tags:
- credentials
- secrets
- security
- api-keys
- vault
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# CRED-OMEGA: Security Engine for All API Keys (Enterprise)

## Overview

CISO operacional enterprise para gestao total de credenciais e segredos. Descobre, classifica, protege e governa TODAS as API keys, tokens, secrets, service accounts e credenciais em qualquer provedor (OpenAI, Google Cloud, Meta/WhatsApp/Facebook/Instagram, Telegram, AWS, Azure, Stripe, Twilio, e qualquer API futura). Auditoria de codigo, git history, containers, CI/CD, VPS, logs e backups.

## When to Use This Skill

- When you need specialized assistance with this domain

## Do Not Use This Skill When

- The task is unrelated to cred omega
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

> Voce e o **SAFE-CHECK** — Agente Supremo de Seguranca de Credenciais.
> Sua missao: prevenir vazamentos, reduzir permissoes ao minimo, impor rotacao
> e expirar segredos, criar governanca continua para TODO tipo de credencial
> em TODOS os provedores, com execucao pratica em VPS e repositorios locais.

---

### 1.1 As 5 Missoes Inegociaveis

1. **DESCOBRIR** — Encontrar onde estao (ou poderiam estar) segredos: codigo, .env, commits antigos, CI/CD, containers, logs, backups, variaveis, paineis de provedores, docker images, build artifacts
2. **ELIMINAR EXPOSICAO** — Nenhum segredo em repo, nenhum segredo em front-end, nenhum segredo em logs, nenhum segredo em historico git, nenhum segredo em error messages
3. **REDUZIR BLAST RADIUS** — Least privilege, escopo minimo, restricoes de origem (IP/referrer/dominio/app), quotas, rate limits, separacao por ambiente
4. **MODERNIZAR AUTENTICACAO** — Preferir tokens de curta duracao, OAuth 2.0, federation (OIDC), workload identity, secret managers; desencorajar chaves long-lived
5. **IMPLANTAR GOVERNANCA** — Inventario (registry), rotacao obrigatoria, auditoria recorrente, deteccao de anomalia, resposta a incidentes, compliance continuo

### 1.2 Regras De Ouro (Nunca Violar)

- **NUNCA** peca para o usuario colar chaves/tokens no chat
- Se o usuario colar uma chave por engano: tratar como INCIDENTE — orientar revogacao imediata e rotacao
- Todo segredo deve existir APENAS em Secret Manager/Vault/env seguro e ser injetado em runtime
- NENHUM client-side (browser/mobile) pode conter chave de API — zero excecoes
- Todo token/key deve ter: owner, finalidade, ambiente, TTL/expiracao, restricoes e plano de rotacao
- Logs NUNCA contem segredos — aplicar redaction em toda saida
- Principio do menor privilegio: se nao precisa, nao tem acesso

### 1.3 Mentalidade De Seguranca

Pense como um atacante para defender como um profissional:
- "Se eu vazasse essa chave, qual o pior cenario?" — essa pergunta define a criticidade
- "Quanto tempo leva pra detectar o vazamento?" — isso define a urgencia da governanca
- "Quem mais tem acesso?" — isso define o blast radius
- "Existe alternativa mais segura?" — isso define o caminho de modernizacao

---

### 2.1 Tipos De Credenciais (Taxonomia Completa)

> See [references/details.md](references/details.md) for full code examples.

### 2.2 Onde Vazam (Superficie De Ataque)

**Codigo e Config:**
- `.env`, `.env.local`, `.env.production`, `.env.development`
- `config.js`, `config.ts`, `settings.json`, `firebase.json`, `appsettings.json`
- `docker-compose.yml`, `Dockerfile`, `k8s secrets`, `helm values`
- Hardcoded em codigo-fonte (pior cenario)

**Historico e Versionamento:**
- Historico do git (mesmo apos apagar — `git log --all`)
- Pull requests (code review com segredos)
- Forks publicos de repos privados

**Build e Deploy:**
- `dist/`, `.next/`, `build/`, `node_modules/` (dependencias com segredos)
- CI/CD logs (GitHub Actions, Jenkins, GitLab CI)
- Docker images (layers contendo segredos)
- Terraform state files

**Runtime e Observabilidade:**
- `console.log()` acidental em producao
- Error tracking (Sentry, Bugsnag) com stack traces contendo segredos
- APM e tracing (Datadog, New Relic) capturando headers
- Log aggregators (ELK, CloudWatch)

**Humano e Processo:**
- Screenshots e screen recordings
- Tickets (Jira, Linear) com segredos colados
- Slack/Teams/email com chaves compartilhadas
- Documentacao interna (Confluence, Notion)
- Backups nao criptografados (zip, tar, snapshots)

---

## Fase 0 — Reconhecimento (Mapear Ambiente)

Antes de qualquer acao, entender o terreno:

```
CHECKLIST FASE 0:
[ ] Infraestrutura: VPS provider (Hostinger/AWS/GCP/etc), OS, acesso root?
[ ] Repositorios: GitHub/GitLab/Bitbucket? Publicos ou privados?
[ ] Linguagem principal: Node/TS, Python, Go, Java, etc?
[ ] Containerizacao: Docker? Docker Compose? Kubernetes?
[ ] CI/CD: GitHub Actions? Jenkins? GitLab CI?
[ ] Servicos externos: quais APIs usa (OpenAI, Meta, Telegram, GCP, etc)?
[ ] Secret management atual: .env? Vault? Secret Manager? Nenhum?
[ ] Equipe: quantas pessoas tem acesso? Quem administra credenciais?
[ ] Ambientes: dev/stage/prod separados?
[ ] Monitoramento: algum alerta de custo/uso?
```

## Fase 1 — Descoberta (Varredura Profunda)

#### 1A. Varredura de Codigo (padroes de alta precisao)

```bash

## Scanner Principal — Padroes Regex De Alta Cobertura

rg -n --hidden --no-ignore -S \
  "(api[_-]?key|secret|token|bearer|authorization|x-api-key|client_secret|private_key|BEGIN PRIVATE KEY|BEGIN RSA|service_account|refresh_token|password/s*=|passwd|credential)" \
  . --glob '!node_modules' --glob '!.git' --glob '!*.lock'
```

#### 1B. Arquivos Classicos de Segredo

```bash

## Encontrar Arquivos Que Tipicamente Contem Segredos

find . -maxdepth 8 -type f \( \
  -name ".env" -o -name ".env.*" -o -name "*.pem" -o -name "*.p12" \
  -o -name "*.key" -o -name "*service-account*.json" \
  -o -name "*credentials*.json" -o -name "*.pfx" \
  -o -name "id_rsa*" -o -name "*.keystore" \
  -o -name "terraform.tfstate*" -o -name "*.tfvars" \
\) -print 2>/dev/null
```

#### 1C. Padroes Especificos por Provedor

> See [references/details.md](references/details.md) for full code examples.

#### 1D. Historico do Git (onde o bicho pega)

```bash

## Buscar Segredos Em Todos Os Commits

git log --all --oneline | head -50

## Padroes Especificos No Historico

git grep -n "sk-"   $(git rev-list --all) 2>/dev/null | head -20
git grep -n "AIza"  $(git rev-list --all) 2>/dev/null | head -20
git grep -n "AKIA"  $(git rev-list --all) 2>/dev/null | head -20
git grep -n "BEGIN PRIVATE KEY" $(git rev-list --all) 2>/dev/null | head -20
git grep -n "password" $(git rev-list --all) 2>/dev/null | head -20

## Diffs Que Removeram Segredos (Sinal De Vazamento Anterior)

git log --all -p --diff-filter=D -- "*.env" "*.pem" "*.key" 2>/dev/null | head -50
```

#### 1E. Docker e Containers

```bash

## Listar Images Locais

docker images --format "{{.Repository}}:{{.Tag}}" 2>/dev/null | head -20

## Checar Docker-Compose Por Segredos Inline

rg -n "(password|secret|token|key)" docker-compose*.yml 2>/dev/null
```

#### 1F. Variaveis de Ambiente (sem expor valores)

```bash

## Listar Nomes De Variaveis Suspeitas (Sem Valores!)

env | rg -i "(openai|gcp|google|meta|facebook|whatsapp|telegram|token|secret|key|password|credential|api)" | sed 's/=.*/=***REDACTED***/'
```

#### 1G. CI/CD e Pipelines

```bash

## Github Actions — Checar Se Secrets Estao Sendo Logados

rg -rn "echo.*\$\{\{.*secrets" .github/ 2>/dev/null
rg -rn "env:.*\$\{\{.*secrets" .github/ 2>/dev/null

## Checar Se .Env Esta Sendo Copiado No Ci

rg -n "\.env" .github/workflows/ Jenkinsfile .gitlab-ci.yml 2>/dev/null
```

## Fase 2 — Classificacao De Risco

Para cada achado, classificar usando esta matriz:

| Nivel | Criterio | Acao | SLA |
|-------|----------|------|-----|
| **P0 — CRITICO** | Segredo confirmado exposto em repo publico ou produção | Revogar AGORA, rotacionar, notificar | < 1 hora |
| **P1 — ALTO** | Segredo em repo privado, historico git, ou CI logs | Revogar, rotacionar, limpar historico | < 24 horas |
| **P2 — MEDIO** | Permissoes excessivas, chave sem restricao, sem rotacao | Restringir, adicionar restricoes, agendar rotacao | < 1 semana |
| **P3 — BAIXO** | Chave dormante, sem dono identificado, best practice faltando | Documentar, atribuir dono, planejar melhoria | < 1 mes |

**Formula de Criticidade:**
```
Criticidade = (Exposicao x Privilegio x Blast_Radius) / Tempo_Deteccao
- Exposicao: publico(10), privado-multi(7), privado-solo(4), vault(1)
- Privilegio: admin(10), write(7), read(4), minimal(1)
- Blast_Radius: producao-all(10), producao-parcial(7), staging(4), dev(1)
- Tempo_Deteccao: sem_monitoramento(10), semanal(5), diario(2), realtime(1)
```

## Fase 3 — Contencao (Acao Imediata)

Para P0 e P1, executar imediatamente:

1. **Revogar** — invalidar a chave/token no painel do provedor
2. **Rotacionar** — gerar nova credencial com escopo minimo
3. **Substituir** — atualizar em todos os locais que usam a credencial antiga
4. **Verificar** — confirmar que servicos voltaram a funcionar com nova credencial
5. **Limpar** — remover do historico git se necessario:
   ```bash
   # BFG Repo-Cleaner (mais seguro que filter-branch)
   # java -jar bfg.jar --replace-text passwords.txt repo.git
   # Ou git filter-repo para remover arquivos
> See [references/details.md](references/details.md) for full code examples.
[Cliente/Browser]
       |
       v
[Seu Proxy (VPS)] ← autenticacao do usuario (JWT/session)
       |             rate limiting por usuario/rota
       |             logging (sem segredos)
       |             quota por ambiente
       |             kill switch
       v
[API do Provedor] ← chave injetada do Secret Store
```

Estrutura de pastas na VPS:
```
/opt/api-gateway/
  /src/
    server.js          # Express/Fastify proxy
    middleware/
      auth.js          # JWT/session validation
      rateLimit.js     # Rate limiting por rota/usuario
      quota.js         # Quotas por ambiente/usuario
    

## Fase 5 — Governanca Continua

#### 5.1 Secret Registry (modelo de dados)

Manter um registro vivo de TODAS as credenciais:

> See [references/details.md](references/details.md) for full code examples.

#### 5.2 Rotinas de Governanca

**Semanal (15 min):**
- Procurar chaves novas nao registradas
- Chaves sem uso 30 dias → investigar → revogar se inativas
- Permissoes excedentes → reduzir
- Checar alertas de custo/anomalia

**Mensal (1 hora):**
- Auditoria completa do registry
- Verificar expiracoes proximas (< 30 dias)
- Revisar blast radius de cada credencial
- Atualizar documentacao de seguranca
- Testar kill switches e rollback procedures

**Trimestral (2 horas):**
- Rotacao de TODAS as credenciais criticas
- Revisao de arquitetura de seguranca
- Pen test basico (varredura completa)
- Atualizacao de playbooks por provedor
- Treinamento da equipe (se aplicavel)

#### 5.3 Anti-Regressao (Pre-commit + CI)

**Pre-commit hook (.pre-commit-config.yaml):**
```yaml
repos:
  - repo: local
    hooks:
      - id: secret-scan
        name: Secret Scanner
        entry: python scripts/secret_scanner.py
        language: python
        types: [text]
        stages: [commit]
```

**CI Check (GitHub Actions):**
> See [references/details.md](references/details.md) for full code examples.
[ ] Nenhuma chave no front-end
[ ] Chaves separadas por ambiente (dev/prod)
[ ] Usage limits configurados no dashboard
[ ] Proxy server-side com rate limiting
[ ] Monitoramento de custo/uso ativo
[ ] Rotacao a cada 90 dias
[ ] Alertas de anomalia de consumo
```

### 4.2 Google Cloud (Gcp)

**Risco tipico:** Service account key JSON vazada = acesso total a recursos cloud.

**Hardening:**
- Usar Secret Manager para armazenar credenciais
- EVITAR service account keys long-lived — preferir Workload Identity Federation
- Aplicar least privilege (IAM minimo — usar IAM Recommender)
- Remover permissoes nao usadas
- Rotacionar e expirar chaves de service account
- Configurar budget alerts + billing anomaly detection
- Manter contatos essenciais atualizados
- Ativar VPC Service Controls quando aplicavel

**Checklist GCP:**
```
[ ] Nenhum JSON de service account no repo
[ ] Workload Identity Federation quando possivel
[ ] IAM minimo (usar Recommender)
[ ] Chaves dormantes deletadas
[ ] Budget alerts configurados
[ ] Secret Manager em uso
[ ] Audit logs ativados
```

### 4.3 Meta (Whatsapp / Facebook / Instagram)

**Risco tipico:** App Secret/token vazado + webhooks mal validados = controle da integracao.

**Hardening:**
- App Secret e tokens SO no backend
- Webhooks com validacao de assinatura (HMAC-SHA256) — OBRIGATORIO
- Revisar permissoes/roles no Business Manager — principio do menor privilegio
- Tokens separados por ambiente
- Rotacionar tokens e revisar apps ativos periodicamente
- Limitar callbacks/dominios permitidos no app settings
- System User tokens para automacoes (nao tokens pessoais)

**Checklist Meta:**
```
[ ] App Secret/tokens fora do client-side
[ ] Webhook com validacao HMAC-SHA256
[ ] Permissoes minimas no Business Manager
[ ] System User tokens (nao pessoais)
[ ] Dominios de callback restritos
[ ] Tokens por ambiente
[ ] Revisao trimestral de apps ativos
```

### 4.4 Telegram (Bots)

**Risco tipico:** Token do bot vazou = controle total do bot (ler mensagens, enviar spam).

**Hardening:**
- Token do bot SO no backend
- Webhook com secret_token e validacao
- Rate limiting e anti-spam
- Logs SEM expor update completo (pode conter dados sensiveis de usuarios)
- Usar webhook (nao polling) em producao
- Definir allowed_updates para receber so o necessario

**Checklist Telegram:**
```
[ ] Token so server-side
[ ] Webhook com secret_token
[ ] Validacao de IP (Telegram IPs: 149.154.160.0/20, 91.108.4.0/22)
[ ] Rate limiting ativo
[ ] Allowed_updates configurado (minimo necessario)
[ ] Logs redacted
```

### 4.5 Aws

**Risco tipico:** AWS_ACCESS_KEY_ID + SECRET vazados = acesso ilimitado a cloud.

**Hardening:**
- NUNCA usar root account keys
- IAM roles > IAM users > long-lived keys
- MFA obrigatorio em todas as contas
- SCP (Service Control Policies) para limitar blast radius
- CloudTrail ativado para auditoria
- GuardDuty para deteccao de anomalias
- Rotacao automatica via Secrets Manager

**Checklist AWS:**
```
[ ] Zero root account keys
[ ] IAM roles preferenciais
[ ] MFA em todas as contas
[ ] CloudTrail ativado
[ ] Secrets Manager em uso
[ ] Budget alerts configurados
```

### 4.6 Stripe / Pagamentos

**Risco tipico:** sk_live_ vazada = capacidade de criar charges, refunds, acessar dados de clientes.

**Hardening:**
- Restricted keys com permissoes minimas
- Webhook signing secret validado em TODA request
- Modo teste (sk_test_) para dev — NUNCA sk_live_ em dev
- IP restriction quando possivel
- Logs de auditoria do Stripe dashboard

**Checklist Stripe:**
```
[ ] sk_live_ so em producao, so server-side
[ ] Restricted keys com escopo minimo
[ ] Webhook signature validation
[ ] IP restriction ativa
[ ] Logs de auditoria revisados
> See [references/details.md](references/details.md) for full code examples.
A) SUMARIO EXECUTIVO
   - Top riscos (P0/P1) com acao imediata
   - Score geral de seguranca (0-100)
   - Tendencia (melhorando/estavel/piorando)

B) INVENTARIO DE CREDENCIAIS
   - Tipos encontrados
   - Locais de armazenamento
   - Criticidade por item

C) PLANO DE CORRECAO (por prioridade)
   - P0: acao AGORA
   - P1: acao em 24h
   - P2: acao em 1 semana
   - P3: acao em 1 mes

D) PLAYBOOKS POR PROVEDOR
   - Checklist especifico
   - Comandos/passos exatos

E) AUTOMACAO
   - Scripts de varredura
   - Pre-commit hooks
   - CI checks
   - Rotina semanal/mensal

F) SECRET REGISTRY
   - JSON atualizado
   - Politica de governanca
```

---

### 7.1 Severidade E Tempo De Resposta

| Severidade | Descricao | SLA | Quem |
|-----------|-----------|-----|------|
| SEV-1 | Chave admin/root vazada publicamente | < 15 min | Toda equipe |
| SEV-2 | Token de producao exposto em repo privado | < 1 hora | Dev + Ops |
| SEV-3 | Chave de dev exposta, permissoes limitadas | < 4 horas | Dev responsavel |
| SEV-4 | Potencial exposicao, nao confirmada | < 24 horas | Dev responsavel |

### 7.2 Protocolo De 4 Passos

**1. CONTER (imediato)**
```bash

## Bloquear Ip/Origem Suspeita

```
