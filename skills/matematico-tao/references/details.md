# Matematico Tao — Code Reference

## ## 5. Teoria Das Categorias Para Arquitetura

```

---

## Passo 1: Síntese Topológica

Antes de qualquer detalhe, construir o mapa de alto nível:
- Grafo de dependências (DGraph)
- Invariantes do sistema
- Fronteiras de abstração (interfaces formais)
- Fluxos de informação (setas de dados)

## Passo 2: Análise Multi-Escala

Analisar em 5 escalas simultâneas:
1. **Micro**: linha a linha — tipos, null safety, recursos
2. **Função**: complexidade, pré/pós-condições, side effects
3. **Módulo**: coesão, acoplamento, interfaces
4. **Sistema**: arquitetura, fluxos, estado global
5. **Meta**: corretude das abstrações, evoluibilidade, manutenibilidade

## Passo 3: Prova Por Contradição (Busca De Bugs)

Para cada invariante identificado, tentar **refutá-lo**:
- Existe estado inicial que viola a pré-condição?
- Existe sequência de eventos que quebra o invariante?
- Existe condição de contorno onde a pós-condição falha?
- Existe interleaving de threads que cria inconsistência?

## Passo 4: Síntese E Recomendações

Ordenar por impacto × probabilidade × corrigibilidade:
- Score = (Severidade: 1-10) × (P(ocorrência): 0-1) / (Custo de correção: 1-10)
- Priorizar os top-3 com maior score

## Passo 5: Prova Construtiva

Para cada recomendação, fornecer:
- Argumento matemático de por que é correto
- Contra-exemplo do estado atual (se aplicável)
- Código concreto da solução
- Invariantes que a solução preserva

---

## Análise Específica Do Projeto Auri/Earllm

Leia `references/auri-analysis.md` para o contexto completo do projeto.

## Módulos Críticos Para Análise Matemática

**Voice Pipeline** (`VoicePipeline.kt`):
```


## ## Relatório De Análise Matemática

```

### 1. Estrutura Formal

[Definição matemática do componente]

### 2. Invariantes Identificados

1. INV-01: [invariante em notação matemática ou pseudocódigo formal]
2. INV-02: ...

### 3. Propriedades Verificadas

✅ [Propriedade que foi verificada como correta + argumento]
⚠️  [Propriedade suspeita + evidência]
❌ [Violação encontrada + contra-exemplo]

### 4. Análise De Complexidade

- Tempo: O(?) com argumento
- Espaço: O(?) com argumento
- Caso médio: Θ(?) com análise probabilística se relevante

### 5. Riscos Matemáticos Prioritizados

| Rank | Risco | Severidade | P(ocorrência) | Score |
|------|-------|-----------|--------------|-------|
| 1 | ... | 9/10 | 0.8 | 7.2 |

### 6. Recomendações Provadas

#### R-01: [Título]
**Argumento**: [Por que matematicamente esta mudança é correta]
**Implementação**:
```kotlin


## ## Escopos De Coroutine Como Autômatos De Ciclo De Vida

```
viewModelScope: Ciclo = onCreate → onCleared()
  - Sobrevive a rotações de tela (Configuration Changes)
  - Cancela apenas quando ViewModel é destruído (backstack pop, finish())
  - Usado para: operações de dados, observação de StateFlow

lifecycleScope: Ciclo = onCreate → onDestroy()
  - Cancela em qualquer destruição, incluindo rotações
  - Menos útil que repeatOnLifecycle para maioria dos casos

repeatOnLifecycle(State.STARTED): Ciclo = onStart → onStop (cicla!)
  - O padrão moderno correto para coletar Flows na UI
  - A cada onStop, cancela o collect; a cada onStart, reinicia
  - Evita processamento de updates quando app está em background

Invariante crítico para Auri VoicePipeline:
observeSttResults() usa viewModelScope → collect() continua em background
Correto para voice assistant (queries LLM mesmo em background)
Mas: STT callbacks chegam mesmo com UI destruída → UI updates tentam
atualizar Compose que não existe mais → crash potencial se não há guarda

Verificar: toda emissão para _state (StateFlow de UI) deve verificar
se há collector ativo, OU usar repeatOnLifecycle na UI
```


## ## Semântica Formal De Buffer

```
StateFlow<T>:
  - Buffer = 1 (apenas último valor)
  - Replay = 1 (novo subscriber recebe último valor imediatamente)
  - Fusão: emissões rápidas são fundidas — estados intermediários PERDIDOS
  - Invariante: _state.value sempre reflete o estado ATUAL

SharedFlow<T>(replay=0, extraBufferCapacity=N):
  - Buffer = N (configurgável)
  - Replay = configurgável (0 = sem replay para novos subscribers)
  - Sem fusão: cada emissão distinta é entregue (se buffer não transborda)
  - Uso: eventos one-shot (erros, navegação, toasts)

Channel<T>(BUFFERED):
  - Produção-consumo: cada item entregue exatamente uma vez
  - Sem replay
  - Hot: produção pode bloquear se buffer cheio
  - Uso: comunicação ponto-a-ponto entre coroutines

Decisão matemática para cada caso em Auri:
pipelineState         → StateFlow ✅ (UI quer estado atual, não histórico)
erros para toast      → SharedFlow(extraBufferCapacity=10) ✅ (one-shot events)
audio PCM chunks      → Channel(BUFFERED) ✅ (stream point-to-point)
sttResult            → StateFlow ✅ (UI quer resultado atual)
```


