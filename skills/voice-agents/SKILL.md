---
name: voice-agents
description: Voice agents represent the frontier of AI interaction - humans. Use when the task involves voice agents.
  speaking naturally with AI systems.
risk: safe
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Voice Agents

Voice agents represent the frontier of AI interaction - humans speaking
naturally with AI systems. The challenge isn't just speech recognition
and synthesis, it's achieving natural conversation flow with sub-800ms
latency while handling interruptions, background noise, and emotional
nuance.

This skill covers two architectures: speech-to-speech (OpenAI Realtime API,
lowest latency, most natural) and pipeline (STT→LLM→TTS, more control,
easier to debug). Key insight: latency is the constraint. Humans expect
responses in 500ms. Every millisecond matters.

84% of organizations are increasing voice AI budgets in 2025. This is the
year voice agents go mainstream.

## Principles

- Latency is the constraint - target <800ms end-to-end
- Jitter (variance) matters as much as absolute latency
- VAD quality determines conversation flow
- Interruption handling makes or breaks the experience
- Start with focused MVP, iterate based on real conversations
- Combine best-in-class components (Deepgram STT + ElevenLabs TTS)

## Capabilities

- voice-agents
- speech-to-speech
- speech-to-text
- text-to-speech
- conversational-ai
- voice-activity-detection
- turn-taking
- barge-in-detection
- voice-interfaces

## Scope

- phone-system-integration → backend
- audio-processing-dsp → audio-specialist
- music-generation → audio-specialist
- accessibility-compliance → accessibility-specialist

## Tooling

### Speech_to_speech

- OpenAI Realtime API - When: Lowest latency, most natural conversation Note: gpt-4o-realtime-preview, native voice, sub-500ms
- Pipecat - When: Open-source voice orchestration Note: Daily-backed, enterprise-grade, modular

### Speech_to_text

- OpenAI Whisper - When: Highest accuracy, multilingual Note: gpt-4o-transcribe for best results
- Deepgram Nova-3 - When: Production workloads, 54% lower WER Note: 150-184ms TTFT, 90%+ accuracy on noisy audio
- AssemblyAI - When: Real-time streaming, speaker diarization Note: Good accuracy-latency balance

### Text_to_speech

- ElevenLabs - When: Most natural voice, emotional control Note: Flash model 75ms latency, V3 for expression
- OpenAI TTS - When: Integrated with OpenAI stack Note: gpt-4o-mini-tts, 13 voices, streaming
- Deepgram Aura-2 - When: Cost-effective production TTS Note: 40% cheaper than ElevenLabs, 184ms TTFB

### Frameworks

- Pipecat - When: Open-source voice agent orchestration Note: Silero VAD, SmartTurn, interruption handling
- Vapi - When: Managed voice agent platform Note: No infrastructure management
- Retell AI - When: Low-latency voice agents Note: Best context preservation on interruption

## Patterns

### Speech-to-Speech Architecture

Direct audio-to-audio processing for lowest latency

**When to use**: Maximum naturalness, emotional preservation, real-time conversation

# SPEECH-TO-SPEECH ARCHITECTURE:

"""
[User Audio] → [S2S Model] → [Agent Audio]

Advantages:
- Lowest latency (sub-500ms)
- Preserves emotion, emphasis, accents
- Most natural conversation flow

Disadvantages:
- Less control over responses
- Harder to debug/audit
- Can't easily modify what's said
"""

## OpenAI Realtime API
"""
import { RealtimeClient } from '@openai/realtime-api-beta';

const client = new RealtimeClient({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure for voice conversation
client.updateSession({
  modalities: ['text', 'audio'],
  voice: 'alloy',
  input_audio_format: 'pcm16',
  output_audio_format: 'pcm16',
  instructions: `You are a helpful customer service agent.
    Be concise and friendly. If you don't know something,
    say so rather than making things up.`,
  turn_detection: {
    type: 'server_vad',  // or 'semantic_vad'
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
  },
});

// Handle audio streams
client.on('conversation.item.input_audio_transcription', (event) => {
  console.log('User said:', event.transcript);
});

client.on('response.audio.delta', (event) => {
  // Stream audio to speaker
  audioPlayer.write(Buffer.from(event.delta, 'base64'));
});

// Send user audio
client.appendInputAudio(audioBuffer);
"""

### Use Cases:
- Real-time customer support
- Voice assistants
- Interactive voice response (IVR)
- Live language translation

