# Product Inventor — Code Reference

## ### 2.1 Motor 1 — "First Principles Ui"

```
OBJETIVO DO USUARIO
"O que essa pessoa quer realmente?"
(nao o que ela pediu — o que ela precisa)

OBSTACULO PSICOLOGICO
"O que faz ela hesitar, confundir, ou abandonar?"
(cognitivo: too many choices, nao confiar, nao saber o proximo passo)
(emocional: ansiedade, vergonha, preguica, impaciencia)
(tecnico: lento, quebrado, incompativel)

MOMENTO DE DECISAO
"Qual e o ponto critico onde ela decide ficar ou sair?"
(geralmente nos primeiros 30 segundos ou no primeiro obstáculo real)

RECOMPENSA
"O que ela ganha ao completar a acao?"
(imediata: feedback visual/sonoro/haptico)
(acumulada: progresso, status, dados proprios)
(social: reputacao, compartilhamento, pertencimento)

PROXIMO PASSO INEVITAVEL
"Qual acao ela naturalmente vai querer fazer depois?"
(design o fluxo para que esse passo seja a opcao mais facil)
```


## ### 2.3 Motor 3 — "Design System Proprietario"

```
TOKENS FUNDAMENTAIS
├── Colors
│   ├── brand (primary, secondary, accent)
│   ├── neutral (50, 100, 200, ..., 900)
│   ├── semantic (success, warning, error, info)
│   └── surface (background, card, overlay, border)
├── Typography
│   ├── families (display, body, mono)
│   ├── scale (xs, sm, base, lg, xl, 2xl, 3xl, 4xl)
│   ├── weights (regular, medium, semibold, bold)
│   └── line-heights (tight, normal, relaxed)
├── Spacing (4px base: 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48)
├── Radius (none, sm, md, lg, xl, full)
├── Shadows (sm, md, lg, xl — com cor contextual)
└── Motion (durations: fast 150ms, normal 250ms, slow 400ms)
         (easings: ease-out para entrada, ease-in para saida, spring para fisica)

COMPONENTES BASE
├── Button (variant: primary, secondary, ghost, danger | size: sm, md, lg | state: idle, loading, success, disabled)
├── Input (variant: default, filled | state: idle, focus, error, success | tipos: text, search, password)
├── Card (variant: default, interactive, elevated | com header, body, footer opcionais)
├── Modal / Drawer (com overlay, foco trap, escape to close, animacao)
├── Toast / Notification (types: success, warning, error, info | auto-dismiss)
├── Badge / Tag (status, labels, categorias)
├── Avatar (sizes, fallback, group)
├── Tabs (horizontal, vertical, com badge)
├── Select / Combobox (searchable, multi-select, virtualized)
└── DataTable (sort, filter, pagination, row actions, empty state)

ESTADOS OBRIGATORIOS (PARA TUDO)
├── Loading (skeleton screens > spinners; nunca tela em branco)
├── Error (mensagem humana + acao de recuperacao)
├── Empty (zero-state que convida a acao, nao so "sem dados")
└── Success (feedback positivo claro antes de continuar)
```


## ## Etapa C — Blueprint De Interface

```
SITEMAP / ROTAS
├── / (home/dashboard)
├── /[entidade] (lista/grid)
├── /[entidade]/[id] (detalhe)
└── /settings, /onboarding, /auth etc.

COMPONENTES NECESSARIOS
(lista com variantes e estados)

FLUXOS CRITICOS
(passo-a-passo de cada fluxo principal com estado de cada tela)

MICROINTERACOES
(hover states, focus rings, transitions entre telas, loading skeletons)

ANIMACOES
(quais elementos animam, como, quando, por que)

ACESSIBILIDADE
(foco visivel, aria-labels, contraste, keyboard nav, reduced-motion)
```


## ## Etapa D — Implementacao (Pronto Para Producao)

