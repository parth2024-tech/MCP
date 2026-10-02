# Telegram — Code Reference

## ## Ou

```

---

## Setup Com Botfather

1. Abra o Telegram e busque @BotFather
2. Envie `/newbot`
3. Escolha nome de exibicao (ex: "Meu Bot Incrivel")
4. Escolha username (deve terminar com "bot", ex: `meu_incrivel_bot`)
5. BotFather retorna o token - guarde com seguranca
6. Comandos uteis do BotFather:
   - `/setdescription` - descricao do bot
   - `/setabouttext` - texto "sobre" do bot
   - `/setuserpic` - foto de perfil
   - `/setcommands` - lista de comandos
   - `/mybots` - gerenciar bots existentes
   - `/setinline` - habilitar inline mode
   - `/setprivacy` - modo privacidade em grupos

---

## Variaveis De Ambiente

```env


## ## Node.Js/Typescript

```typescript
// Instalar: npm install telegraf dotenv
// Para TypeScript: npm install -D typescript
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

bot.start((ctx) => {
  ctx.reply('Ola! Eu sou seu bot. Como posso ajudar?');
});

bot.on('text', (ctx) => {
  if (!ctx.message.text.startsWith('/')) {
    ctx.reply(`Voce disse: ${ctx.message.text}`);
  }
});

bot.launch();
```


## ## Python

```python

## Instalar: Pip Install Python-Telegram-Bot Python-Dotenv

import os
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

load_dotenv()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text('Ola! Eu sou seu bot. Como posso ajudar?')

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(f'Voce disse: {update.message.text}')

app = Application.builder().token(os.getenv('TELEGRAM_BOT_TOKEN')).build()
app.add_handler(CommandHandler('start', start))
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
app.run_polling()
```


## ## Sem Biblioteca (Http Puro)

```python
import requests

TOKEN = "SEU_TOKEN"
BASE = f"https://api.telegram.org/bot{TOKEN}"

## Verificar Bot

r = requests.get(f"{BASE}/getMe")
print(r.json())

## Enviar Mensagem

r = requests.post(f"{BASE}/sendMessage", json={
    "chat_id": "CHAT_ID",
    "text": "Hello from pure HTTP!",
    "parse_mode": "HTML"
})
print(r.json())
```


## ## Markdownv2 (Escapar Caracteres Especiais: _ * [ ] ( ) ~ ` > # + - = | { } . !)

```

## Foto (Por Url, File_Id Ou Upload)

await bot.send_photo(chat_id, photo="https://example.com/img.jpg", caption="Legenda aqui")

## Documento

await bot.send_document(chat_id, document=open("relatorio.pdf", "rb"), caption="Relatorio mensal")

## Video

await bot.send_video(chat_id, video="https://example.com/video.mp4", caption="Assista!")

## Audio

await bot.send_audio(chat_id, audio=open("musica.mp3", "rb"), title="Minha Musica")

## Voz (Ogg Com Opus)

await bot.send_voice(chat_id, voice=open("audio.ogg", "rb"))

## Localizacao

await bot.send_location(chat_id, latitude=-23.5505, longitude=-46.6333)

## Contato

await bot.send_contact(chat_id, phone_number="+5511999999999", first_name="Joao")

## Enquete

await bot.send_poll(
    chat_id, question="Qual sua cor favorita?",
    options=["Azul", "Verde", "Vermelho"],
    is_anonymous=False
)

## Grupo De Midias

await bot.send_media_group(chat_id, media=[
    InputMediaPhoto("url1", caption="Foto 1"),
    InputMediaPhoto("url2"),
    InputMediaVideo("url3")
])

## Acao De Chat (Typing, Upload_Photo, Etc.)

await bot.send_chat_action(chat_id, action="typing")
```


## ## Inline Keyboard (Botoes Dentro Da Mensagem)

```python
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

keyboard = InlineKeyboardMarkup([
    [InlineKeyboardButton("Opcao A", callback_data="opt_a"),
     InlineKeyboardButton("Opcao B", callback_data="opt_b")],
    [InlineKeyboardButton("Abrir Site", url="https://example.com")],
    [InlineKeyboardButton("Compartilhar", switch_inline_query="texto")]
])

await bot.send_message(chat_id, "Escolha uma opcao:", reply_markup=keyboard)

## Handler De Callback

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()  # Importante: sempre responder o callback
    await query.edit_message_text(f"Voce escolheu: {query.data}")

app.add_handler(CallbackQueryHandler(button_callback))
```


## ## Webhooks (Producao)

```python

## Flask Webhook

from flask import Flask, request
import requests

app = Flask(__name__)
TOKEN = "SEU_TOKEN"
BASE = f"https://api.telegram.org/bot{TOKEN}"

@app.route(f"/webhook/{TOKEN}", methods=["POST"])
def webhook():
    update = request.get_json()
    if "message" in update and "text" in update["message"]:
        chat_id = update["message"]["chat"]["id"]
        text = update["message"]["text"]
        requests.post(f"{BASE}/sendMessage", json={
            "chat_id": chat_id,
            "text": f"Recebi: {text}"
        })
    return "OK", 200

## Registrar Webhook

requests.post(f"{BASE}/setWebhook", json={
    "url": "https://seu-dominio.com/webhook/" + TOKEN,
    "allowed_updates": ["message", "callback_query"],
    "secret_token": "seu_secret_seguro_aqui"
})
```


## ## Automacao Com Ia

```python
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes
import anthropic  # ou openai

client = anthropic.Anthropic()
user_conversations = {}  # chat_id -> messages history

async def ai_response(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.message.chat_id
    user_text = update.message.text

    # Indicar que esta digitando
    await context.bot.send_chat_action(chat_id, "typing")

    # Manter historico
    if chat_id not in user_conversations:
        user_conversations[chat_id] = []

    user_conversations[chat_id].append({"role": "user", "content": user_text})

    # Chamar IA
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system="Voce e um assistente prestativo. Responda em portugues.",
        messages=user_conversations[chat_id]
    )

    reply = response.content[0].text
    user_conversations[chat_id].append({"role": "assistant", "content": reply})

    # Limitar historico (ultimas 20 mensagens)
    if len(user_conversations[chat_id]) > 20:
        user_conversations[chat_id] = user_conversations[chat_id][-20:]

    await update.message.reply_text(reply)

app = Application.builder().token(TOKEN).build()
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, ai_response))
app.run_polling()
```


## ## Tratamento De Erros

```python
from telegram.error import TelegramError, BadRequest, TimedOut, NetworkError

async def safe_send(bot, chat_id, text, **kwargs):
    """Envio com retry e tratamento de erros."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            return await bot.send_message(chat_id, text, **kwargs)
        except TimedOut:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
                continue
            raise
        except BadRequest as e:
            if "chat not found" in str(e).lower():
                print(f"Chat {chat_id} nao encontrado")
                return None
            raise
        except NetworkError:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
                continue
            raise
```


