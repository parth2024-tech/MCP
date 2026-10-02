# Cred Omega — Code Reference

## ### 2.1 Tipos De Credenciais (Taxonomia Completa)

| Categoria | Exemplos | Criticidade Base |
|-----------|----------|-----------------|
| API Keys (strings) | OpenAI sk-*, Google AIza*, Stripe sk_live_* | CRITICA |
| OAuth Secrets | client_id + client_secret | CRITICA |
| Access/Refresh Tokens | Bearer tokens, JWT, refresh_token | ALTA |
| Service Account Keys | GCP JSON, AWS IAM credentials | CRITICA |
| Webhook Secrets | signing secrets, HMAC keys | ALTA |
| JWT Signing Keys | private keys para assinatura | CRITICA |
| SSH/TLS Keys | .pem, .p12, .key, id_rsa | CRITICA |
| DB Credentials | connection strings, passwords | CRITICA |
| Bot Tokens | Telegram bot token, Discord bot token | ALTA |
| App Secrets | Meta App Secret, Twitter API Secret | CRITICA |
| Conversion/Pixel Tokens | Meta CAPI token, GA measurement secret | MEDIA |
| Encryption Keys | AES keys, master keys | CRITICA |
| Session Cookies | cookies de sessao privilegiada | MEDIA |
| CI/CD Tokens | GitHub PAT, GitLab tokens, deploy keys | ALTA |
| Cloud Provider Keys | AWS_ACCESS_KEY_ID, AZURE_CLIENT_SECRET | CRITICA |


## #### 1C. Padroes Especificos por Provedor

```bash

## Openai (Sk-...)

rg -n "sk-[a-zA-Z0-9]{20,}" . --glob '!node_modules' --glob '!.git'

## Google Cloud (Aiza...)

rg -n "AIza[a-zA-Z0-9_-]{35}" . --glob '!node_modules' --glob '!.git'

## Aws (Akia...)

rg -n "AKIA[A-Z0-9]{16}" . --glob '!node_modules' --glob '!.git'

## Stripe (Sk_Live_...)

rg -n "sk_live_[a-zA-Z0-9]{20,}" . --glob '!node_modules' --glob '!.git'

## Meta/Facebook (Token Longo Numerico)

rg -n "EAA[a-zA-Z0-9]{50,}" . --glob '!node_modules' --glob '!.git'

## Telegram Bot Token

rg -n "[0-9]{8,10}:[a-zA-Z0-9_-]{35}" . --glob '!node_modules' --glob '!.git'

## Github Pat

rg -n "ghp_[a-zA-Z0-9]{36}" . --glob '!node_modules' --glob '!.git'

## Jwt (Eyj...)

rg -n "eyJ[a-zA-Z0-9_-]{10,}\\.eyJ[a-zA-Z0-9_-]{10,}" . --glob '!node_modules' --glob '!.git'

## Generic High-Entropy Strings (Possivel Segredo)

rg -n "['\"][a-zA-Z0-9+/]{40,}['\"]" . --glob '!*.lock' --glob '!node_modules' --glob '!.git'
```


## ## Fase 3 — Contencao (Acao Imediata)

   ```

## Fase 4 — Hardening (Protecao Profunda)

#### 4.1 Regras Universais (todas as APIs)

**Regra 1: Chave NUNCA no front-end**
- Browser/mobile = ambiente hostil. Se a chave aparece no JS entregue ao usuario, ja era.
- Solucao padrao-ouro: API Gateway/Proxy na VPS
- O front chama SEU endpoint → sua VPS chama o provedor com segredo em Secret Store

**Regra 2: Separacao por ambiente**
- DEV, STAGING, PROD com chaves DIFERENTES e contas diferentes quando possivel
- Se DEV vaza, PROD nao cai junto
- Nomenclatura: `OPENAI_API_KEY_DEV`, `OPENAI_API_KEY_PROD`

**Regra 3: Restricao e escopo minimo**
- IP allowlist (quando suportado)
- Dominio/referrer restriction
- Bundle ID (mobile)
- APIs/scopes permitidos (minimo necessario)
- Se provedor nao suporta: criar restricoes no proxy (rate limit + auth + quotas)

**Regra 4: Rotacao e expiracao**
- Toda chave tem validade definida (30-90 dias conforme criticidade)
- Chaves sem dono e sem data = lixo perigoso → revogar
- Calendar reminders para rotacao

**Regra 5: Observabilidade sem exposicao**
- Alertas de orcamento/anomalia por provedor
- Logs de auditoria SEM segredos (redaction obrigatorio)
- Thresholds para cortar abuso automaticamente
- Dashboard de custo consolidado

**Regra 6: Defense in Depth**
- Multiplas camadas: proxy + rate limit + auth + IP restriction + quota + monitoring
- Se uma camada falha, as outras seguram

#### 4.2 Arquitetura de Proxy Server-Side

```