```
src/
├── app/                    # Next.js App Router ou Vite pages
│   ├── layout.tsx
│   ├── page.tsx
│   └── [rota]/page.tsx
├── components/
│   ├── ui/                 # Design system base (atoms)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── features/           # Componentes de dominio (molecules/organisms)
│   │   ├── [feature]/
│   │   └── ...
│   └── layouts/            # Shells, sidebars, headers
├── lib/
│   ├── utils.ts            # cn(), formatters, helpers
│   ├── hooks/              # Custom hooks
│   ├── api/                # TanStack Query hooks / fetch wrappers
│   └── validations/        # Zod schemas
├── styles/
│   ├── globals.css         # Tailwind base + CSS variables (tokens)
│   └── animations.css      # Keyframes customizados
├── types/                  # TypeScript interfaces/types
└── data/                   # Mock data (quando sem backend)
```


## ## Etapa E — Polimento "Apple-Level"

```
TIPOGRAFIA
[ ] Scale clara: 1 fonte display, 1 body, 1 mono (maximo)
[ ] Hierarquia: H1 > H2 > H3 > body > caption — nenhum nivel igual
[ ] Line-height adequado para leitura (1.5-1.7 para body)
[ ] Letter-spacing ajustado em headings grandes (tracking-tight)

ESPACAMENTO
[ ] Breathing room: conteudo nao cola nas bordas (min 16px mobile, 24px desktop)
[ ] Agrupamento: elementos relacionados proximos, grupos distantes entre si
[ ] Consistencia: multiplos de 4px em tudo

INTERATIVIDADE
[ ] Todos os estados: idle, hover, focus, active, disabled, loading
[ ] Focus ring visivel e elegante (nao outline feio padrao)
[ ] Cursor correto (pointer em clicavel, text em texto, grab em arrastaveis)
[ ] Haptico equivalente digital: feedback imediato em toda acao

ANIMACOES
[ ] Entraram suave (ease-out, 200-300ms)
[ ] Saem rapido (ease-in, 150-200ms)
[ ] Sem animacoes longas que atrasam o usuario
[ ] prefers-reduced-motion respeitado

PERFORMANCE
[ ] LCP < 2.5s (Largest Contentful Paint)
[ ] CLS < 0.1 (Cumulative Layout Shift — sem pulos de layout)
[ ] TTI < 3.8s (Time to Interactive)
[ ] Imagens com width/height declarados (evita CLS)
[ ] Fonts com font-display: swap

ESTADOS DE DADOS
[ ] Loading: skeleton screen (nao spinner em tela cheia)
[ ] Error: mensagem humana + botao "Tentar novamente"
[ ] Empty: ilustracao/icone + texto convidativo + CTA primario
[ ] Success: feedback claro antes de continuar o fluxo

ACESSIBILIDADE
[ ] Contraste WCAG AA (4.5:1 texto normal, 3:1 texto grande)
[ ] Toda acao com teclado (Tab, Enter, Escape, Arrow keys)
[ ] aria-label em icones sem texto
[ ] Imagens com alt descritivo
[ ] Forms com label associado (nao placeholder como unico label)
[ ] Role correto em componentes customizados (combobox, dialog, etc.)

MOBILE
[ ] Touch targets minimo 44x44px
[ ] Sem hover states como unica indicacao de estado
[ ] Scroll suave (overscroll-behavior)
[ ] Safe areas (env(safe-area-inset-*) para notch/home i

## 4.1 Stack Base

```


```

## 4.2 Quando Usar Cada Abordagem

**Use shadcn/ui como base quando:**
- Velocidade e prioridade (MVP, prototipo, produto interno)
- Acessibilidade ja resolvida e prioridade critica
- Time vai manter o codigo apos entrega
- Identidade pode ser aplicada via "skin" (cores, radius, fonts customizadas)

**Crie componentes proprios quando:**
- Identidade visual e o diferencial principal do produto
- A Killer Interaction exige comportamento impossivel em shadcn/ui
- O produto e um produto de design (portfolio, agencia, produto SaaS premium)
- A "assinatura" do produto depende de interacoes customizadas

**Regra pratica:** comece com shadcn/ui para componentes genericos (Input, Button, Modal).
Crie proprios para os componentes que carregam a identidade (Card, Navigation, Feature Hero).

## 4.3 Css Variables Como Design Tokens

```css


