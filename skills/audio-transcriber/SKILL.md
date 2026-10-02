---
name: audio-transcriber
description: Transform audio recordings into professional Markdown documentation with intelligent summaries using LLM integration. Use when the task involves audio transcriber.
category: content
risk: safe
source: community
tags: "[audio, transcription, whisper, meeting-minutes, speech-to-text]"
date_added: "2026-02-27"
---

## Purpose

This skill automates audio-to-text transcription with professional Markdown output, extracting rich technical metadata (speakers, timestamps, language, file size, duration) and generating structured meeting minutes and executive summaries. It uses Faster-Whisper or Whisper with zero configuration, working universally across projects without hardcoded paths or API keys.

Inspired by tools like Plaud, this skill transforms raw audio recordings into actionable documentation, making it ideal for meetings, interviews, lectures, and content analysis.

## When to Use
Invoke this skill when:

- User needs to transcribe audio/video files to text
- User wants meeting minutes automatically generated from recordings
- User requires speaker identification (diarization) in conversations
- User needs subtitles/captions (SRT, VTT formats)
- User wants executive summaries of long audio content
- User asks variations of "transcribe this audio", "convert audio to text", "generate meeting notes from recording"
- User has audio files in common formats (MP3, WAV, M4A, OGG, FLAC, WEBM)

## Workflow

### Step 0: Discovery (Auto-detect Transcription Tools)

**Objective:** Identify available transcription engines without user configuration.

**Actions:**

Run detection commands to find installed tools:

> See [references/details.md](references/details.md) for full code examples.

**If no transcriber found:**

Offer automatic installation using the provided script:


This ensures users can install dependencies with one confirmation, or opt for manual installation if preferred.

**If transcriber found:**

Proceed to Step 0b (CLI Detection).


### Step 1: Validate Audio File

**Objective:** Verify file exists, check format, and extract metadata.

**Actions:**

1. **Accept file path or URL** from user:
   - Local file: `meeting.mp3`
   - URL: `https://example.com/audio.mp3` (download to temp directory)

2. **Verify file exists:**

```bash
if [[ ! -f "$AUDIO_FILE" ]]; then
    echo "❌ File not found: $AUDIO_FILE"
    exit 1
fi
```

3. **Extract metadata** using ffprobe or file utilities:

```bash
# Get file size
FILE_SIZE=$(du -h "$AUDIO_FILE" | cut -f1)

# Get duration and format using ffprobe
DURATION=$(ffprobe -v error -show_entries format=duration \
    -of default=noprint_wrappers=1:nokey=1 "$AUDIO_FILE" 2>/dev/null)
FORMAT=$(ffprobe -v error -select_streams a:0 -show_entries \
    stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$AUDIO_FILE" 2>/dev/null)

# Convert duration to HH:MM:SS
DURATION_HMS=$(date -u -r "$DURATION" +%H:%M:%S 2>/dev/null || echo "Unknown")
```

4. **Check file size** (warn if large for cloud APIs):

```bash
SIZE_MB=$(du -m "$AUDIO_FILE" | cut -f1)
if [[ $SIZE_MB -gt 25 ]]; then
    echo "⚠️  Large file ($FILE_SIZE) - processing may take several minutes"
fi
```

5. **Validate format** (supported: MP3, WAV, M4A, OGG, FLAC, WEBM):

```bash
EXTENSION="${AUDIO_FILE##*.}"
SUPPORTED_FORMATS=("mp3" "wav" "m4a" "ogg" "flac" "webm" "mp4")

if [[ ! " ${SUPPORTED_FORMATS[@]} " =~ " ${EXTENSION,,} " ]]; then
    echo "⚠️  Unsupported format: $EXTENSION"
    if command -v ffmpeg &>/dev/null; then
        echo "🔄 Converting to WAV..."
        ffmpeg -i "$AUDIO_FILE" -ar 16000 "${AUDIO_FILE%.*}.wav" -y
        AUDIO_FILE="${AUDIO_FILE%.*}.wav"
    else
        echo "❌ Install ffmpeg to convert formats: brew install ffmpeg"
        exit 1
    fi
fi
```


### Step 3: Generate Markdown Output

**Objective:** Create structured Markdown with metadata, transcription, meeting minutes, and summary.

**Output Template:**

