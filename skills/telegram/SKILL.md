---
name: telegram
description: Integracao completa com Telegram Bot API. Setup com BotFather, mensagens, webhooks, inline keyboards, grupos, canais. Boilerplates Node.js e Python. Use when the task involves telegram.
risk: critical
source: community
date_added: '2026-03-06'
author: renat
tags:
- messaging
- telegram
- bots
- webhooks
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# Telegram Bot API - Integracao Profissional

## Overview

Integracao completa com Telegram Bot API. Setup com BotFather, mensagens, webhooks, inline keyboards, grupos, canais. Boilerplates Node.js e Python.

## When to Use This Skill

- When the user mentions "telegram" or related topics
- When the user mentions "bot telegram" or related topics
- When the user mentions "telegram bot" or related topics
- When the user mentions "api telegram" or related topics
- When the user mentions "chatbot telegram" or related topics
- When the user mentions "mensagem telegram" or related topics

## Do Not Use This Skill When

- The task is unrelated to telegram
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Skill para implementar bots profissionais no Telegram usando a Bot API oficial. Suporta Node.js/TypeScript e Python.

### Overview

A Telegram Bot API permite criar bots que interagem com usuarios via mensagens, comandos, inline keyboards, pagamentos e muito mais. Bots sao criados pelo @BotFather e autenticados via token unico.

**Base URL:** `https://api.telegram.org/bot<TOKEN>/METHOD_NAME`
**Metodos HTTP:** GET e POST
**Formatos de parametros:** query string, application/x-www-form-urlencoded, application/json, multipart/form-data (uploads)
**Limite de arquivos:** 50MB download, 20MB upload (via multipart), 50MB via URL

**Portas suportadas para webhooks:** 443, 80, 88, 8443

**Pre-requisitos:**
- Conta no Telegram
- Bot criado via @BotFather (fornece o token)
- Token no formato: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`

Se o usuario nao tem um bot criado, oriente a conversar com @BotFather no Telegram e enviar `/newbot`.

---

## Decision Tree

```
O usuario precisa criar um bot?
├── SIM → Secao "Setup com BotFather" abaixo
└── NAO → Qual linguagem?
    ├── Node.js/TypeScript
    └── Python
    → O que quer fazer?
       ├── Enviar mensagens → Secao "Tipos de Mensagem"
       ├── Receber mensagens → Secao "Receber Updates"
       ├── Teclados interativos → Secao "Keyboards"
       ├── Gerenciar grupos/canais → references/chat-management.md
       ├── Webhook setup → references/webhook-setup.md
       ├── Inline mode → references/advanced-features.md
       ├── Pagamentos → references/advanced-features.md
       ├── Bot de atendimento com IA → Secao "Automacao com IA"
       └── Referencia completa da API → references/api-reference.md
```

Para iniciar um projeto do zero com boilerplate pronto:
```bash
python scripts/setup_project.py --language nodejs --path ./meu-bot-telegram

## Ou

python scripts/setup_project.py --language python --path ./meu-bot-telegram
```

Para testar se o token do bot funciona:
```bash
python scripts/test_bot.py --token "SEU_TOKEN"
```

Para enviar uma mensagem de teste:
```bash
python scripts/send_message.py --token "SEU_TOKEN" --chat-id "CHAT_ID" --text "Hello!"
> See [references/details.md](references/details.md) for full code examples.
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

## Node.Js/Typescript

> See [references/details.md](references/details.md) for full code examples.

## Python

> See [references/details.md](references/details.md) for full code examples.

## Sem Biblioteca (Http Puro)

> See [references/details.md](references/details.md) for full code examples.

---

## Tipos De Mensagem

O Telegram suporta diversos tipos de conteudo. Todos os metodos aceitam `chat_id`, `reply_parameters` (para responder), `reply_markup` (para keyboards), `disable_notification` e `protect_content`.

## Html (Recomendado)

await bot.send_message(
    chat_id=chat_id,
    text="<b>Negrito</b>, <i>italico</i>, <code>codigo</code>, <a href='https://example.com'>link</a>",
    parse_mode="HTML"
)

## Markdownv2 (Escapar Caracteres Especiais: _ * [ ] ( ) ~ ` > # + - = | { } . !)

await bot.send_message(
    chat_id=chat_id,
    text="*Negrito*, _italico_, `codigo`, [link](https://example\\.com)",
    parse_mode="MarkdownV2"
)
> See [references/details.md](references/details.md) for full code examples.

## Node.Js Equivalente

