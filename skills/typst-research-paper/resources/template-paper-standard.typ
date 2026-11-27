#set page(
  paper: "a4",
  margin: (x: 2cm, top: 2.5cm, bottom: 2.5cm),
  header: align(right)[
    #text(size: 8.5pt, fill: luma(100))[Preprint — Under Review]
  ],
  footer: align(center)[#context counter(page).display()]
)

#set text(
  font: ("Liberation Serif", "Noto Serif"),
  size: 10pt,
  lang: "en"
)

#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.1")
#set math.equation(numbering: "(1)")

// --- Title & Metadata Block ---
#align(center)[
  #v(0.5em)
  #text(size: 17pt, weight: "bold")[Title of the Research Paper: A Systematic Study]
  
  #v(1.2em)
  #grid(
    columns: (1fr, 1fr),
    gutter: 2em,
    align(center)[
      #text(weight: "semibold")[First Author] \
      Department of Computer Science \
      Institution Name \
      #link("mailto:first.author@institution.edu")[first.author\@institution.edu]
    ],
    align(center)[
      #text(weight: "semibold")[Second Author] \
      Institute for Advanced AI \
      Research Lab \
      #link("mailto:second.author@institution.edu")[second.author\@institution.edu]
    ]
  )
  #v(1.5em)
]

// --- Abstract & Keywords ---
#block(
  inset: (x: 1.5cm, y: 0.5cm),
  [
    #set text(size: 9pt)
    #align(center)[#text(weight: "bold")[Abstract]]
    This paper presents a formal investigation into scalable systems. We formalize the problem space, evaluate the underlying performance bounds, and demonstrate empirical speedups of over 40% across standard benchmark suites.
    
    #v(0.5em)
    *Keywords:* Distributed Systems, Performance Optimization, Formal Verification, Typst.
  ]
)

#v(1em)

// --- Body ---
= Introduction <sec:intro>
Writing and publishing research papers requires rigorous formal structure, precision in typesetting, and reproducible workflows.

As demonstrated in @sec:methodology, modern computational workflows demand deterministic performance.

= Related Work <sec:related>
Prior literature has explored algorithmic optimization across distributed clusters @shao2024storm.

= Methodology <sec:methodology>
We define the system state transition function $f(s, a) -> s'$ over the discrete state space $cal(S)$.

$ cal(L)(theta) = - sum_(i=1)^N y_i log(hat(y)_i) + (1 - y_i) log(1 - hat(y)_i) $ <eq:loss>

The optimization objective in @eq:loss guarantees monotonic convergence.

= Empirical Evaluation <sec:eval>
We conduct experiments over standard hardware architectures.

#figure(
  table(
    columns: (1.5fr, 1fr, 1fr, 1fr),
    align: (left, center, center, center),
    stroke: (x, y) => if y == 0 { (bottom: 1.2pt) } else if y == 1 { (bottom: 0.8pt) } else { none },
    [*Architecture*], [*Latency (ms)*], [*Throughput (qps)*], [*P99 (ms)*],
    [Baseline], [142.4], [1,200], [280],
    [Optimized (Ours)], [*18.6*], [*9,450*], [*34.2*],
  ),
  caption: [System performance comparison under peak synthetic load.]
) <tab:results>

= Conclusion <sec:conclusion>
We have established a high-throughput, publication-ready research pipeline. Future work will extend the evaluation to multi-datacenter topologies.

#bibliography("references.bib", style: "ieee")
