---
name: voice-ai-engine-development
description: Build real-time conversational AI voice engines using async worker pipelines, streaming transcription, LLM agents, and TTS synthesis with interrupt handling and multi-provider support. Use when the task involves voice ai engine development.
risk: unknown
source: community
date_added: "2026-02-27"
---

# Voice AI Engine Development

## Overview

This skill guides you through building production-ready voice AI engines with real-time conversation capabilities. Voice AI engines enable natural, bidirectional conversations between users and AI agents through streaming audio processing, speech-to-text transcription, LLM-powered responses, and text-to-speech synthesis.

The core architecture uses an async queue-based worker pipeline where each component runs independently and communicates via `asyncio.Queue` objects, enabling concurrent processing, interrupt handling, and real-time streaming at every stage.

## When to Use This Skill

Use this skill when:
- Building real-time voice conversation systems
- Implementing voice assistants or chatbots
- Creating voice-enabled customer service agents
- Developing voice AI applications with interrupt capabilities
- Integrating multiple transcription, LLM, or TTS providers
- Working with streaming audio processing pipelines
- The user mentions Vocode, voice engines, or conversational AI

## Core Architecture Principles

### The Worker Pipeline Pattern

Every voice AI engine follows this pipeline:

```
Audio In → Transcriber → Agent → Synthesizer → Audio Out
           (Worker 1)   (Worker 2)  (Worker 3)
```

**Key Benefits:**
- **Decoupling**: Workers only know about their input/output queues
- **Concurrency**: All workers run simultaneously via asyncio
- **Backpressure**: Queues automatically handle rate differences
- **Interruptibility**: Everything can be stopped mid-stream

### Base Worker Pattern

Every worker follows this pattern:

> See [references/details.md](references/details.md) for full code examples.

## Component Implementation Guide

### 1. Transcriber (Audio → Text)

**Purpose**: Converts incoming audio chunks to text transcriptions

**Interface Requirements**:
> See [references/details.md](references/details.md) for full code examples.

**Output Format**:
```python
class Transcription:
    message: str          # "Hello, how are you?"
    confidence: float     # 0.95
    is_final: bool        # True = complete sentence, False = partial
    is_interrupt: bool    # Set by TranscriptionsWorker
class BaseAgent:
    def __init__(self, agent_config):
        self.input_queue = asyncio.Queue()   # TranscriptionAgentInput
        self.output_queue = asyncio.Queue()  # AgentResponse
        self.transcript = None               # Conversation history
    
    async def generate_response(self, human_input, is_interrupt, conversation_id):
        """Override this - returns AsyncGenerator of responses"""
        raise NotImplementedError
class BaseSynthesizer:
    async def create_speech(self, message: BaseMessage, chunk_size: int) -> SynthesisResult:
        """
        Returns a SynthesisResult containing:
        - chunk_generator: AsyncGenerator that yields audio chunks
        - get_message_up_to: Function to get partial text (for interrupts)
        """
        raise NotImplementedError
```

**SynthesisResult Structure**:
```python
class SynthesisResult:
    chunk_generator: AsyncGenerator[ChunkResult, None]
    get_message_up_to: Callable[[float], str]  # seconds → partial text
    
    class ChunkResult:
        chunk: bytes          # Raw PCM audio
        is_last_chunk: bool
async def send_speech_to_output(self, message, synthesis_result,
                                stop_event, seconds_per_chunk):
    chunk_idx = 0
    async for chunk_result in synthesis_result.chunk_generator:
        # Check for interrupt
        if stop_event.is_set():
            logger.debug(f"Interrupted after {chunk_idx} chunks")
            message_sent = synthesis_result.get_message_up_to(
                chunk_idx * seconds_per_chunk
            )
            return message_sent, True  # cut_off = True
        
        start_time = time.time()
        
        # Send chunk to output device
        self.output_device.consume_nonblocking(chunk_result.chunk)
        
        # CRITICAL: Wait for chunk to play before sending next one
        # This is what makes interrupts work!
        speech_length = seconds_per_chunk
        processing_time = time.time() - start_time
        await asyncio.sleep(max(speech_length - processing_time, 0))
        
        chunk_idx += 1
    
    return message, False  # cut_off = False
# TranscriptionsWorker detects new transcription while bot speaking
async def process(self, transcription):
    if not self.conversation.is_human_speaking:  # Bot was speaking!
        # Broadcast interrupt to all in-flight events
        interrupted = self.conversation.broadcast_interrupt()
        transcription.is_interrupt = interrupted
```

