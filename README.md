# World Builder

A short-form interactive world generator. Start with a brief text concept, three emoji, or a photo and enter a **60–90 second 3D challenge**:

**Explore → Collect → World transformation → Boss pursuit → Activate nodes → Exit portal**

## Status

This is a buildable, actively developed web application, not merely a static concept page.

- Runtime: modern desktop and mobile browsers with WebGL
- Stack: React 19, TypeScript, Vite, Three.js, React Three Fiber
- Render tiers: automatically selected `high` and `low`
- Required gates: engine smoke tests, level-generation smoke tests, TypeScript checks, production build
- Extended gate: ESLint in addition to the required checks
- Output: `dist/`

## Requirements

- Node.js 22 (see `.nvmrc`)
- npm 10 or newer
- A modern browser with WebGL support

```bash
nvm use
git clone https://github.com/yniantongtian-oss/wanwu-chengjie.git
cd wanwu-chengjie
npm ci
npm run dev
```

The development server prints its local URL. Dependency installation may require an available npm registry.

## Development commands

```bash
npm run dev
npm run lint
npm run sanity:engine
npm run sanity:level
npm test
npm run build
npm run check
npm run check:strict
npm run preview
```

Use `npm run check` for the required smoke-test and production-build gate. `npm run check:strict` additionally enforces ESLint.

## Gameplay loop

1. Supply a text idea, emoji, or an image to establish the world theme.
2. Explore the generated scene and read environmental cues.
3. Collect memory-crystal fragments.
4. Trigger world transformation and a boss pursuit sequence.
5. Activate energy nodes.
6. Reach the portal and complete the challenge.

## Graphics and compatibility

The application selects quality tiers based on device capability. Limited-core devices, software rendering, and certain older integrated GPUs default to `low`; other supported devices may use `high`.

Force a render tier when testing:

```text
/play/:id?q=high
/play/:id?q=low
```

If the frame-rate watchdog detects sustained poor performance, it disables bloom and reduces the render scale to 1x without interrupting the session.

## Automated checks

GitHub Actions validates pull requests and pushes to `main` with dependency installation, engine and level-generation checks, TypeScript compilation, and a production build. It also reports historical lint issues separately. Required smoke or build failures block successful validation.

The engine and level-generation smoke tests contain more than 150 assertions. These are synthetic software checks, not a substitute for performance and usability testing on physical devices.

## Visual and gameplay improvements

- Rebuilt memory crystals, energy obelisks, rune portals, six boss variants, and the player core.
- Added layered terrain shading, illuminated paths, floating islands, and decorative crystal clusters.
- Added a dual-tone sky, nebula, two moons, aurora effects, and an eclipse corona.
- Expanded modular buildings and scene diversity from 14 to 18 scene types.
- Added bloom, FXAA, dynamic shadows, and vignette effects to the high tier.
- Added event particles, landing effects, ripple feedback, jumping audio, and portal transitions.
- Adjusted sprint movement by 18% with coordinated camera field-of-view response.
- Fixed invalid boss spawn locations and buried collectibles in floating-island scenes.
- Reduced per-frame allocations by sharing frequently used temporary vectors.

## Production deployment

```bash
npm run build
npm run preview
```

Deploy the `dist/` directory to a static hosting provider. Configure the host to fall back to `index.html` for client-side routes.

## Troubleshooting

**Install errors:** confirm `node -v` and `npm -v`; remove `node_modules` and run `npm ci` again.

**Graphics artifacts or low performance:** try `?q=low` and enable hardware acceleration in the browser.

**404 on refresh:** configure the static server to rewrite unknown SPA routes to `index.html`.

## Contribution standards

Develop features on a separate branch and validate with `npm run check` before merging. Aim to pass `npm run check:strict` for new or refactored code. Do not commit build output, dependency directories, logs, or caches. Check both visual quality tiers when changing performance-sensitive code.
