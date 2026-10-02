# Transformers Js — Code Reference

## ### Browsing the Hugging Face Hub

```

**Filter by task** using the `pipeline_tag` parameter:

| Task | URL |
|------|-----|
| **Text Generation** | https://huggingface.co/models?pipeline_tag=text-generation&library=transformers.js&sort=trending |
| **Text Classification** | https://huggingface.co/models?pipeline_tag=text-classification&library=transformers.js&sort=trending |
| **Translation** | https://huggingface.co/models?pipeline_tag=translation&library=transformers.js&sort=trending |
| **Summarization** | https://huggingface.co/models?pipeline_tag=summarization&library=transformers.js&sort=trending |
| **Question Answering** | https://huggingface.co/models?pipeline_tag=question-answering&library=transformers.js&sort=trending |
| **Image Classification** | https://huggingface.co/models?pipeline_tag=image-classification&library=transformers.js&sort=trending |
| **Object Detection** | https://huggingface.co/models?pipeline_tag=object-detection&library=transformers.js&sort=trending |
| **Image Segmentation** | https://huggingface.co/models?pipeline_tag=image-segmentation&library=transformers.js&sort=trending |
| **Speech Recognition** | https://huggingface.co/models?pipeline_tag=automatic-speech-recognition&library=transformers.js&sort=trending |
| **Audio Classification** | https://huggingface.co/models?pipeline_tag=audio-classification&library=transformers.js&sort=trending |
| **Image-to-Text** | https://huggingface.co/models?pipeline_tag=image-to-text&library=transformers.js&sort=trending |
| **Feature Extraction** | https://huggingface.co/models?pipeline_tag=feature-extraction&library=transformers.js&sort=trending |
| **Zero-Shot Classification** | https://huggingface.co/models?pipeline_tag=zero-shot-classification&library=transformers.js&sort=trending |

**Sort options:**
- `&sort=trending` - Most popular recently
- `&sort=downloads` - Most downloaded overall
- `&sort=likes` - Most liked by community
- `&sort=modified` - Recently updated

### Choosing the Right Model

Consider these factors when selecting a model:

**1. Model Size**
- **Small (< 100MB)**: Fast, suitable for browsers, limited accuracy
- **Medium (100MB - 500MB)**: Balanced performance, good for most use cases
- **Large (> 500MB)**: High accuracy, slower, better for Node.js or powerful devices

**2. Quantization**
Models are often available in different quantization levels:
- `fp32` - Full precision (largest, most accurate)
- `fp16` - Half precision (smaller, still accurate)
- `q8` - 8-bit quantized (much smaller, slight accuracy loss)
- `q4` - 4-bit quantized (smallest, noticeable accuracy loss)

**3. Task Compatibility**
Check the model card for:
- Supported tasks (some models support multiple tasks)
- Input/output formats
- Language support (multilingual vs. English-only)
- License restrictions

**4. Performance Metrics**
Model cards typically show:
- Accuracy scores
- Benchmark results
- Inference speed
- Memory requirements

### Example: Finding a Text Generation Model

```javascript


## ### Progress Tracking & Loading Indicators

```javascript
import { pipeline } from '@huggingface/transformers';

// Track progress for each file
const fileProgress = {};

function onProgress(info) {
  console.log(`${info.status}: ${info.file}`);
  
  if (info.status === 'progress') {
    fileProgress[info.file] = info.progress;
    console.log(`${info.file}: ${info.progress.toFixed(1)}%`);
  }
  
  if (info.status === 'done') {
    console.log(`✓ ${info.file} complete`);
  }
}

// Pass callback to pipeline
const classifier = await pipeline('sentiment-analysis', null, {
  progress_callback: onProgress
});
```


## ## Memory Management

