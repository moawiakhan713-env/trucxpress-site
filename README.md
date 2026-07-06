# TrucXpress — 3D Website Redesign

Dark-premium redesign of [trucxpress.com](https://trucxpress.com) as a fast,
standalone static site (no WordPress/Elementor). Real-time 3D built with
Three.js, scroll animation with GSAP ScrollTrigger. All libraries and fonts are
self-hosted — no CDNs, no external requests.

## Pages

- `index.html` — Home: 3D night-highway hero (animated semi truck, moving lanes,
  headlight beams, speed particles), equipment marquee, about preview with 3D
  floating cargo containers, services grid, how-it-works, animated stats,
  why-us, testimonials, CTA, contact form, footer.
- `our-services.html` — full service catalog, equipment types, pricing model.
- `about-us.html` — story, mission/vision, values, new-carrier support.

## Stack

- **Three.js** (`assets/vendor/three.module.min.js`) — 3D scenes in `assets/js/scene.js`
- **GSAP + ScrollTrigger** (`assets/vendor/`) — scroll reveals, counters in `assets/js/main.js`
- **Space Grotesk / Inter** — self-hosted woff2 in `assets/fonts/`
- Pure static HTML/CSS/JS — host anywhere (Cloudflare Pages, Netlify, Vercel,
  GitHub Pages, or any web host). No build step required.

## Local preview

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

(A server is required because the 3D module uses ES-module imports; opening
`index.html` via `file://` won't load them.)

## Before go-live

See `CONTENT-TODO.md` — phone, email, stats, and testimonials are placeholders
pending the real site content. The contact form currently opens the visitor's
email client (`mailto:`); wire it to a form service (Formspree, Basin, or your
host's forms) for production.

## Accessibility & performance

- `prefers-reduced-motion` disables all animation.
- 3D scenes pause when scrolled off-screen or when the tab is hidden.
- WebGL failures degrade gracefully (static dark gradient background).
- Pixel ratio capped at 2 to keep GPU cost sane on high-DPI phones.
