# Amazon Alexa — Code Reference

## ## 1. Visao Geral Do Ecossistema

```

## Componentes Da Arquitetura Auri

| Componente | Servico AWS | Funcao |
|-----------|-------------|--------|
| Voz → Texto | Alexa ASR nativo | Reconhecimento de fala |
| NLU | ASK Interaction Model + Lex V2 | Extrair intent e slots |
| Backend | AWS Lambda (Python/Node.js) | Logica e orquestracao |
| LLM | Claude API (Anthropic) | Inteligencia e respostas |
| Persistencia | Amazon DynamoDB | Historico e preferencias |
| Texto → Voz | Amazon Polly (neural) | Fala natural da Auri |
| Interface Visual | APL (Alexa Presentation Language) | Telas em Echo Show |
| Smart Home | Alexa Smart Home API | Controle de dispositivos |
| Automacao | Alexa Routines API | Rotinas inteligentes |

---

### 2.1 Pre-Requisitos

```bash


## ## 3.1 Intents Essenciais Para Auri

```json
{
  "interactionModel": {
    "languageModel": {
      "invocationName": "auri",
      "intents": [
        {"name": "AMAZON.HelpIntent"},
        {"name": "AMAZON.StopIntent"},
        {"name": "AMAZON.CancelIntent"},
        {"name": "AMAZON.FallbackIntent"},
        {
          "name": "ChatIntent",
          "slots": [{"name": "query", "type": "AMAZON.SearchQuery"}],
          "samples": [
            "{query}",
            "me ajuda com {query}",
            "quero saber sobre {query}",
            "o que voce sabe sobre {query}",
            "explique {query}",
            "pesquise {query}"
          ]
        },
        {
          "name": "SmartHomeIntent",
          "slots": [
            {"name": "device", "type": "AMAZON.Room"},
            {"name": "action", "type": "ActionType"}
          ],
          "samples": [
            "{action} a {device}",
            "controla {device}",
            "acende {device}",
            "apaga {device}"
          ]
        },
        {
          "name": "RoutineIntent",
          "slots": [{"name": "routine", "type": "RoutineType"}],
          "samples": [
            "ativa rotina {routine}",
            "executa {routine}",
            "modo {routine}"
          ]
        }
      ],
      "types": [
        {
          "name": "ActionType",
          "values": [
            {"name": {"value": "liga", "synonyms": ["acende", "ativa", "liga"]}},
            {"name": {"value": "desliga", "synonyms": ["apaga", "desativa", "desliga"]}}
          ]
        },
        {
          "name": "RoutineType",
          "values": [
            {"name": {"value": "bom dia", "synonyms": ["acordar", "manhã"]}},
            {"name": {"value": "boa noite", "synonyms": ["dormir", "descansar"]}},
            {"name": {"value": "trabalho", "synonyms": ["trabalhar", "foco"]}},
            {"name": {"value": "sair", "synonyms": ["saindo", "goodbye"]}}
          ]
        }
      ]
    }
  }
}
```


## ## 4.1 Handler Principal Python

```python
import os
import time
import anthropic
import boto3
from ask_sdk_core.skill_builder import SkillBuilder
from ask_sdk_core.handler_input import HandlerInput
from ask_sdk_core.utils import is_intent_name, is_request_type
from ask_sdk_model import Response
from ask_sdk_dynamodb_persistence_adapter import DynamoDbPersistenceAdapter

## ============================================================

@sb.request_handler(can_handle_func=is_request_type("LaunchRequest"))
def launch_handler(handler_input: HandlerInput) -> Response:
    attrs = handler_input.attributes_manager.persistent_attributes
    name = attrs.get("name", "")
    greeting = f"Oi{', ' + name if name else ''}! Eu sou a Auri. Como posso ajudar?"
    return (handler_input.response_builder
            .speak(greeting).ask("Em que posso ajudar?").response)


@sb.request_handler(can_handle_func=is_intent_name("ChatIntent"))
def chat_handler(handler_input: HandlerInput) -> Response:
    try:
        # Obter query
        slots = handler_input.request_envelope.request.intent.slots
        query = slots["query"].value if slots.get("query") else None
        if not query:
            return (handler_input.response_builder
                    .speak("Pode repetir? Nao entendi bem.").ask("Pode repetir?").response)

        # Carregar historico
        attrs = handler_input.attributes_manager.persistent_attributes
        history = attrs.get("history", [])

        # Montar mensagens para Claude
        messages = history[-MAX_HISTORY:]
        messages.append({"role": "user", "content": query})

        # Chamar Claude
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=512,
            system=AURI_SYSTEM_PROMPT,
            messages=messages
        )
        reply = response.content[0].text

        # Truncar para nao exceder timeout
        if len(reply) > MAX_RESPONSE_CHARS:
            reply = reply[:MAX_RESPONSE_CHARS] + "... Quer que eu continue?"

        # Salvar historico
        history.append({"role": "user", "content": query})
        history.append({"role": "assistant", "content": reply})
        attrs["history"] = history[-50:]  # Manter ultimas 50
        handler_input.attributes_manager.persistent_attributes = attrs
        handler_input.attributes_manager.save_persist

### 4.2 Variaveis De Ambiente Lambda

```


## ### 5.2 Schema Do Usuario

