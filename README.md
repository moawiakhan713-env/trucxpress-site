# TrucXpress website

Static site for [trucxpress.com](https://trucxpress.com): plain HTML, CSS and
JavaScript, self-hosted fonts, no CDNs and no external requests. Upload the
site files to `public_html` on Hostinger.

## Pages

- `index.html` — Home: one-screen hero with a scroll-driven 3D truck scene,
  live load tracker, equipment cards, US route map, how-it-works, FAQ, contact form.
- `services.html` (`/services`) — full service catalog, equipment types, pricing model.
- `services-*.html` (`/services/flatbed`, `/services/reefer`, …) — one page per equipment type.
- `about-us.html`, `contact.html`, `blog.html`, `blog-*.html`, and the guide pages.

## What loads where

| File | Used by | What it is |
|---|---|---|
| `assets/css/style.css` | every page | all styles |
| `assets/js/main.js` | every page | nav, scroll reveals, cards, load tracker, starts the home hero |
| `assets/js/popup.js` | every page | request popups, contact form, email chooser |
| `assets/js/route-map.js` | home, About | US route map, plain 2D canvas |
| `assets/vendor/gsap*.js` | home only | pinned scroll for the hero |
| `assets/js/hero.js` | home only | 3D hero. **Built file**: edit `src/hero.js`, then `npm install && npm run build` |
| `assets/models/truck.glb`, `assets/vendor/draco/` | home only | truck model and its decoder |
| `assets/img/hero-poster-*.webp` | home only | still of the hero's first frame, shown until the 3D is ready |

Inner pages load no 3D library and no GSAP.

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

- The home hero is exactly one screen tall and paints a poster of the first 3D
  frame immediately; the 3D starts after the page has loaded and fades in over
  it. Three camera layouts (wide, mid, tall) keep the whole truck in view; the
  breakpoints live in both `style.css` (posters) and `src/hero.js` (camera).
  If the opening shot changes, re-render the three posters.
- Visitors with reduced motion or data saver get the poster only, no 3D download.
- The truck model is preloaded with the exact URL the loader uses (`?m=N`);
  keep the two in sync or it downloads twice.
- Two variable fonts with metric-matched fallbacks (no layout shift on swap).
- Animations pause off-screen and when the tab is hidden.

## Content pages

Landing pages and blog posts are generated from `content/*.md` by `python3 tools/build.py`. See `SEO-PLAN.md` for the format and keyword map.
