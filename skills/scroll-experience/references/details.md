# Scroll Experience — Code Reference

## ### CSS Native (2024+)

```

### Parallax Storytelling

Tell stories through scroll depth

**When to use**: When creating narrative experiences

## Parallax Storytelling

### Layer Speeds
| Layer | Speed | Effect |
|-------|-------|--------|
| Background | 0.2x | Far away, slow |
| Midground | 0.5x | Middle depth |
| Foreground | 1.0x | Normal scroll |
| Content | 1.0x | Readable |
| Floating elements | 1.2x | Pop forward |

### Creating Depth
```javascript


## ### Horizontal Scroll Section

```

### Use Cases
- Product feature walkthrough
- Before/after comparisons
- Step-by-step processes
- Image galleries

### Performance Optimization

Keep scroll experiences smooth

**When to use**: Always - scroll jank kills experiences

## Performance Optimization

### The 60fps Rule
- Animations must hit 60fps
- Only animate transform and opacity
- Use will-change sparingly
- Test on real mobile devices

### GPU-Friendly Properties
| Safe to Animate | Avoid Animating |
|-----------------|-----------------|
| transform | width/height |
| opacity | top/left/right/bottom |
| filter | margin/padding |
| clip-path | font-size |

### Lazy Loading
```javascript


## ### Debug Tools

```

## Sharp Edges

### Animations stutter during scroll

Severity: HIGH

Situation: Scroll animations aren't smooth 60fps

Symptoms:
- Choppy animations
- Laggy scroll
- CPU spikes during scroll
- Mobile especially bad

Why this breaks:
Animating wrong properties.
Too many elements animating.
Heavy JavaScript on scroll.
No GPU acceleration.

Recommended fix:

## Fixing Scroll Jank

### Only Animate These
```css


## ### Throttle Scroll Events

```

### Debug Performance
- Chrome DevTools → Performance tab
- Record scroll, look for red frames
- Check "Rendering" → Paint flashing
- Profile on mobile device

### Parallax breaks on mobile devices

Severity: HIGH

Situation: Parallax effects glitch on iOS/Android

Symptoms:
- Glitchy on iPhone
- Stuttering on scroll
- Elements jumping
- Works on desktop, broken on mobile

Why this breaks:
Mobile browsers handle scroll differently.
iOS momentum scrolling conflicts.
Transform during scroll is tricky.
Performance varies wildly.

Recommended fix:

## Mobile-Safe Parallax

### Detection
```javascript


## ### Alternative: CSS Only

```

### Scroll experience is inaccessible

Severity: MEDIUM

Situation: Screen readers and keyboard users can't use the site

Symptoms:
- Failed accessibility audit
- Can't navigate with keyboard
- Screen reader doesn't work
- Vestibular disorder complaints

Why this breaks:
Animations hide content.
Scroll hijacking breaks navigation.
No reduced motion support.
Focus management ignored.

Recommended fix:

## Accessible Scroll Experiences

### Respect Reduced Motion
```css


## ### Keyboard Navigation

```

### Critical content hidden below animations

Severity: MEDIUM

Situation: Users have to scroll through animations to find content

Symptoms:
- High bounce rate
- Low time on page (paradoxically)
- SEO ranking issues
- User complaints about finding info

Why this breaks:
Prioritized experience over content.
Long scroll to reach info.
SEO suffering.
Mobile users bounce.

Recommended fix:

## Content-First Scroll Design

### Above-the-Fold Content
- Key message visible immediately
- CTA visible without scroll
- Value proposition clear
- Skip animation option

### Progressive Enhancement
```


```

### SEO Considerations
- Text in DOM, not just in canvas
- Proper heading hierarchy
- Content not hidden by default
- Fast initial load

### Quick Exit Points
- Clear navigation always visible
- Skip to content links
- Don't trap users in experience

## Validation Checks

### No Reduced Motion Support

Severity: HIGH

Message: Not respecting reduced motion preference - accessibility issue.

Fix action: Add prefers-reduced-motion media query to disable/reduce animations

### Unthrottled Scroll Events

Severity: MEDIUM

Message: Scroll events may not be throttled - potential jank.

Fix action: Use requestAnimationFrame or GSAP ScrollTrigger for smooth performance

### Animating Layout-Triggering Properties

Severity: MEDIUM

Message: Animating layout properties causes jank.

Fix action: Use transform (translate, scale) and opacity instead

### Missing will-change Optimization

Severity: LOW

Message: Consider adding will-change for heavy animations.

Fix action: Add will-change: transform to frequently animated elements

### Scroll Hijacking Detected

Severity: MEDIUM

Message: May be hijacking scroll behavior.

Fix action: Let users scroll naturally, use scrub animations instead

## Collaboration

### Delegation Triggers

- 3D|WebGL|three.js|spline -> 3d-web-experience (3D elements in scroll experience)
- react|vue|next|framework -> frontend (Frontend implementation)
- performance|slow|optimize -> performance-hunter (Performance optimization)
- design|mockup|visual -> ui-design (Visual design)

### Immersive Product Page

Skills: scroll-experience, 3d-web-experience, landing-page-design

Workflow:

```


## ### Interactive Story

```

## Related Skills

Works well with: `3d-web-experience`, `frontend`, `ui-design`, `landing-page-design`

## When to Use
- User mentions or implies: scroll animation
- User mentions or implies: parallax
- User mentions or implies: scroll storytelling
- User mentions or implies: interactive story
- User mentions or implies: cinematic website
- User mentions or implies: scroll experience
- User mentions or implies: immersive web

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