**Step 2: broadcast_interrupt() stops everything**
```python
def broadcast_interrupt(self):
    num_interrupts = 0
    # Interrupt all queued events
    while True:
        try:
            interruptible_event = self.interruptible_events.get_nowait()
            if interruptible_event.interrupt():  # Sets interruption_event
                num_interrupts += 1
        except queue.Empty:
            break
    
    # Cancel current tasks
    self.agent.cancel_current_task()              # Stop generating text
    self.agent_responses_worker.cancel_current_task()  # Stop synthesizing
    return num_interrupts > 0
```

**Step 3: SynthesisResultsWorker detects interrupt**
```python
async def send_speech_to_output(self, synthesis_result, stop_event, ...):
    async for chunk_result in synthesis_result.chunk_generator:
        # Check stop_event (this is the interruption_event)
        if stop_event.is_set():
            logger.debug("Interrupted! Stopping speech.")
            # Calculate what was actually spoken
            seconds_spoken = chunk_idx * seconds_per_chunk
            partial_message = synthesis_result.get_message_up_to(seconds_spoken)
            # e.g., "I think the weather will be nice today"
            return partial_message, True  # cut_off = True
```

**Step 4: Agent updates history**
```python
if cut_off:
    # Update conversation history with partial message
    self.agent.update_last_bot_message_on_cut_off(message_sent)
    # History now shows:
    # Bot: "I think the weather will be nice today" (incomplete)
```

### InterruptibleEvent Pattern

Every event in the pipeline is wrapped in an `InterruptibleEvent`:

> See [references/details.md](references/details.md) for full code examples.

## Multi-Provider Factory Pattern

Support multiple providers with a factory pattern:

> See [references/details.md](references/details.md) for full code examples.

## WebSocket Integration

Voice AI engines typically use WebSocket for bidirectional audio streaming:

> See [references/details.md](references/details.md) for full code examples.

## Common Pitfalls and Solutions

### 1. Audio Jumping/Cutting Off

**Problem**: Bot's audio jumps or cuts off mid-response.

**Cause**: Sending text to synthesizer in small chunks causes multiple TTS calls.

**Solution**: Buffer the entire LLM response before sending to synthesizer:

```python
# ❌ Bad: Yields sentence-by-sentence
async for sentence in llm_stream:
    yield GeneratedResponse(message=BaseMessage(text=sentence))

# ✅ Good: Buffer entire response
full_response = ""
async for chunk in llm_stream:
    full_response += chunk
yield GeneratedResponse(message=BaseMessage(text=full_response))
```

### 2. Echo/Feedback Loop

**Problem**: Bot hears itself speaking and responds to its own audio.

**Cause**: Transcriber not muted during bot speech.

**Solution**: Mute transcriber when bot starts speaking:

```python
# Before sending audio to output
self.transcriber.mute()
# After audio playback complete
self.transcriber.unmute()
```

### 3. Interrupts Not Working

**Problem**: User can't interrupt bot mid-sentence.

**Cause**: All audio chunks sent at once instead of rate-limited.

**Solution**: Rate-limit audio chunks to match real-time playback:

```python
async for chunk in synthesis_result.chunk_generator:
    start_time = time.time()
    
    # Send chunk
    output_device.consume_nonblocking(chunk)
    
    # Wait for chunk duration before sending next
    processing_time = time.time() - start_time
    await asyncio.sleep(max(seconds_per_chunk - processing_time, 0))
```

### 4. Memory Leaks from Unclosed Streams

**Problem**: Memory usage grows over time.

**Cause**: WebSocket connections or API streams not properly closed.

**Solution**: Always use context managers and cleanup:

```python
try:
    async with websockets.connect(url) as ws:
        # Use websocket
        pass
finally:
    # Cleanup
    await conversation.terminate()
    await transcriber.terminate()
```

## Production Considerations

### 1. Error Handling

```python
async def _run_loop(self):
    while self.active:
        try:
            item = await self.input_queue.get()
            await self.process(item)
        except Exception as e:
            logger.error(f"Worker error: {e}", exc_info=True)
            # Don't crash the worker, continue processing
```

### 2. Graceful Shutdown

```python
async def terminate(self):
    """Gracefully shut down all workers"""
    self.active = False
    
    # Stop all workers
    self.transcriber.terminate()
    self.agent.terminate()
    self.synthesizer.terminate()
    
    # Wait for queues to drain
    await asyncio.sleep(0.5)
    
    # Close connections
    if self.websocket:
        await self.websocket.close()
```

### 3. Monitoring and Logging

```python
# Log key events
logger.info(f"🎤 [TRANSCRIBER] Received: '{transcription.message}'")
logger.info(f"🤖 [AGENT] Generating response...")
logger.info(f"🔊 [SYNTHESIZER] Synthesizing {len(text)} characters")
logger.info(f"⚠️ [INTERRUPT] User interrupted bot")

# Track metrics
metrics.increment("transcriptions.count")
metrics.timing("agent.response_time", duration)
metrics.gauge("active_conversations", count)
```

### 4. Rate Limiting and Quotas

```python
# Implement rate limiting for API calls
from aiolimiter import AsyncLimiter

rate_limiter = AsyncLimiter(max_rate=10, time_period=1)  # 10 calls/second

async def call_api(self, data):
    async with rate_limiter:
        return await self.client.post(data)
```

## Key Design Patterns

### 1. Producer-Consumer with Queues

```python
# Producer
async def producer(queue):
    while True:
        item = await generate_item()
        queue.put_nowait(item)

# Consumer
async def consumer(queue):
    while True:
        item = await queue.get()
        await process_item(item)
```

### 2. Streaming Generators

Instead of returning complete results:

```python
# ❌ Bad: Wait for entire response
async def generate_response(prompt):
    response = await openai.complete(prompt)  # 5 seconds
    return response

# ✅ Good: Stream chunks as they arrive
async def generate_response(prompt):
    async for chunk in openai.complete(prompt, stream=True):
        yield chunk  # Yield after 0.1s, 0.2s, etc.
```

### 3. Conversation State Management

Maintain conversation history for context:

```python
class Transcript:
    event_logs: List[Message] = []
    
    def add_human_message(self, text):
        self.event_logs.append(Message(sender=Sender.HUMAN, text=text))
    
    def add_bot_message(self, text):
        self.event_logs.append(Message(sender=Sender.BOT, text=text))
    
    def to_openai_messages(self):
        return [
            {"role": "user" if msg.sender == Sender.HUMAN else "assistant",
             "content": msg.text}
            for msg in self.event_logs
        ]
```

## Testing Strategies

### 1. Unit Test Workers in Isolation

```python
async def test_transcriber():
    transcriber = DeepgramTranscriber(config)
    
    # Mock audio input
    audio_chunk = b'/x00/x01/x02...'
    transcriber.send_audio(audio_chunk)
    
    # Check output
    transcription = await transcriber.output_queue.get()
    assert transcription.message == "expected text"
```

### 2. Integration Test Pipeline

```python
async def test_full_pipeline():
    # Create all components
    conversation = create_test_conversation()
    
    # Send test audio
    conversation.receive_audio(test_audio_chunk)
    
    # Wait for response
    response = await wait_for_audio_output(timeout=5)
    
    assert response is not None
```

### 3. Test Interrupts

```python
async def test_interrupt():
    conversation = create_test_conversation()
    
    # Start bot speaking
    await conversation.agent.generate_response("Tell me a long story")
    
    # Interrupt mid-response
    await asyncio.sleep(1)  # Let it speak for 1 second
    conversation.broadcast_interrupt()
    
    # Verify partial message in transcript
    last_message = conversation.transcript.event_logs[-1]
    assert last_message.text != full_expected_message
> See [references/details.md](references/details.md) for full code examples.