## #### 5.1 Secret Registry (modelo de dados)

```json
{
  "registry_version": "1.0",
  "last_audit": "2026-03-03T00:00:00Z",
  "secrets": [
    {
      "secret_id": "openai-prod-main",
      "provider": "openai",
      "type": "api_key",
      "environment": "production",
      "owner": "backend-team",
      "purpose": "GPT-4 chat completions para app principal",
      "storage_location": "vps-env-secure",
      "created_at": "2026-01-15",
      "expires_at": "2026-04-15",
      "last_rotated_at": "2026-01-15",
      "rotation_policy_days": 90,
      "restrictions": {
        "ip_allowlist": ["203.0.113.10"],
        "rate_limit": "100/min",
        "budget_monthly_usd": 500
      },
      "criticality": "P1",
      "status": "active",
      "last_verified": "2026-03-01",
      "notes": ""
    }
  ]
}
```


## #### 5.3 Anti-Regressao (Pre-commit + CI)

```yaml
name: Secret Scan
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/

### 4.1 Openai

**Risco tipico:** Chave vazada → consumo/custo descontrolado → milhares de dolares em horas.

**Hardening:**
- Chave SO no servidor (VPS) — nunca no front
- Criar chaves por projeto/ambiente (nunca uma chave unica para tudo)
- Usar Organization API keys (nao pessoais) quando possivel
- Proxy com: rate limit por IP/usuario, limites por modelo (gpt-4 mais caro), logs de consumo, kill switch
- Configurar usage limits no dashboard da OpenAI
- Monitorar usage API: `GET /v1/usage` ou dashboard

**Checklist OpenAI:**
```


## ### 4.6 Stripe / Pagamentos

```

---

## /Audit (Audit_All)

Executar descoberta completa e gerar relatorio:
1. Rodar TODAS as varreduras da Fase 1
2. Classificar cada achado (Fase 2)
3. Gerar relatorio com sumario executivo + inventario + acoes

## /Lockdown (Lockdown_All)

Aplicar hardening e anti-regressao em todo o ecossistema:
1. Verificar cada credencial contra checklist do provedor
2. Aplicar restricoes faltantes
3. Instalar pre-commit hooks
4. Configurar CI checks
5. Gerar relatorio de hardening

## /Rotate (Rotate_All)

Plano e execucao guiada de rotacao:
1. Listar todas credenciais com rotacao vencida ou proxima
2. Gerar plano de rotacao (ordem, dependencias, rollback)
3. Guiar execucao passo-a-passo (sem tocar em segredos diretamente)
4. Atualizar registry

## /Incident (Incident_Mode)

Resposta imediata a vazamento/abuso:
1. **CONTER** — Revogar chave/token, desativar webhooks, travar proxy (kill switch)
2. **ERRADICAR** — Remover do codigo, reescrever historico git, scan amplo
3. **RECUPERAR** — Gerar novas credenciais com escopo minimo, reimplantar
4. **APRENDER** — Adicionar regra anti-regressao, post-mortem, atualizar playbook

## /Govern (Set_Governance)

Criar/atualizar registry + politicas + rotinas:
1. Criar/atualizar secret registry JSON
2. Definir politicas por criticidade
3. Agendar rotinas (semanal/mensal/trimestral)
4. Configurar alertas e dashboards

## /Status

Visao rapida da saude de seguranca:
1. Total de credenciais no registry
2. Quantas expiram em < 30 dias
3. Quantas sem restricao adequada
4. Ultimo audit e proximo agendado
5. Incidentes abertos

---

## 6. Formato De Entrega (Sempre)

Toda resposta de auditoria/acao segue esta estrutura:

```


## ## Verificar Custos/Cobranças Anomalos Nos Provedores

```

---

### 8.1 Scanner De Segredos (Python)

Localizado em: `scripts/secret_scanner.py`
- Varredura de arquivos com 30+ padroes regex
- Deteccao por provedor (OpenAI, GCP, AWS, Meta, Telegram, Stripe, etc.)
- Modo CI (--ci) com exit code nao-zero se encontrar
- Modo pre-commit (--staged) para verificar so arquivos staged
- Saida JSON ou texto

### 8.2 Registry Manager

Localizado em: `scripts/registry_manager.py`
- CRUD de entries no secret registry
- Alertas de expiracao
- Status report
- Export CSV para auditoria

### 8.3 Pre-Commit Hook

Localizado em: `scripts/pre_commit_hook.sh`
- Wrapper para secret_scanner.py em modo staged
- Bloqueia commit se encontrar segredo
- Mensagem clara de como resolver

### 8.4 Audit Report Generator

Localizado em: `scripts/audit_report.py`
- Executa todas as varreduras
- Gera relatorio formatado (markdown)
- Inclui score de seguranca
- Sugestoes por provedor

---

### 9.1 Estrutura De Diretorios

```


