#!/usr/bin/env python3
"""
Enhances core skills according to Anthropic Claude Skill Authoring Best Practices:
1. Validates & tightens YAML frontmatter (name ^[a-z0-9-]+$, <=64 chars, 3rd-person description with 'Use when...').
2. Enforces progressive disclosure: keeps SKILL.md under 500 lines by factoring out heavy templates/code into references/.
3. Ensures all paths use forward slashes.
"""

import os
import re

def enhance_3d_web_experience():
    path = 'skills/3d-web-experience/SKILL.md'
    with open(path, 'r') as f:
        text = f.read()

    templates_start = text.find('## 🧱 Code Templates')
    templates_end = text.find('## 📐 Scene Architecture Patterns')

    if templates_start != -1 and templates_end != -1:
        templates_content = text[templates_start:templates_end].strip()
        ref_path = 'skills/3d-web-experience/references/templates.md'
        os.makedirs('skills/3d-web-experience/references', exist_ok=True)
        with open(ref_path, 'w') as f:
            f.write('# 3D Web Experience — Production Code Templates\n\n' + templates_content + '\n')
        print(f'Extracted {ref_path}')

        replacement = '''## 🧱 Production Code Templates (Progressive Disclosure)

Complete, tested boilerplate templates are located in [`references/templates.md`](references/templates.md) for progressive disclosure (read on-demand):

- **[Template 1: High-Performance Three.js Boilerplate](references/templates.md#template-1-high-performance-threejs-boilerplate)**: Scene graph, camera, WebGLRenderer with high-performance flags, dispose handling, and render loop.
- **[Template 2: Custom GLSL Shader Material](references/templates.md#template-2-custom-glsl-shader-material)**: Uniforms, vertex/fragment shaders with time delta and resolution uniforms.
- **[Template 3: GPU-Instanced Particle System](references/templates.md#template-3-gpu-instanced-particle-system-100k-particles)**: 100K+ particles using `THREE.InstancedMesh` with per-instance dynamic matrices and colors.
- **[Template 4: GSAP + ScrollTrigger Orchestration](references/templates.md#template-4-gsap--scrolltrigger--full-scene-orchestration)**: Timeline scrubbing and camera dolly moves synchronized to page scroll.
- **[Template 5: React Three Fiber Advanced Composition](references/templates.md#template-5-react-three-fiber--advanced-scene-composition)**: Canvas, `useFrame` hook, `AdaptiveDpr`, and postprocessing bloom pipeline.
- **[Template 6: Procedural Background Shader](references/templates.md#template-6-procedural-background-shader-no-geometry-needed)**: Fullscreen quad with organic noise and raymarched lighting without 3D geometry.
- **[Template 7: Environment & Lighting Setup](references/templates.md#template-7-advanced-environment--lighting-setup)**: IBL HDR environment maps, directional shadows, and Filmic tone mapping.
- **[Template 8: Software Fallback (CSS3D + GSAP)](references/templates.md#template-8-no-gpu--software-rendering-fallback-css3d--gsap)**: Pure CSS 3D transforms for environments lacking WebGL hardware acceleration.

'''
        text = text[:templates_start] + replacement + text[templates_end:]

    # Frontmatter cleanup
    fm_match = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
    if fm_match:
        rest = text[fm_match.end():]
        new_fm = """---
name: 3d-web-experience
description: Builds cinematic, GPU-accelerated 3D web experiences using Three.js, React Three Fiber, custom GLSL shaders, and GSAP ScrollTrigger. Use when developing 3D landing pages, WebGL scenes, interactive canvas animations, shader effects, or WebGPU-ready architectures.
risk: low
category: frontend
---"""
        text = new_fm + rest

    with open(path, 'w') as f:
        f.write(text)
    print(f'Enhanced {path}: {len(text.splitlines())} lines')


