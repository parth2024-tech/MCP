---
name: amazon-alexa
description: Integracao completa com Amazon Alexa para criar skills de voz inteligentes, transformar Alexa em assistente com Claude como cerebro (projeto Auri) e integrar com AWS ecosystem (Lambda, DynamoDB, Polly, Transcribe, Lex, Smart Home). Use when the task involves amazon alexa.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- voice
- alexa
- aws
- smart-home
- iot
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# AMAZON ALEXA — Voz Inteligente com Claude

## Overview

Integracao completa com Amazon Alexa para criar skills de voz inteligentes, transformar Alexa em assistente com Claude como cerebro (projeto Auri) e integrar com AWS ecosystem (Lambda, DynamoDB, Polly, Transcribe, Lex, Smart Home).

## When to Use This Skill

- When you need specialized assistance with this domain

## Do Not Use This Skill When

- The task is unrelated to amazon alexa
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

> Voce e o especialista em Alexa e AWS Voice. Missao: transformar
> qualquer dispositivo Alexa em assistente ultra-inteligente usando
> Claude como LLM backend, com voz neural, memoria persistente e
> controle de Smart Home. Projeto-chave: AURI.

---

## 1. Visao Geral Do Ecossistema

```
[Alexa Device] → [Alexa Cloud] → [AWS Lambda] → [Claude API]
    Fala          Transcricao      Logica          Inteligencia
      ↑               ↑               ↑                ↑
   Usuario         Intent        Handler          Anthropic
                               + DynamoDB
                               + Polly TTS
                               + APL Visual
> See [references/details.md](references/details.md) for full code examples.

## Ask Cli

npm install -g ask-cli
ask configure

## Aws Cli

pip install awscli
aws configure
```

## Criar Skill Com Template

ask new \
  --template hello-world \
  --skill-name auri \
  --language pt-BR

## └── .Ask/Ask-Resources.Json

```

## 2.3 Configurar Invocation Name

No arquivo `models/pt-BR.json`:
```json
{
  "interactionModel": {
    "languageModel": {
      "invocationName": "auri"
    }
  }
}
```

---

## 3.1 Intents Essenciais Para Auri

> See [references/details.md](references/details.md) for full code examples.

---

## 4.1 Handler Principal Python

> See [references/details.md](references/details.md) for full code examples.
ANTHROPIC_API_KEY=sk-...  (armazenar em Secrets Manager)
DYNAMODB_TABLE=auri-users
AWS_REGION=us-east-1
```

### 4.3 Requirements.Txt

```
ask-sdk-core>=1.19.0
ask-sdk-dynamodb-persistence-adapter>=1.19.0
anthropic>=0.40.0
boto3>=1.34.0
```

---

### 5.1 Criar Tabela

```bash
aws dynamodb create-table \
  --table-name auri-users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 5.2 Schema Do Usuario

> See [references/details.md](references/details.md) for full code examples.

### 5.3 Ttl Automatico (Expirar Dados Antigos)

```python
import time

## Adicionar Ttl De 180 Dias Ao Salvar

attrs["ttl"] = int(time.time()) + (180 * 24 * 3600)
```

---

### 6.1 Vozes Disponiveis (Portugues)

| Voice | Idioma | Tipo | Recomendado |
|-------|--------|------|-------------|
| `Vitoria` | pt-BR | Neural | ✅ Auri PT-BR |
| `Camila` | pt-BR | Neural | Alternativa |
| `Ricardo` | pt-BR | Standard | Masculino |
| `Ines` | pt-PT | Neural | Portugal |

### 6.2 Integrar Polly Na Resposta

> See [references/details.md](references/details.md) for full code examples.

### 6.3 Ssml Para Controle De Voz

```xml
<speak>
  <prosody rate="90%" pitch="+5%">
    Oi! Eu sou a Auri.
  </prosody>
  <break time="0.5s"/>
  <emphasis level="moderate">Como posso ajudar?</emphasis>
</speak>
```

---

### 7.1 Template De Chat

> See [references/details.md](references/details.md) for full code examples.

### 7.2 Adicionar Apl Na Resposta

> See [references/details.md](references/details.md) for full code examples.

---

### 8.1 Ativar Smart Home Skill

No `skill.json`, adicionar:
```json
{
  "apis": {
    "smartHome": {
      "endpoint": {
        "uri": "arn:aws:lambda:us-east-1:123456789:function:auri-smart-home"
      }
    }
  }
}
```

### 8.2 Handler De Smart Home

```python
def handle_smart_home_directive(event, context):
    namespace = event["directive"]["header"]["namespace"]
    name = event["directive"]["header"]["name"]
    endpoint_id = event["directive"]["endpoint"]["endpointId"]

    if namespace == "Alexa.PowerController":
        state = "ON" if name == "TurnOn" else "OFF"
        # Chamar sua API de smart home
        control_device(endpoint_id, {"power": state})
        return build_smart_home_response(endpoint_id, "powerState", state)

    elif namespace == "Alexa.BrightnessController":
        brightness = event["directive"]["payload"]["brightness"]
        control_device(endpoint_id, {"brightness": brightness})
        return build_smart_home_response(endpoint_id, "brightness", brightness)
```

### 8.3 Discovery De Dispositivos

> See [references/details.md](references/details.md) for full code examples.

---

## Deploy Completo (Skill + Lambda)

cd auri/
ask deploy

## Verificar Status

ask status

## Testar No Simulador

ask dialog --locale pt-BR

## Teste Especifico De Intent

ask simulate \
  --text "abrir auri" \
  --locale pt-BR \
  --skill-id amzn1.ask.skill.YOUR-SKILL-ID
> See [references/details.md](references/details.md) for full code examples.

## Usar Secrets Manager

aws secretsmanager create-secret \
  --name auri/anthropic-key \
  --secret-string '{"ANTHROPIC_API_KEY": "sk-..."}'

## Lambda Acessa Via Sdk:

import boto3, json
def get_secret(secret_name):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])
```

---

## Fase 1 — Setup (Dia 1)

```
[ ] Conta Amazon Developer criada
[ ] Conta AWS configurada (free tier)
[ ] ASK CLI instalado e configurado
[ ] IAM Role criada com permissoes: Lambda, DynamoDB, Polly, Logs
[ ] Anthropic API key armazenada em Secrets Manager
```

## Fase 2 — Skill Base (Dia 2-3)

```
[ ] ask new --template hello-world --skill-name auri
[ ] Interaction model definido (pt-BR.json)
[ ] LaunchRequest handler funcionando
[ ] ChatIntent handler com Claude integrado
[ ] ask deploy funcionando
[ ] Teste basico no ASK simulator
```

## Fase 3 — Persistencia (Dia 4)

```
[ ] DynamoDB table criada
[ ] Persistencia de historico funcionando
[ ] TTL configurado
[ ] Preferencias do usuario salvas
```

## Fase 4 — Polly + Apl (Dia 5-6)

```
[ ] Polly integrado com voz Vitoria (neural)
[ ] APL template de chat criado
[ ] APL renderizando em Echo Show simulator
```

## Fase 5 — Smart Home (Opcional)

```
[ ] Smart Home skill habilitada
[ ] Discovery de dispositivos funcionando
[ ] PowerController implementado
[ ] Teste com device real
```

## Fase 6 — Publicacao

```
[ ] Teste completo de todas funcionalidades
[ ] Performance OK (< 8s timeout)
[ ] Certificacao Amazon submetida
[ ] Publicado na Alexa Skills Store
> See [references/details.md](references/details.md) for full code examples.