## ### 9.2 Padrao De Seguranca Na Vps

```
1. Firewall (ufw/iptables):
   - Permitir: 80, 443, 22 (com fail2ban)
   - Bloquear todo o resto

2. SSH:
   - Desabilitar login por senha
   - Usar chaves SSH apenas
   - fail2ban ativo

3. Segredos:
   - .env com chmod 600, owner root
   - Ou usar Docker secrets / environment
   - NUNCA em arquivos acessiveis pela web

4. Proxy:
   - Rate limit por rota
   - Auth JWT/session obrigatorio
   - Logs sem segredos
   - Kill switch (desligar proxy rapidamente)

5. Monitoramento:
   - Alertas de custo por provedor
   - Alertas de uso anomalo
   - Health checks automaticos
```


## ## Formula

```

---

## Skills Complementares

| Skill | Integracao |
|-------|-----------|
| **007** | Threat modeling + Red Team — cred-omega cuida de segredos, 007 de arquitetura |
| **instagram** | Protecao de Meta tokens, Graph API secrets |
| **whatsapp-cloud-api** | Protecao de WABA tokens, webhook secrets |
| **telegram** | Protecao de bot tokens |
| **ai-studio-image** | Protecao de Google API keys |
| **stability-ai** | Protecao de Stability API keys |
| **context-agent** | Persistir estado de auditoria entre sessoes |
| **skill-sentinel** | Auditar seguranca das proprias skills |

## Quando Outra Skill Deve Chamar Cred-Omega

Qualquer skill que lide com APIs externas deve consultar cred-omega para:
1. Validar que credenciais estao armazenadas de forma segura
2. Verificar restricoes adequadas
3. Confirmar presenca no registry
4. Verificar rotacao em dia

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

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.




---


**4. APRENDER (< 48 horas)**
```bash

## Verificar Custos/Cobranças Anomalos Nos Provedores

> See [references/details.md](references/details.md) for full code examples.
/opt/
  /api-gateway/        # Proxy server-side
  /secrets/            # Referencias (NUNCA segredos em arquivo!)
  /audit/              # Scripts de varredura + relatorios
  /logs/               # Logs com redaction

/home/<user>/
  /apps/               # Seus projetos
  /.env.production     # Segredos (chmod 600)

/etc/
  /systemd/system/     # Services para proxy e apps
```

### 9.2 Padrao De Seguranca Na Vps

> See [references/details.md](references/details.md) for full code examples.

---

### 10.1 Comportamento Transversal

Esta skill opera de forma TRANSVERSAL — mesmo quando outras skills estao ativas:

- Se durante QUALQUER tarefa detectar uma chave exposta em codigo → alertar imediatamente
- Se um usuario pedir para "colocar a chave no config.js" → explicar o risco e oferecer alternativa segura
- Se detectar .env sendo commitado → bloquear e orientar .gitignore
- Se ver hardcoded credentials → sugerir refatoracao para env vars

### 10.2 Sinais De Alerta Automaticos

Monitore estes sinais durante QUALQUER operacao:
- Strings que parecem chaves/tokens em codigo
- Arquivos .env sendo criados sem .gitignore correspondente
- Docker commands que copiam .env para dentro da image
- CI/CD configs que echo ${{ secrets.* }}
- Front-end code que referencia API keys diretamente

---

## Score De Seguranca (0-100)

| Dimensao | Peso | Criterio |
|----------|------|----------|
| Exposicao Zero | 25% | Nenhum segredo em repo/front/logs |
| Least Privilege | 20% | Todas credenciais com escopo minimo |
| Rotacao | 15% | Todas dentro da politica de rotacao |
| Restricoes | 15% | IP/dominio/escopo aplicados |
| Monitoramento | 10% | Alertas de custo/anomalia ativos |
| Governanca | 10% | Registry completo e atualizado |
| Anti-regressao | 5% | Pre-commit + CI ativos |

## Formula

```
Score = SUM(dimensao_peso * dimensao_score)
onde dimensao_score = (itens_ok / itens_total) * 100
> See [references/details.md](references/details.md) for full code examples.


---
## Additional Content


**2. ERRADICAR (< 1 hora)**
```bash

## Verificar Se Nao Ha Copias Em Backups/Forks/Mirrors

```

**3. RECUPERAR (< 4 horas)**
```bash

## Atualizar Registry

```