## ## Otimizações Para Reduzir Rci

```kotlin
// PADRÃO 1: derivedStateOf — só recompõe se resultado muda
val isRecording by remember {
    derivedStateOf { pipelineState.value.stage == RECORDING }
}

// PADRÃO 2: dividir em sub-composables menores
@Composable fun DiagnosticsScreen(...) {
    Column {
        SttDiagnostics(sttState)      // recompõe só quando sttState muda
        BtDiagnostics(btState)        // recompõe só quando btState muda
        LlmDiagnostics(llmState)      // recompõe só quando llmState muda
    }
}

// PADRÃO 3: key() para forçar identidade estável
LazyColumn {
    items(items = tools, key = { it.id }) { tool ->
        ToolCard(tool)  // apenas o item com id mudado recompõe
    }
}
```


## ## Taxonomia De Segurança De Intents

```
Intent I = (action?, componentName?, data?, extras, flags)

Segurança formal:
- Explicit Intent: componentName ≠ null
  → Entregue exatamente ao componente especificado
  → Seguro: só aquele app recebe

- Implicit Intent: componentName = null, action ≠ null
  → Sistema resolve para apps com intent-filter matching
  → INSEGURO se múltiplos apps podem responder
  → Risco: app malicioso declara intent-filter → intercepta

Análise AuriToolExecutor:
makePhoneCall()  → ACTION_CALL (implicit) → qualquer app pode interceptar
setAlarm()       → ACTION_SET_ALARM (implicit) → qualquer app de alarme
sendEmail()      → GmailClient direto (API) → não usa Intent → SEGURO
sendWhatsApp()   → URL scheme "https://wa.me/" → qualquer browser intercepta
                   EXCETO quando usa ACTION_SEND + setPackage("com.whatsapp") → SEGURO

Risco de Intent Hijacking para chamada telefônica:
P(interceptado | app malicioso instalado) = 1.0 (se app registrou ACTION_CALL)
P(app malicioso instalado) = baixo em dispositivos normais, mas não zero
Mitigação: verificar intent.resolveActivity() antes de lançar, ou usar
ACTION_DIAL (mais seguro: exige confirmação do usuário)
```


## ## Modelo De Custo Como Random Walk

```
Seja C_n = custo acumulado após n chamadas LLM (em USD)
C_n = Σ(i=1..n) X_i

Onde X_i = custo da i-ésima chamada:
X_i = (input_tokens_i × price_input + output_tokens_i × price_output) / 1000

Para gpt-4o (2025): price_input=$0.0025/1K, price_output=$0.010/1K
X_i típico: 200 input tokens + 150 output tokens ≈ $0.0005 + $0.0015 = $0.002

E[C_n] = n × E[X_i] = n × $0.002
Var[C_n] = n × Var[X_i]

Risco de ruína: P(C_n > L) → 1 para n → ∞ (crescimento inevitável)

Concentração de Chebyshev:
P(|C_n - E[C_n]| > k×sqrt(Var[C_n])) ≤ 1/k²

Para n=100 chamadas: E[C_100] ≈ $0.20, P(> $0.50) < 10% (k≈3)
Para n=1000 chamadas: E[C_1000] ≈ $2.00, P(> $5.00) < 10%
```


## ## Crescimento De Contexto — Ponto De Ruptura

```

---

## Referências Técnicas

Para análise detalhada, consulte:
- `references/auri-analysis.md` — Contexto completo do projeto Auri (invariantes, estados, riscos)
- `references/complexity-patterns.md` — Padrões de complexidade em Android: CC, cognitiva, acoplamento
- `references/concurrency-models.md` — CSP, Actor Model, JMM, deadlocks, race conditions Kotlin
- `references/information-theory.md` — Entropia de Shannon, Kolmogorov, teoria de filas, backpressure
- `scripts/complexity_analyzer.py` — Análise automática CC + acoplamento (run: `python complexity_analyzer.py C:/project`)
- `scripts/dependency_graph.py` — Grafo de dependências: ciclos, betweenness, PageRank (run: `python dependency_graph.py C:/project`)

---

## Quando Acionado, Prof. Euler Sempre:

1. **Pergunta antes de assumir** — "Qual aspecto você quer analisar mais profundamente?"
2. **Mostra o trabalho matemático** — não apenas conclusões, mas o raciocínio formal
3. **Dá exemplos concretos** — cada abstração matemática tem um exemplo em código real
4. **Prioriza por impacto** — não lista 50 problemas, mas os 3-5 mais críticos com scores
5. **Oferece múltiplas perspectivas** — o mesmo problema visto por teoria dos grafos, teoria da informação, e teoria dos tipos
6. **É honesto sobre incerteza** — "com os dados disponíveis, há 70% de probabilidade de que..."
7. **Propõe experimentos** — "para confirmar esta hipótese, execute: [comando/teste específico]"

## Quando Não Tem Informação Suficiente:

- Solicitar arquivos específicos para análise
- Listar exatamente quais informações precisaria
- Dar análise parcial com as informações disponíveis + hipóteses explícitas

## Tom E Estilo:

- Rigoroso mas acessível — explica matemática complexa com analogias concretas
- Confiante mas humilde — mostra incerteza quando existe
- Construtivo — cada problema tem solução proposta
- Preciso — usa notação matemática quando clarifica, linguagem natural quando suficiente

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `007` - Complementary skill for enhanced analysis
- `claude-code-expert` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


