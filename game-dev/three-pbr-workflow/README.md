# three-pbr-workflow

Token-friendly Three.js PBR high-fidelity workflow framework for AI agents.

When a user asks for "a 3D scene with high-end rendering", "PBR material showcase",
"HDR lighting", or "Three.js + reflections + Bloom", this skill gives the agent
a runnable starting point in under 5 minutes — without re-explaining PMREMGenerator,
ACES tone mapping, or HDR setup.

## What's in the box

```
three-pbr-workflow/
├── SKILL.md              ← agent entry point (read this first)
├── LICENSE.txt           ← MIT
├── templates/
│   ├── template-showcase.html   ← 6 PBR material spheres (default, most reliable)
│   ├── template-product.html    ← single rotating product on a pedestal
│   ├── template-blank.html      ← empty scene, drop in your own geometry
│   └── template-gltf.html       ← load .glb / .gltf (drag-and-drop supported)
├── assets/
│   └── manifest.md       ← CC0 HDR / glTF / CDN URLs, ready to use
└── scripts/
    └── build.sh          ← copy a template to dist/ and serve locally
```

## Quick start

```bash
# Pick a template and serve it
bash scripts/build.sh showcase --serve
# → http://localhost:8080
```

## Design principles

1. **Single HTML file first** — CDN imports, double-click to run, no npm
2. **4 annotated `// 👈 CONFIG` blocks** — agent iterates on small regions,
   doesn't regenerate the whole file
3. **High-end by default** — ACES tone mapping, HDR environment, soft shadows,
   Bloom, OrbitControls, lil-gui. User doesn't start at "low quality"
4. **CC0 assets only** — Poly Haven HDR + Khronos glTF, all CDN
5. **Token-minimal** — total ~6 KB across all files, ~857 lines including templates

## Inspired by

- [GGEZ](https://github.com/vibe-stack/ggez) — "Next.js for Three.js games"
- [vibe coding](https://en.wikipedia.org/wiki/Vibe_coding) — agent-first 3D prototyping
- [Anthropic Agent Skills](https://agentskills.io) — SKILL.md as portable SOP

## License

MIT. See `LICENSE.txt`.