```typescript
// Foto
bot.sendPhoto(chatId, 'https://example.com/img.jpg', { caption: 'Legenda' });

// Documento
bot.sendDocument(chatId, fs.createReadStream('relatorio.pdf'), { caption: 'Relatorio' });

// Localizacao
bot.sendLocation(chatId, -23.5505, -46.6333);

// Enquete
bot.sendPoll(chatId, 'Qual sua cor favorita?', ['Azul', 'Verde', 'Vermelho']);
```

---

## Inline Keyboard (Botoes Dentro Da Mensagem)

> See [references/details.md](references/details.md) for full code examples.

## Reply Keyboard (Teclado Customizado)

```python
from telegram import ReplyKeyboardMarkup, KeyboardButton

keyboard = ReplyKeyboardMarkup(
    [[KeyboardButton("Enviar Localizacao", request_location=True)],
     [KeyboardButton("Enviar Contato", request_contact=True)],
     ["Opcao 1", "Opcao 2"]],
    resize_keyboard=True,
    one_time_keyboard=True
)

await bot.send_message(chat_id, "Escolha:", reply_markup=keyboard)
```

## Remover Teclado

```python
from telegram import ReplyKeyboardRemove
await bot.send_message(chat_id, "Teclado removido", reply_markup=ReplyKeyboardRemove())
```

---

## Receber Updates

Existem duas formas de receber updates: **Long Polling** e **Webhooks**.

## Long Polling (Desenvolvimento)

Mais simples, ideal para desenvolvimento. O bot faz requisicoes periodicas ao servidor do Telegram.

```python

## Python-Telegram-Bot Ja Faz Isso Automaticamente

app.run_polling(allowed_updates=Update.ALL_TYPES)
```

```typescript
// Telegraf com polling
const bot = new Telegraf(token);
bot.launch();
```

## Webhooks (Producao)

Para producao, webhooks sao mais eficientes. O Telegram envia updates via POST para sua URL HTTPS.

Leia `references/webhook-setup.md` para configuracao completa com Express, Flask, ngrok e deploy.

Setup rapido:

> See [references/details.md](references/details.md) for full code examples.

---

## Comandos Do Bot

Registre comandos para aparecerem no menu do Telegram:

```python
from telegram import BotCommand

await bot.set_my_commands([
    BotCommand("start", "Iniciar o bot"),
    BotCommand("help", "Ver comandos disponiveis"),
    BotCommand("settings", "Configuracoes"),
    BotCommand("status", "Ver status do servico"),
])
```

Via HTTP:
```bash
curl -X POST "https://api.telegram.org/bot$TOKEN/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{"commands":[{"command":"start","description":"Iniciar o bot"},{"command":"help","description":"Ajuda"}]}'
```

---

## Automacao Com Ia

Padrao para bot de atendimento com IA (Claude, GPT, etc.):

> See [references/details.md](references/details.md) for full code examples.

---

## Editar Texto

await bot.edit_message_text(
    chat_id=chat_id,
    message_id=msg.message_id,
    text="Texto atualizado!",
    parse_mode="HTML"
)

## Editar Markup (Botoes)

await bot.edit_message_reply_markup(
    chat_id=chat_id,
    message_id=msg.message_id,
    reply_markup=new_keyboard
)

## Deletar Mensagem

await bot.delete_message(chat_id=chat_id, message_id=msg.message_id)

## Encaminhar Mensagem

await bot.forward_message(
    chat_id=dest_chat_id,
    from_chat_id=source_chat_id,
    message_id=msg.message_id
)
```

---

## Tratamento De Erros

> See [references/details.md](references/details.md) for full code examples.

---

## Rate Limits

- **Mensagens em chat privado:** ~30 msg/segundo
- **Mensagens em grupo:** ~20 msg/minuto por grupo
- **Broadcast geral:** ~30 msg/segundo no total
- **Bulk notifications:** use `asyncio.sleep(0.05)` entre envios para evitar flood

Se receber erro 429 (Too Many Requests), respeite o `retry_after` retornado.

---

## Referencia De Arquivos

| Topico | Arquivo |
|--------|---------|
| Setup de webhooks | `references/webhook-setup.md` |
| Gerenciamento de chats | `references/chat-management.md` |
| Recursos avancados | `references/advanced-features.md` |
| Referencia completa da API | `references/api-reference.md` |
| Boilerplate Node.js | `assets/boilerplate/nodejs/` |
| Boilerplate Python | `assets/boilerplate/python/` |
| Exemplos de payloads | `assets/examples/` |

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `instagram` - Complementary skill for enhanced analysis
- `social-orchestrator` - Complementary skill for enhanced analysis
- `whatsapp-cloud-api` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
