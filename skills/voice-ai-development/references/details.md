# Voice Ai Development — Code Reference

## ### Phone-based Agent

```

## Related Skills

Works well with: `langgraph`, `structured-output`, `langfuse`

## When to Use
- User mentions or implies: voice ai
- User mentions or implies: voice agent
- User mentions or implies: speech to text
- User mentions or implies: text to speech
- User mentions or implies: realtime voice
- User mentions or implies: vapi
- User mentions or implies: deepgram
- User mentions or implies: elevenlabs
- User mentions or implies: livekit
- User mentions or implies: openai realtime

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.




---

# Latency optimization tips:
# 1. Use streaming everywhere (STT, LLM, TTS)
# 2. Start TTS before LLM finishes (~50 char buffer)
# 3. Use PCM audio format (no encoding overhead)
# 4. Keep WebSocket connections alive
# 5. Use regional endpoints close to users

## Validation Checks

### Non-Streaming TTS

Severity: HIGH

Message: Non-streaming TTS adds significant latency.

Fix action: Use tts.synthesize_stream() or tts.convert_as_stream()

### Hardcoded Sample Rate

Severity: MEDIUM

Message: Hardcoded sample rate may cause format mismatches.

Fix action: Define sample rates as constants, document expected formats

### WebSocket Without Reconnection

Severity: HIGH

Message: WebSocket connections need reconnection logic.

Fix action: Add retry loop with exponential backoff

### Missing VAD Configuration

Severity: MEDIUM

Message: VAD needs tuning for good user experience.

Fix action: Configure threshold and silence_duration_ms

### Blocking Audio Processing

Severity: HIGH

Message: Audio processing should be async to avoid blocking.

Fix action: Use async def and await for audio operations

### Missing Interruption Handling

Severity: MEDIUM

Message: Voice agents should handle user interruptions.

Fix action: Add barge-in detection and cancel current response

### Audio Queue Without Clear

Severity: LOW

Message: Audio queues should be clearable for interruptions.

Fix action: Add method to clear queue on interruption

### WebSocket Without Error Handling

Severity: HIGH

Message: WebSocket operations need error handling.

Fix action: Wrap in try/except for ConnectionClosed

## Collaboration

### Delegation Triggers

- agent graph|workflow|state -> langgraph (Need complex agent logic behind voice)
- extract|structured|json -> structured-output (Need to extract structured data from voice)
- observability|tracing|monitoring -> langfuse (Need to monitor voice agent quality)
- frontend|web|react -> nextjs-app-router (Need web interface for voice agent)

### Intelligent Voice Agent

Skills: voice-ai-development, langgraph, structured-output

Workflow:

```
1. Design agent graph with tools
2. Add voice interface layer
3. Use structured output for tool responses
4. Optimize for voice latency
```

### Monitored Voice Agent

Skills: voice-ai-development, langfuse

Workflow:

```
1. Build voice agent with provider of choice
2. Add Langfuse callbacks
3. Track latency, quality, conversation flow
4. Iterate based on metrics
```

### Phone-based Agent

Skills: voice-ai-development, twilio

Workflow:

```
1. Set up Vapi or custom agent
2. Connect to Twilio for PSTN
3. Handle inbound/outbound calls
4. Implement call routing logic
> See [references/details.md](references/details.md) for full code examples.


---
## Additional Content

        self.is_speaking = False
        # Clear audio queue
        # Stop TTS generation



> Extended reference material: [references/details.md](references/details.md)
