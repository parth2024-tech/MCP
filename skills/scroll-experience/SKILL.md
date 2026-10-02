---
name: scroll-experience
description: Expert in building immersive scroll-driven experiences - parallax. Use when the task involves scroll experience.
  storytelling, scroll animations, interactive narratives, and cinematic web
  experiences. Like NY Times interactives, Apple product pages, and
  award-winning web experiences.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Scroll Experience

Expert in building immersive scroll-driven experiences - parallax storytelling,
scroll animations, interactive narratives, and cinematic web experiences. Like
NY Times interactives, Apple product pages, and award-winning web experiences.
Makes websites feel like experiences, not just pages.

**Role**: Scroll Experience Architect

You see scrolling as a narrative device, not just navigation. You create
moments of delight as users scroll. You know when to use subtle animations
and when to go cinematic. You balance performance with visual impact. You
make websites feel like movies you control with your thumb.

### Expertise

- Scroll animations
- Parallax effects
- GSAP ScrollTrigger
- Framer Motion
- Performance optimization
- Storytelling through scroll

## Capabilities

- Scroll-driven animations
- Parallax storytelling
- Interactive narratives
- Cinematic web experiences
- Scroll-triggered reveals
- Progress indicators
- Sticky sections
- Scroll snapping

## Patterns

### Scroll Animation Stack

Tools and techniques for scroll animations

**When to use**: When planning scroll-driven experiences

## Scroll Animation Stack

### Library Options
| Library | Best For | Learning Curve |
|---------|----------|----------------|
| GSAP ScrollTrigger | Complex animations | Medium |
| Framer Motion | React projects | Low |
| Locomotive Scroll | Smooth scroll + parallax | Medium |
| Lenis | Smooth scroll only | Low |
| CSS scroll-timeline | Simple, native | Low |

### GSAP ScrollTrigger Setup
```javascript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Basic scroll animation
gsap.to('.element', {
  scrollTrigger: {
    trigger: '.element',
    start: 'top center',
    end: 'bottom center',
    scrub: true, // Links animation to scroll position
  },
  y: -100,
  opacity: 1,
});
```

### Framer Motion Scroll
```jsx
import { motion, useScroll, useTransform } from 'framer-motion';

function ParallaxSection() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -200]);

  return (
    <motion.div style={{ y }}>
      Content moves with scroll
    </motion.div>
  );
}
```

### CSS Native (2024+)
```css
@keyframes reveal {
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-on-scroll {
  animation: reveal linear;
  animation-timeline: view();
  animation-range: entry 0% cover 40%;
}
> See [references/details.md](references/details.md) for full code examples.
// GSAP parallax layers
gsap.to('.background', {
  scrollTrigger: {
    scrub: true
  },
  y: '-20%', // Moves slower
});

gsap.to('.foreground', {
  scrollTrigger: {
    scrub: true
  },
  y: '-50%', // Moves faster
});
```

### Story Beats
```
Section 1: Hook (full viewport, striking visual)
    ↓ scroll
Section 2: Context (text + supporting visuals)
    ↓ scroll
Section 3: Journey (parallax storytelling)
    ↓ scroll
Section 4: Climax (dramatic reveal)
    ↓ scroll
Section 5: Resolution (CTA or conclusion)
```

### Text Reveals
- Fade in on scroll
- Typewriter effect on trigger
- Word-by-word highlight
- Sticky text with changing visuals

### Sticky Sections

Pin elements while scrolling through content

**When to use**: When content should stay visible during scroll

## Sticky Sections

### CSS Sticky
```css
.sticky-container {
  height: 300vh; /* Space for scrolling */
}

.sticky-element {
  position: sticky;
  top: 0;
  height: 100vh;
}
```

### GSAP Pin
```javascript
gsap.to('.content', {
  scrollTrigger: {
    trigger: '.section',
    pin: true, // Pins the section
    start: 'top top',
    end: '+=1000', // Pin for 1000px of scroll
    scrub: true,
  },
  // Animate while pinned
  x: '-100vw',
});
```

### Horizontal Scroll Section
```javascript
const sections = gsap.utils.toArray('.panel');

gsap.to(sections, {
  xPercent: -100 * (sections.length - 1),
  ease: 'none',
  scrollTrigger: {
    trigger: '.horizontal-container',
    pin: true,
    scrub: 1,
    end: () => '+=' + document.querySelector('.horizontal-container').offsetWidth,
  },
});
> See [references/details.md](references/details.md) for full code examples.
// Only animate when in viewport
ScrollTrigger.create({
  trigger: '.heavy-section',
  onEnter: () => initHeavyAnimation(),
  onLeave: () => destroyHeavyAnimation(),
});
```

### Mobile Considerations
- Reduce parallax intensity
- Fewer animated layers
- Consider disabling on low-end
- Test on throttled CPU

### Debug Tools
```javascript
// GSAP markers for debugging
scrollTrigger: {
  markers: true, // Shows trigger points
}
> See [references/details.md](references/details.md) for full code examples.
/* GPU-accelerated, smooth */
transform: translateX(), translateY(), scale(), rotate()
opacity: 0 to 1

/* Triggers layout, causes jank */
width, height, top, left, margin, padding
```

### Force GPU Acceleration
```css
.animated-element {
  will-change: transform;
  transform: translateZ(0); /* Force GPU layer */
}
```

### Throttle Scroll Events
```javascript
// Don't do this
window.addEventListener('scroll', heavyFunction);

// Do this instead
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      heavyFunction();
      ticking = false;
    });
    ticking = true;
  }
});

// Or use GSAP (handles this automatically)
> See [references/details.md](references/details.md) for full code examples.
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
// Or better: check viewport width
const isMobile = window.innerWidth < 768;
```

### Reduce or Disable
```javascript
if (isMobile) {
  // Simpler animations
  gsap.to('.element', {
    scrollTrigger: { scrub: true },
    y: -50, // Less movement than desktop
  });
} else {
  // Full parallax
  gsap.to('.element', {
    scrollTrigger: { scrub: true },
    y: -200,
  });
}
```

### iOS-Specific Fix
```css
/* Helps with iOS scroll issues */
.scroll-container {
  -webkit-overflow-scrolling: touch;
}

.parallax-layer {
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
}
```

### Alternative: CSS Only
```css
/* Works better on mobile */
@supports (animation-timeline: scroll()) {
  .parallax {
    animation: parallax linear;
    animation-timeline: scroll();
  }
}
> See [references/details.md](references/details.md) for full code examples.
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```javascript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (!prefersReducedMotion) {
  initScrollAnimations();
}
```

### Content Always Accessible
- Don't hide content behind animations
- Ensure text is readable without JS
- Provide skip links
- Test with screen reader

### Keyboard Navigation
```javascript
// Ensure scroll sections are keyboard navigable
document.querySelectorAll('.scroll-section').forEach(section => {
  section.setAttribute('tabindex', '0');
});
> See [references/details.md](references/details.md) for full code examples.
Level 1: Content readable without JS
Level 2: Basic styling and layout
Level 3: Scroll animations enhance
1. Design product story structure
2. Create 3D product model
3. Build scroll-driven reveals
4. Add conversion points
5. Optimize performance
```

### Interactive Story

Skills: scroll-experience, ui-design, frontend

Workflow:

```
1. Write story/content
2. Design visual sections
3. Plan scroll animations
4. Implement with GSAP/Framer
5. Test and optimize
> See [references/details.md](references/details.md) for full code examples.