```json
{
  "userId": "amzn1.ask.account.XXXXX",
  "name": "Joao",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "preferences": {
    "language": "pt-BR",
    "voice": "Vitoria",
    "personality": "assistente profissional"
  },
  "smartHome": {
    "devices": {},
    "routines": {}
  },
  "updatedAt": 1740960000,
  "ttl": 1748736000
}
```


## ### 6.2 Integrar Polly Na Resposta

```python
import boto3
import base64

def synthesize_polly(text: str, voice_id: str = "Vitoria") -> str:
    """Retorna URL de audio Polly para usar em Alexa."""
    client = boto3.client("polly", region_name="us-east-1")
    response = client.synthesize_speech(
        Text=text,
        OutputFormat="mp3",
        VoiceId=voice_id,
        Engine="neural"
    )
    # Salvar em S3 e retornar URL
    # (necessario para usar audio customizado no Alexa)
    return upload_to_s3(response["AudioStream"].read())

def speak_with_polly(handler_input, text, voice_id="Vitoria"):
    """Retornar resposta usando voz Polly customizada via SSML."""
    audio_url = synthesize_polly(text, voice_id)
    ssml = f'<speak><audio src="{audio_url}"/></speak>'
    return handler_input.response_builder.speak(ssml)
```


## ### 7.1 Template De Chat

```json
{
  "type": "APL",
  "version": "2023.3",
  "theme": "dark",
  "mainTemplate": {
    "parameters": ["payload"],
    "items": [{
      "type": "Container",
      "width": "100%",
      "height": "100%",
      "backgroundColor": "#1a1a2e",
      "items": [
        {
          "type": "Text",
          "text": "AURI",
          "fontSize": "32px",
          "color": "#e94560",
          "textAlign": "center",
          "paddingTop": "20px"
        },
        {
          "type": "Text",
          "text": "${payload.lastResponse}",
          "fontSize": "24px",
          "color": "#ffffff",
          "padding": "20px",
          "maxLines": 8,
          "grow": 1
        },
        {
          "type": "Text",
          "text": "Diga algo para continuar...",
          "fontSize": "18px",
          "color": "#888888",
          "textAlign": "center",
          "paddingBottom": "20px"
        }
      ]
    }]
  }
}
```


## ### 7.2 Adicionar Apl Na Resposta

```python
@sb.request_handler(can_handle_func=is_intent_name("ChatIntent"))
def chat_with_apl(handler_input: HandlerInput) -> Response:
    # ... obter reply do Claude ...

    # Verificar se device suporta APL
    supported = handler_input.request_envelope.context.system.device.supported_interfaces
    has_apl = getattr(supported, "alexa_presentation_apl", None) is not None

    if has_apl:
        apl_directive = {
            "type": "Alexa.Presentation.APL.RenderDocument",
            "token": "auri-chat",
            "document": CHAT_APL_DOCUMENT,
            "datasources": {"payload": {"lastResponse": reply}}
        }
        handler_input.response_builder.add_directive(apl_directive)

    return handler_input.response_builder.speak(reply).ask("Mais alguma coisa?").response
```


## ### 8.3 Discovery De Dispositivos

```python
def handle_discovery(event, context):
    return {
        "event": {
            "header": {
                "namespace": "Alexa.Discovery",
                "name": "Discover.Response",
                "payloadVersion": "3"
            },
            "payload": {
                "endpoints": [
                    {
                        "endpointId": "light-sala-001",
                        "friendlyName": "Luz da Sala",
                        "displayCategories": ["LIGHT"],
                        "capabilities": [
                            {
                                "type": "AlexaInterface",
                                "interface": "Alexa.PowerController",
                                "version": "3"
                            },
                            {
                                "type": "AlexaInterface",
                                "interface": "Alexa.BrightnessController",
                                "version": "3"
                            }
                        ]
                    }
                ]
            }
        }
    }
```


## ## Teste Especifico De Intent

```

## Criar Lambda Manualmente

aws lambda create-function \
  --function-name auri-skill \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT:role/auri-lambda-role \
  --handler lambda_function.handler \
  --timeout 8 \
  --memory-size 512 \
  --zip-file fileb://function.zip

## Adicionar Trigger Alexa

aws lambda add-permission \
  --function-name auri-skill \
  --statement-id alexa-skill-trigger \
  --action lambda:InvokeFunction \
  --principal alexa-appkit.amazon.com \
  --event-source-token amzn1.ask.skill.YOUR-SKILL-ID
```


## ## Fase 6 — Publicacao

```

---

## 11. Comandos Rapidos

| Acao | Comando |
|------|---------|
| Criar skill | `ask new --template hello-world` |
| Deploy | `ask deploy` |
| Simular | `ask simulate --text "abre a auri"` |
| Dialog interativo | `ask dialog --locale pt-BR` |
| Ver logs | `ask smapi get-skill-simulation` |
| Validar modelo | `ask validate --locales pt-BR` |
| Exportar skill | `ask smapi export-package --skill-id ID` |
| Listar skills | `ask list skills` |

---

## 12. Referencias

- Boilerplate Python completo: `assets/boilerplate/lambda_function.py`
- Interaction model PT-BR: `assets/interaction-models/pt-BR.json`
- APL chat template: `assets/apl-templates/chat-interface.json`
- Smart Home examples: `references/smart-home-api.md`
- ASK SDK Python docs: https://github.com/alexa/alexa-skills-kit-sdk-for-python
- Claude + Alexa guide: https://www.anthropic.com/news/claude-and-alexa-plus

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


