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
- `services.html` (`/services`) — full service catalog, equipment types, pricing model.
- `services-*.html` (`/services/flatbed`, `/services/reefer`, …) — one page per equipment type.
- `about-us.html` — story, mission/vision, values, new-carrier support.

## Stack

- **Three.js** (`assets/vendor/three.module.min.js`) — 3D scenes in `assets/js/scene.js`
- **GSAP + ScrollTrigger** (`assets/vendor/`) — scroll reveals, counters in `assets/js/main.js`
- **Space Grotesk / Inter** — self-hosted woff2 in `assets/fonts/`
- Pure static HTML/CSS/JS — host anywhere (Cloudflare Pages, Netlify, Vercel,
  GitHub Pages, or any web host). No build step required.

## Local preview

```bash
python3 tools/serve.py
# open http://localhost:8080
```

Pages have clean addresses (`/contact`, not `/contact.html`; equipment pages
live under `/services/`, e.g. `services-flatbed.html` is `/services/flatbed`). On Hostinger,
`.htaccess` serves `/contact` from `contact.html` and 301-redirects any old
`.html` address to the clean one. `tools/serve.py` does the same locally; a
plain `python3 -m http.server` would not, so links would 404 there.

(A server is required because the 3D module uses ES-module imports; opening
`index.html` via `file://` won't load them.)

## Contact form email

Every form (the popups and the contact form) posts to `send.php`, which emails
**info@trucxpress.com**. It only works on the live Hostinger site: a local
preview has no PHP, so there the form shows its fallback (Gmail / Outlook /
copy / call buttons with the answers filled in).

`send.php` delivers in this order:

1. **SMTP** with the info@ mailbox login, if `send-config.php` exists. Most
   reliable. Copy `tools/send-config.sample.php`, rename it `send-config.php`,
   put the mailbox password in it, and upload it with hPanel File Manager to
   the folder **above** `public_html`. Never commit it (it is in `.gitignore`).
2. **PHP `mail()`**, sent from info@trucxpress.com.

Every request is also saved to `trucxpress-leads/leads-YYYY-MM.txt` in the
folder above `public_html` (not reachable from the web), so a lead is never
lost even if email fails. If nothing arrives: check that the info@ mailbox
exists in hPanel → Emails, check Spam, and look in that leads folder.

Every `mailto:` link opens a small chooser (Gmail, Outlook, email app, copy
address), because a plain mailto link does nothing on a computer without an
email app set up.

## Accessibility & performance

- Only the home page loads Three.js. The page-hero starfield on other pages is
  CSS; the route map (home, About) loads when it scrolls near.
- Two variable fonts with metric-matched fallbacks (no layout shift on swap),
  preloaded on every page.
- The truck model is preloaded with the exact URL the loader uses (`?m=N`);
  keep the two in sync or it downloads twice.

- `prefers-reduced-motion` disables all animation.
- 3D scenes pause when scrolled off-screen or when the tab is hidden.
- WebGL failures degrade gracefully (static dark gradient background).
- Pixel ratio capped at 2 to keep GPU cost sane on high-DPI phones.

## Content pages

Landing pages and blog posts are generated from `content/*.md` by `python3 tools/build.py`. See `SEO-PLAN.md` for the format and keyword map.