```

---

## Secao 5: Comandos De Ativacao

| Comando | O que faz |
|---------|-----------|
| `/invent [ideia/produto]` | Cria 3 conceitos novos com nome, por que e novo, killer interaction, flow e riscos. Escolhe 1 e executa |
| `/blueprint [produto/conceito]` | Sitemap, componentes, estados, microinteracoes, acessibilidade |
| `/build [produto/conceito]` | Codigo completo: tokens, componentes, paginas, mocks, validacoes, README |
| `/polish [tela/produto]` | Eleva para Apple-level: tipografia, spacing, animacoes, estados, acessibilidade |
| `/reinvent [tela/produto]` | Recria do zero como produto premium — ignora o que existe, inventa do inicio |
| `/signature [produto]` | Inventa 3 opcoes de Killer Interaction e desenvolve a melhor |
| `/diagnose [produto/descricao]` | Diagnostico brutal: 5 coisas que matam o produto + plano de correcao |
| `/tokens [estilo/mood]` | Gera design tokens completos para um estilo especifico (dark/minimal/vivid/etc) |
| `/component [nome]` | Gera componente completo com todas as variants, estados e animacoes |

**Se nenhum comando for usado:** interprete a descricao do usuario e execute o fluxo
completo (A → B → C → D → E) automaticamente.

---

## Secao 6: Output Padrao (Formato Fixo)

Para qualquer entrega substantiva, use esta estrutura:

```


## ## Checklist De Polimento

```

---

## 7.1 O Que "Apple-Level Polish" Significa Concretamente

**No codigo:**
- Prop types explicitamente nomeados (nao `props: any`)
- Componentes com responsabilidade unica
- Zero magic numbers (tudo via tokens/constantes)
- Comentarios so onde a intencao nao e obviam (nao "incrementa contador")

**No design:**
- Toda tela tem 1 elemento de "respiro" — espaco intencional sem conteudo
- Tipografia com no maximo 3 tamanhos por tela (hierarquia, nao caos)
- Cor como comunicacao (vermelho = perigo, verde = sucesso — nunca decorativo)
- Sombras direcionais (luz vem de cima — sombras vao para baixo/direita)

**Na interacao:**
- Animacoes respondem a intencao (botao de deletar e mais lento que de confirmar)
- Loading nao paralisa — usuario pode navegar enquanto carrega
- Erros sao especificos ("Email ja cadastrado" > "Erro de validacao")
- Sucesso e breve mas claro — nao fica na tela por 10 segundos

## 7.2 Anti-Patterns Que Este Agente Nunca Produz

```


## ## Secao 8: Identidades Visuais — Paletas De Referencia Proprias

```

---

## Secao 9: Regras Operacionais

1. **Sem informacao suficiente?** Assuma defaults inteligentes baseados no contexto e siga.
   Nunca trave esperando clarificacao para algo que pode ser assumido razoavelmente.

2. **Quando o usuario der feedback negativo sobre uma proposta:**
   Nao defenda. Refaca do zero com a critica como constraint.

3. **Codigo gerado deve funcionar.** Nao gere pseudocodigo ou "este seria o padrao".
   Se nao ha backend, use mock data realista.

4. **Componentes isolados e reutilizaveis.** Nunca logica de negocio dentro de componente de UI.

5. **Mobile-first sempre.** Mesmo que o usuario mencione so desktop — o codigo e mobile-first.

6. **Dark mode sempre planejado.** Mesmo se nao implementado, tokens devem suportar.

7. **Performance nao e otimizacao tardia.** Image loading lazy, fonts com display:swap,
   code splitting por rota — sao defaults, nao bonus.

8. **Acessibilidade nao e extra.** E parte do codigo base. Focus, aria, contraste — padrao.

9. **Um produto pode ter MUITAS telas mas POUCAS interacoes.** Identifique as 3 interacoes
   centrais e faca-as perfeitas antes de expandir.

10. **O efeito "inevitavel".** Ao finalizar, a experiencia deve parecer que nunca poderia
    ser de outro jeito. Se parecer que voce so "montou" o produto, refaca.

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `analytics-product` - Complementary skill for enhanced analysis
- `growth-engine` - Complementary skill for enhanced analysis
- `monetization` - Complementary skill for enhanced analysis
- `product-design` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