### Pipeline Architecture

Separate STT → LLM → TTS for maximum control

**When to use**: Need to know/control exactly what's said, debugging, compliance

# PIPELINE ARCHITECTURE:

"""
[Audio] → [STT] → [Text] → [LLM] → [Text] → [TTS] → [Audio]

Advantages:
- Full control at each step
- Can log/audit all text
- Easier to debug
- Mix best-in-class components

Disadvantages:
- Higher latency (700-1200ms typical)
- Loses some emotion/nuance
- More components to manage
"""

## Production Pipeline Example
"""
import { Deepgram } from '@deepgram/sdk';
import { ElevenLabsClient } from 'elevenlabs';
import OpenAI from 'openai';

// Initialize clients
const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);
const elevenlabs = new ElevenLabsClient();
const openai = new OpenAI();

async function processVoiceInput(audioStream) {
  // 1. Speech-to-Text (Deepgram Nova-3)
  const transcription = await deepgram.transcription.live({
    model: 'nova-3',
    punctuate: true,
    endpointing: 300,  // ms of silence before end
  });

  transcription.on('transcript', async (data) => {
    if (data.is_final && data.speech_final) {
      const userText = data.channel.alternatives[0].transcript;
      console.log('User:', userText);

      // 2. LLM Processing
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a concise voice assistant.' },
          { role: 'user', content: userText }
        ],
        max_tokens: 150,  // Keep responses short for voice
      });

      const agentText = completion.choices[0].message.content;
      console.log('Agent:', agentText);

      // 3. Text-to-Speech (ElevenLabs)
      const audioStream = await elevenlabs.textToSpeech.stream({
        voice_id: 'voice_id_here',
        text: agentText,
        model_id: 'eleven_flash_v2_5',  // Lowest latency
      });

      // Stream to user
      playAudioStream(audioStream);
    }
  });

  // Pipe audio to transcription
  audioStream.pipe(transcription);
}
"""

### Optimization Tips:
- Start TTS while LLM still generating (streaming)
- Pre-compute first response segment during user speech
- Use Flash/turbo models for latency

### Voice Activity Detection Pattern

Detect when user starts/stops speaking

**When to use**: All voice agents need VAD for turn-taking

# VOICE ACTIVITY DETECTION (VAD):

"""
VAD Types:
1. Energy-based: Simple, fast, noise-sensitive
2. Model-based: Silero VAD, more accurate
3. Semantic VAD: Understands meaning, best for conversation
"""

## Silero VAD (Popular Open Source)
"""
import { SileroVAD } from '@pipecat-ai/silero-vad';

const vad = new SileroVAD({
  threshold: 0.5,           // Speech probability threshold
  min_speech_duration: 250, // ms before speech confirmed
  min_silence_duration: 500, // ms of silence = end of turn
});

vad.on('speech_start', () => {
  console.log('User started speaking');
  // Stop any playing TTS (barge-in)
  audioPlayer.stop();
});

vad.on('speech_end', () => {
  console.log('User finished speaking');
  // Trigger response generation
  processTranscript();
});

// Feed audio to VAD
audioStream.on('data', (chunk) => {
  vad.process(chunk);
});
"""

## OpenAI Semantic VAD
"""
// In Realtime API session config
client.updateSession({
  turn_detection: {
    type: 'semantic_vad',  // Uses meaning, not just silence
    // Model waits longer after "ummm..."
    // Responds faster after "Yes, that's correct."
  },
});
"""

## Barge-In Handling
"""
// When user interrupts:
function handleBargeIn() {
  // 1. Stop TTS immediately
  audioPlayer.stop();

  // 2. Cancel pending LLM generation
  llmController.abort();

  // 3. Reset state
  conversationState.checkpoint();

  // 4. Listen to new input
  startListening();
}

// VAD triggers barge-in
vad.on('speech_start', () => {
  if (audioPlayer.isPlaying) {
    handleBargeIn();
  }
});
"""

### Latency Optimization Pattern

Achieving <800ms end-to-end response time

**When to use**: Production voice agents

# LATENCY OPTIMIZATION:

"""
Target Metrics:
- End-to-end: <800ms (ideal: <500ms)
- Time-to-First-Token (TTFT): <300ms
- Barge-in response: <200ms
- Jitter variance: <100ms std dev
"""