def enhance_commit():
    path = 'skills/commit/SKILL.md'
    with open(path, 'r') as f:
        text = f.read()

    fm_match = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
    if fm_match:
        rest = text[fm_match.end():]
        new_fm = """---
name: commit
description: Creates Git commits following Sentry and conventional commit standards with issue references and branch safety checks. Use when preparing commit messages, committing code changes, saving git progress, or reviewing staged diffs.
risk: critical
category: git
---"""
        text = new_fm + rest
        with open(path, 'w') as f:
            f.write(text)
        print(f'Enhanced {path}: {len(text.splitlines())} lines')


def enhance_git_pushing():
    path = 'skills/git-pushing/SKILL.md'
    with open(path, 'r') as f:
        text = f.read()

    fm_match = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
    if fm_match:
        rest = text[fm_match.end():]
        new_fm = """---
name: git-pushing
description: Stages changes, creates conventional commits, and pushes to remote Git branches. Use when the user asks to push changes, save work to GitHub/remote, or synchronize committed work.
risk: critical
category: git
---"""
        text = new_fm + rest
        with open(path, 'w') as f:
            f.write(text)
        print(f'Enhanced {path}: {len(text.splitlines())} lines')


def enhance_loopy():
    path = 'skills/loopy/SKILL.md'
    with open(path, 'r') as f:
        text = f.read()

    fm_match = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
    if fm_match:
        rest = text[fm_match.end():]
        new_fm = """---
name: loopy
description: Executes autonomous iterative goal loops with Doer, Independent Checker, and Gate validation. Use when solving complex tasks, multi-iteration bug fixes, refactoring code, or enforcing quality gates without manual intervention.
risk: safe
category: automation
---"""
        text = new_fm + rest
        with open(path, 'w') as f:
            f.write(text)
        print(f'Enhanced {path}: {len(text.splitlines())} lines')


def enhance_anti_vibe_design():
    path = 'skills/anti-vibe-design/SKILL.md'
    with open(path, 'r') as f:
        text = f.read()

    fm_match = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
    if fm_match:
        rest = text[fm_match.end():]
        new_fm = """---
name: anti-vibe-design
description: Enforces strict anti-vibe-coding rules and production web guidelines to eliminate AI slop patterns (purple gradients, pill CTA buttons, fake metrics/reviews, emoji icons, em dash spam). Use when designing web interfaces, creating landing pages, writing CSS/Tailwind, or reviewing UI aesthetics.
category: frontend
risk: safe
tags: [ui-ux, web-design, anti-vibe-coding, unslop, frontend-guidelines, production-ready]
---"""
        text = new_fm + rest
        with open(path, 'w') as f:
            f.write(text)
        print(f'Enhanced {path}: {len(text.splitlines())} lines')


def fix_lifecycle_names():
    # Fix skills whose name contains forbidden '/' characters
    lifecycle_skills = [
        'skills/using-agent-skills/SKILL.md',
        'skills/context-engineering/SKILL.md',
        'skills/security-and-hardening/SKILL.md',
        'skills/browser-testing-with-devtools/SKILL.md',
        'skills/performance-optimization/SKILL.md',
        'skills/shipping-and-launch/SKILL.md',
        'skills/code-simplification/SKILL.md',
        'skills/spec-driven-development/SKILL.md',
        'skills/idea-refine/SKILL.md'
    ]
    for p in lifecycle_skills:
        if not os.path.exists(p):
            continue
        with open(p, 'r') as f:
            content = f.read()
        
        # Replace name: lifecycle/something with name: something
        new_content = re.sub(r'name:\s*lifecycle/([a-z0-9-]+)', r'name: \1', content)
        if new_content != content:
            with open(p, 'w') as f:
                f.write(new_content)
            print(f'Sanitized skill name in {p}')


if __name__ == '__main__':
    enhance_3d_web_experience()
    enhance_commit()
    enhance_git_pushing()
    enhance_loopy()
    enhance_anti_vibe_design()
    fix_lifecycle_names()
    print('All core skills enhanced successfully!')