```

**When to dispose:**
- Application shutdown or component unmount
- Before loading a different model
- After batch processing in long-running apps

Models consume significant memory and hold GPU/CPU resources. Disposal is critical for browser memory limits and server stability.

For detailed patterns (React cleanup, servers, browser), see **[Code Examples](./references/EXAMPLES.md)**

## Troubleshooting

### Model Not Found
- Verify model exists on Hugging Face Hub
- Check model name spelling
- Ensure model has ONNX files (look for `onnx` folder in model repo)

### Memory Issues
- Use smaller models or quantized versions (`dtype: 'q4'`)
- Reduce batch size
- Limit sequence length with `max_length`

### WebGPU Errors
- Check browser compatibility (Chrome 113+, Edge 113+)
- Try `dtype: 'fp16'` if `fp32` fails
- Fall back to WASM if WebGPU unavailable

## Reference Documentation

### This Skill
- **[Pipeline Options](./references/PIPELINE_OPTIONS.md)** - Configure `pipeline()` with `progress_callback`, `device`, `dtype`, etc.
- **[Configuration Reference](./references/CONFIGURATION.md)** - Global `env` configuration for caching and model loading
- **[Caching Reference](./references/CACHE.md)** - Browser Cache API, Node.js filesystem cache, and custom cache implementations
- **[Text Generation Guide](./references/TEXT_GENERATION.md)** - Streaming, chat format, and generation parameters
- **[Model Architectures](./references/MODEL_ARCHITECTURES.md)** - Supported models and selection tips
- **[Code Examples](./references/EXAMPLES.md)** - Real-world implementations for different runtimes

### Official Transformers.js
- Official docs: https://huggingface.co/docs/transformers.js
- API reference: https://huggingface.co/docs/transformers.js/api/pipelines
- Model hub: https://huggingface.co/models?library=transformers.js
- GitHub: https://github.com/huggingface/transformers.js
- Examples: https://github.com/huggingface/transformers.js/tree/main/examples

## Best Practices

1. **Always Dispose Pipelines**: Call `pipe.dispose()` when done - critical for preventing memory leaks
2. **Start with Pipelines**: Use the pipeline API unless you need fine-grained control
3. **Test Locally First**: Test models with small inputs before deploying
4. **Monitor Model Sizes**: Be aware of model download sizes for web applications
5. **Handle Loading States**: Show progress indicators for better UX
6. **Version Pin**: Pin specific model versions for production stability
7. **Error Boundaries**: Always wrap pipeline calls in try-catch blocks
8. **Progressive Enhancement**: Provide fallbacks for unsupported browsers
9. **Reuse Models**: Load once, use many times - don't recreate pipelines unnecessarily
10. **Graceful Shutdown**: Dispose models on SIGTERM/SIGINT in servers

## Quick Reference: Task IDs

| Task | Task ID |
|------|---------|
| Text classification | `text-classification` or `sentiment-analysis` |
| Token classification | `token-classification` or `ner` |
| Question answering | `question-answering` |
| Fill mask | `fill-mask` |
| Summarization | `summarization` |
| Translation | `translation` |
| Text generation | `text-generation` |
| Text-to-text generation | `text2text-generation` |
| Zero-shot classification | `zero-shot-classification` |
| Image classification | `image-classification` |
| Image segmentation | `image-segmentation` |
| Object detection | `object-detection` |
| Depth estimation | `depth-estimation` |
| Image-to-image | `image-to-image` |
| Zero-shot image classification | `zero-shot-image-classification` |
| Zero-shot object detection | `zero-shot-object-detection` |
| Automatic speech recognition | `automatic-speech-recognition` |
| Audio classification | `audio-classification` |
| Text-to-speech | `text-to-speech` or `text-to-audio` |
| Image-to-text | `image-to-text` |
| Document question answering | `document-question-answering` |
| Feature extraction | `feature-extraction` |
| Sentence similarity | `sentence-similarity` |

---

This skill enables you to integrate state-of-the-art machine learning capabilities directly into JavaScript applications without requiring separate ML servers or Python environments.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