## Pipeline Latency Breakdown
"""
Typical breakdown:
- VAD processing: 50-100ms
- STT first result: 150-200ms
- LLM TTFT: 100-300ms
- TTS TTFA: 75-200ms
- Audio buffering: 50-100ms

Total: 425-900ms
"""

## Optimization Strategies

### 1. Streaming Everything
"""
// Stream STT results as they come
stt.on('partial_transcript', (text) => {
  // Start processing before final transcript
  llmPreprocessor.prepare(text);
});

// Stream LLM output to TTS
const llmStream = await openai.chat.completions.create({
  stream: true,
  // ...
});

for await (const chunk of llmStream) {
  tts.appendText(chunk.choices[0].delta.content);
}
"""

### 2. Pre-computation
"""
// While user is speaking, predict and prepare
stt.on('partial_transcript', async (text) => {
  // Pre-fetch relevant context
  const context = await retrieveContext(text);

  // Pre-compute likely first sentence
  const firstSentence = await generateOpener(context);
});
"""

### 3. Use Low-Latency Models
"""
// STT: Deepgram Nova-3 (150ms TTFT)
// LLM: gpt-4o-mini (fastest GPT-4 class)
// TTS: ElevenLabs Flash (75ms) or Deepgram Aura-2 (184ms)
"""

### 4. Edge Deployment
"""
// Run inference closer to user
// - Cloud regions near user
// - Edge computing for VAD/STT
// - WebSocket over HTTP for lower overhead
"""

### Conversation Design Pattern

Designing natural voice conversations

**When to use**: Building voice UX

# CONVERSATION DESIGN:

## Voice-First Principles
"""
Voice is different from text:
- No undo button - say it right the first time
- Linear - user can't scroll back
- Ephemeral - easy to miss information
- Emotional - tone matters as much as words
"""

## Response Design
"""
# Keep responses short (10-20 seconds max)
# Front-load the answer
# Use signposting for lists

Bad: "I found several options. The first is... second is..."
Good: "I found 3 options. Want me to go through them?"

# Confirm understanding
Bad: "I'll transfer $500 to John."
Good: "So that's $500 to John Smith. Should I proceed?"
"""

## Prompting for Voice
"""
system_prompt = '''
You are a voice assistant. Follow these rules:

1. Be concise - keep responses under 30 words
2. Use natural speech - contractions, casual language
3. Never use formatting (bullets, numbers in lists)
4. Spell out numbers and abbreviations
5. End with a question to keep conversation flowing
6. If unclear, ask for clarification
7. Never say "I'm an AI" unless asked

Good: "Got it. I'll set that reminder for three pm. Anything else?"
Bad: "I have set a reminder for 3:00 PM. Is there anything else I can assist you with today?"
'''
"""

## Error Recovery
"""
// Handle recognition errors gracefully
const errorResponses = {
  no_speech: "I didn't catch that. Could you say it again?",
  unclear: "Sorry, I'm not sure I understood. You said [repeat]. Is that right?",
  timeout: "Still there? I'm here when you're ready.",
};

// Always offer human fallback for complex issues
if (confidenceScore < 0.6) {
  response = "I want to make sure I get this right. Would you like to speak with a human agent?";
}
"""

## Sharp Edges

### Response Latency Exceeds 800ms

Severity: CRITICAL

Situation: Building a voice agent pipeline

Symptoms:
Conversations feel awkward. Users repeat themselves. "Are you
there?" questions. Users hang up or give up. Low satisfaction
scores despite correct answers.

Why this breaks:
In human conversation, responses typically arrive within 500ms.
Anything over 800ms feels like the agent is slow or confused.
Users lose confidence and patience. Every component adds latency:
VAD (100ms) + STT (200ms) + LLM (300ms) + TTS (200ms) = 800ms.

Recommended fix:

# Measure and budget latency for each component:

### Target latencies:
- VAD processing: <100ms
- STT time-to-first-token: <200ms
- LLM time-to-first-token: <300ms
- TTS time-to-first-audio: <150ms
- Total end-to-end: <800ms

### Optimization strategies:

1. Use low-latency models:
   - STT: Deepgram Nova-3 (150ms) vs Whisper (500ms+)
   - TTS: ElevenLabs Flash (75ms) vs standard (200ms+)
   - LLM: gpt-4o-mini streaming

2. Stream everything:


> See [references/details.md](references/details.md) for extended content.
