# Voice Ai Engine Development — Code Reference

## ### Base Worker Pattern

```python
class BaseWorker:
    def __init__(self, input_queue, output_queue):
        self.input_queue = input_queue   # asyncio.Queue to consume from
        self.output_queue = output_queue # asyncio.Queue to produce to
        self.active = False
    
    def start(self):
        """Start the worker's processing loop"""
        self.active = True
        asyncio.create_task(self._run_loop())
    
    async def _run_loop(self):
        """Main processing loop - runs forever until terminated"""
        while self.active:
            item = await self.input_queue.get()  # Block until item arrives
            await self.process(item)              # Process the item
    
    async def process(self, item):
        """Override this - does the actual work"""
        raise NotImplementedError
    
    def terminate(self):
        """Stop the worker"""
        self.active = False
```


## ### 1. Transcriber (Audio → Text)

```python
class BaseTranscriber:
    def __init__(self, transcriber_config):
        self.input_queue = asyncio.Queue()   # Audio chunks (bytes)
        self.output_queue = asyncio.Queue()  # Transcriptions
        self.is_muted = False
    
    def send_audio(self, chunk: bytes):
        """Client calls this to send audio"""
        if not self.is_muted:
            self.input_queue.put_nowait(chunk)
        else:
            # Send silence instead (prevents echo during bot speech)
            self.input_queue.put_nowait(self.create_silent_chunk(len(chunk)))
    
    def mute(self):
        """Called when bot starts speaking (prevents echo)"""
        self.is_muted = True
    
    def unmute(self):
        """Called when bot stops speaking"""
        self.is_muted = False
```


```

**Supported Providers**:
- **Deepgram** - Fast, accurate, streaming
- **AssemblyAI** - High accuracy, good for accents
- **Azure Speech** - Enterprise-grade
- **Google Cloud Speech** - Multi-language support

**Critical Implementation Details**:
- Use WebSocket for bidirectional streaming
- Run sender and receiver tasks concurrently with `asyncio.gather()`
- Mute transcriber when bot speaks to prevent echo/feedback loops
- Handle both final and partial transcriptions

### 2. Agent (Text → Response)

**Purpose**: Processes user input and generates conversational responses

**Interface Requirements**:
```python


```

**Why Streaming Responses?**
- **Lower latency**: Start speaking as soon as first sentence is ready
- **Better interrupts**: Can stop mid-response
- **Sentence-by-sentence**: More natural conversation flow

**Supported Providers**:
- **OpenAI** (GPT-4, GPT-3.5) - High quality, fast
- **Google Gemini** - Multimodal, cost-effective
- **Anthropic Claude** - Long context, nuanced responses

**Critical Implementation Details**:
- Maintain conversation history in `Transcript` object
- Stream responses using `AsyncGenerator`
- **IMPORTANT**: Buffer entire LLM response before yielding to synthesizer (prevents audio jumping)
- Handle interrupts by canceling current generation task
- Update conversation history with partial messages on interrupt

### 3. Synthesizer (Text → Audio)

**Purpose**: Converts agent text responses to speech audio

**Interface Requirements**:
```python


```

**Supported Providers**:
- **ElevenLabs** - Most natural voices, streaming
- **Azure TTS** - Enterprise-grade, many languages
- **Google Cloud TTS** - Cost-effective, good quality
- **Amazon Polly** - AWS integration
- **Play.ht** - Voice cloning

**Critical Implementation Details**:
- Stream audio chunks as they're generated
- Convert audio to LINEAR16 PCM format (16kHz sample rate)
- Implement `get_message_up_to()` for interrupt handling
- Handle audio format conversion (MP3 → PCM)

### 4. Output Device (Audio → Client)

**Purpose**: Sends synthesized audio back to the client

**CRITICAL: Rate Limiting for Interrupts**

```python


```

**Why Rate Limiting?**
Without rate limiting, all audio chunks would be sent immediately, which would:
- Buffer entire message on client side
- Make interrupts impossible (all audio already sent)
- Cause timing issues

By sending one chunk every N seconds:
- Real-time playback is maintained
- Interrupts can stop mid-sentence
- Natural conversation flow is preserved

## The Interrupt System

The interrupt system is critical for natural conversations.

### How Interrupts Work

**Scenario**: Bot is saying "I think the weather will be nice today and tomorrow and—" when user interrupts with "Stop".

**Step 1: User starts speaking**
```python


## ### InterruptibleEvent Pattern

```python
class InterruptibleEvent:
    def __init__(self, payload, is_interruptible=True):
        self.payload = payload
        self.is_interruptible = is_interruptible
        self.interruption_event = threading.Event()  # Initially not set
        self.interrupted = False
    
    def interrupt(self) -> bool:
        """Interrupt this event"""
        if not self.is_interruptible:
            return False
        if not self.interrupted:
            self.interruption_event.set()  # Signal to stop!
            self.interrupted = True
            return True
        return False
    
    def is_interrupted(self) -> bool:
        return self.interruption_event.is_set()
```