> See [references/details.md](references/details.md) for full code examples.

**Implementation:**

Use Python or bash with AI model (Claude/GPT) for intelligent summarization:


**Output file naming:**

```bash
# v1.1.0: Use timestamp para evitar sobrescrever
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TRANSCRIPT_FILE="transcript-${TIMESTAMP}.md"
ATA_FILE="ata-${TIMESTAMP}.md"

echo "$TRANSCRIPT_CONTENT" > "$TRANSCRIPT_FILE"
echo "✅ Transcript salvo: $TRANSCRIPT_FILE"

if [[ -n "$ATA_CONTENT" ]]; then
    echo "$ATA_CONTENT" > "$ATA_FILE"
    echo "✅ Ata salva: $ATA_FILE"
fi
```


#### **SCENARIO A: User Provided Custom Prompt**

**Workflow:**

1. **Display user's prompt:**
   ```
   📝 Prompt fornecido pelo usuário:
   ┌──────────────────────────────────┐
   │ [User's prompt preview]          │
   └──────────────────────────────────┘
   ```

2. **Automatically improve with prompt-engineer (if available):**
   ```bash
   🔧 Melhorando prompt com prompt-engineer...
   [Invokes: gh copilot -p "melhore este prompt: {user_prompt}"]
   ```

3. **Show both versions:**
   ```
   ✨ Versão melhorada:
   ┌──────────────────────────────────┐
   │ Role: Você é um documentador...  │
   │ Instructions: Transforme...      │
   │ Steps: 1) ... 2) ...             │
   │ End Goal: ...                    │
   └──────────────────────────────────┘

   📝 Versão original:
   ┌──────────────────────────────────┐
   │ [User's original prompt]         │
   └──────────────────────────────────┘
   ```

4. **Ask which to use:**
   ```bash
   💡 Usar versão melhorada? [s/n] (default: s):
   ```

5. **Process with selected prompt:**
   - If "s": use improved
   - If "n": use original


#### **LLM Processing (Both Scenarios)**

Once prompt is finalized:

> See [references/details.md](references/details.md) for full code examples.

**Progress output:**
```
🤖 Processando com claude... ⠋
[After completion:]
✅ Ata gerada com sucesso!
```


#### **Final Output**

**Success (both files):**
```bash
💾 Salvando arquivos...

✅ Arquivos criados:
  - transcript-20260203-023045.md  (transcript puro)
  - ata-20260203-023045.md         (processado com LLM)

🧹 Removidos arquivos temporários: metadata.json, transcription.json

✅ Concluído! Tempo total: 3m 45s
```

**Transcript only (user declined LLM):**
```bash
💾 Salvando arquivos...

✅ Arquivo criado:
  - transcript-20260203-023045.md

ℹ️  Ata não gerada (processamento LLM recusado pelo usuário)

🧹 Removidos arquivos temporários: metadata.json, transcription.json

✅ Concluído!
```


### Step 5: Display Results Summary

**Objective:** Show completion status and next steps.

**Output:**

> See [references/details.md](references/details.md) for full code examples.


## Example Usage

### **Example 1: Basic Transcription**

**User Input:**
```bash
copilot> transcribe audio to markdown: meeting-2026-02-02.mp3
```

**Skill Output:**

> See [references/details.md](references/details.md) for full code examples.


### **Example 3: Batch Processing**

**User Input:**
```bash
copilot> transcreva estes áudios: recordings/*.mp3
```

**Skill Output:**

> See [references/details.md](references/details.md) for full code examples.


### **Example 5: Large File Warning**

**User Input:**
```bash
copilot> transcribe audio to markdown: conference-keynote.mp3
```

**Skill Output:**

```bash
✅ Faster-Whisper detected (optimized)

📂 File: conference-keynote.mp3
📊 Size: 87.2 MB
⏱️  Duration: 02:15:47
⚠️  Large file (87.2 MB) - processing may take several minutes

Continue? [Y/n]:
```

**User:** `Y`

```bash
🎙️  Processing... (this may take 10-15 minutes)
[████░░░░░░░░░░░░░░░░] 20% - Estimated time remaining: 12m
```


This skill is **platform-agnostic** and works in any terminal context where GitHub Copilot CLI is available. It does not depend on specific project configurations or external APIs, following the zero-configuration philosophy.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