## ## Multi-Provider Factory Pattern

```python
class VoiceHandler:
    """Multi-provider factory for voice components"""
    
    def create_transcriber(self, agent_config: Dict):
        """Create transcriber based on transcriberProvider"""
        provider = agent_config.get("transcriberProvider", "deepgram")
        
        if provider == "deepgram":
            return self._create_deepgram_transcriber(agent_config)
        elif provider == "assemblyai":
            return self._create_assemblyai_transcriber(agent_config)
        elif provider == "azure":
            return self._create_azure_transcriber(agent_config)
        elif provider == "google":
            return self._create_google_transcriber(agent_config)
        else:
            raise ValueError(f"Unknown transcriber provider: {provider}")
    
    def create_agent(self, agent_config: Dict):
        """Create LLM agent based on llmProvider"""
        provider = agent_config.get("llmProvider", "openai")
        
        if provider == "openai":
            return self._create_openai_agent(agent_config)
        elif provider == "gemini":
            return self._create_gemini_agent(agent_config)
        else:
            raise ValueError(f"Unknown LLM provider: {provider}")
    
    def create_synthesizer(self, agent_config: Dict):
        """Create voice synthesizer based on voiceProvider"""
        provider = agent_config.get("voiceProvider", "elevenlabs")
        
        if provider == "elevenlabs":
            return self._create_elevenlabs_synthesizer(agent_config)
        elif provider == "azure":
            return self._create_azure_synthesizer(agent_config)
        elif provider == "google":
            return self._create_google_synthesizer(agent_config)
        elif provider == "polly":
            return self._create_polly_synthesizer(agent_config)
        elif provider == "playht":
            return self._create_playht_synthesizer(agent_config)
        else:
            raise ValueError(f"Unknown voice provider: {provider}")
```


## ## WebSocket Integration

```python
@app.websocket("/conversation")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Create voice components
    voice_handler = VoiceHandler()
    transcriber = voice_handler.create_transcriber(agent_config)
    agent = voice_handler.create_agent(agent_config)
    synthesizer = voice_handler.create_synthesizer(agent_config)
    
    # Create output device
    output_device = WebsocketOutputDevice(
        ws=websocket,
        sampling_rate=16000,
        audio_encoding=AudioEncoding.LINEAR16
    )
    
    # Create conversation orchestrator
    conversation = StreamingConversation(
        output_device=output_device,
        transcriber=transcriber,
        agent=agent,
        synthesizer=synthesizer
    )
    
    # Start all workers
    await conversation.start()
    
    try:
        # Receive audio from client
        async for message in websocket.iter_bytes():
            conversation.receive_audio(message)
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    finally:
        await conversation.terminate()
```


## ### 3. Test Interrupts

```

## Implementation Workflow

When implementing a voice AI engine:

1. **Start with Base Workers**: Implement the base worker pattern first
2. **Add Transcriber**: Choose a provider and implement streaming transcription
3. **Add Agent**: Implement LLM integration with streaming responses
4. **Add Synthesizer**: Implement TTS with audio streaming
5. **Connect Pipeline**: Wire all workers together with queues
6. **Add Interrupts**: Implement the interrupt system
7. **Add WebSocket**: Create WebSocket endpoint for client communication
8. **Test Components**: Unit test each worker in isolation
9. **Test Integration**: Test the full pipeline end-to-end
10. **Add Error Handling**: Implement robust error handling and logging
11. **Optimize**: Add rate limiting, monitoring, and performance optimizations

## Related Skills

- `@websocket-patterns` - For WebSocket implementation details
- `@async-python` - For asyncio and async patterns
- `@streaming-apis` - For streaming API integration
- `@audio-processing` - For audio format conversion and processing
- `@systematic-debugging` - For debugging complex async pipelines

## Resources

**Libraries**:
- `asyncio` - Async programming
- `websockets` - WebSocket client/server
- `FastAPI` - WebSocket server framework
- `pydub` - Audio manipulation
- `numpy` - Audio data processing

**API Providers**:
- Transcription: Deepgram, AssemblyAI, Azure Speech, Google Cloud Speech
- LLM: OpenAI, Google Gemini, Anthropic Claude
- TTS: ElevenLabs, Azure TTS, Google Cloud TTS, Amazon Polly, Play.ht

## Summary

Building a voice AI engine requires:
- ✅ Async worker pipeline for concurrent processing
- ✅ Queue-based communication between components
- ✅ Streaming at every stage (transcription, LLM, synthesis)
- ✅ Interrupt system for natural conversations
- ✅ Rate limiting for real-time audio playback
- ✅ Multi-provider support for flexibility
- ✅ Proper error handling and graceful shutdown

**The key insight**: Everything must stream and everything must be interruptible for natural, real-time conversations.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


