#!/usr/bin/env python3
"""
TrucXpress page builder.

Turns content/*.md into finished HTML pages (blog posts and landing pages),
then refreshes the shared bits on every page: the footer link columns, the
blog listing, the equipment links on the home and services pages, and
sitemap.xml.

Run from the repository root:   python3 tools/build.py

Content file format (front matter, a line with ---, then the body):

    type: post | landing
    slug: file-name-without-html
    title: Visible H1
    seo_title: <title> tag, about 60 characters
    description: meta description, about 150 characters
    category: Pricing            (posts)
    author: founder | dispatcher | sales   (posts)
    date: 2026-11-07
    eyebrow: Equipment           (landing pages)
    highlights: one | two | three
    popup: hire | availability | dispatch-today | findload | quote | start
    equipment: Reefer            (optional, preselects the popup)
    cta_label: Button text
    cta_title: Closing banner heading
    cta_text: Closing banner sentence
    related: other-slug, another-slug
    ---
    First paragraph becomes the lede.

    ## Heading
    Paragraphs, "- " lists, "1. " lists, "> " callouts, | tables |,
    **bold**, [links](page.html).

    ## Frequently asked questions
    ### Question?
    Answer paragraph.
"""
import html
import json
import math
import pathlib
import re
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'content'
SITE = 'https://trucxpress.com'
OG = SITE + '/assets/img/og-image.jpg'
V = '11'  # asset cache-busting version
TODAY = date.today().isoformat()

AUTHORS = {
    'founder': {
        'name': 'Moawia Khan', 'role': 'Founder & CEO, TrucXpress', 'initials': 'MK',
        'bio': 'Moawia Khan founded TrucXpress to give carriers a dispatch partner that only earns when they do. '
               'He oversees broker vetting, carrier onboarding and the dispatch team.',
        'schema': {'@type': 'Person', 'name': 'Moawia Khan', 'jobTitle': 'Founder & CEO',
                   'worksFor': {'@id': SITE + '/#business'}},
    },
    'dispatcher': {
        'name': 'TrucXpress Truck Dispatcher', 'role': 'Dispatch Desk', 'initials': 'TD',
        'bio': 'Written by the TrucXpress dispatch desk: the people who book loads, negotiate rates, '
               'vet brokers and track trucks for our carriers every day.',
        'schema': {'@type': 'Organization', 'name': 'TrucXpress Dispatch Desk', 'url': SITE + '/'},
    },
    'sales': {
        'name': 'TrucXpress Sales Agent', 'role': 'Carrier Sales', 'initials': 'SA',
        'bio': 'Written by the TrucXpress carrier sales team, who walk owner-operators and fleets '
               'through pricing, setup and their first loads with us.',
        'schema': {'@type': 'Organization', 'name': 'TrucXpress Carrier Sales', 'url': SITE + '/'},
    },
}

CATEGORY_ICONS = {
    'Pricing': '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    'New Carriers': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6m3-3h-6"/>',
    'Safety': '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    'Profit': '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    'Equipment': '<path d="M10 17h4V5H2v12h3m14 0h3v-6l-4-5h-4v11h2"/><circle cx="7.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>',
    'Operations': '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
}

ARROW = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
         'stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>')


# ------------------------------------------------------------------ parsing
def parse(path):
    raw = path.read_text(encoding='utf-8')
    head, body = raw.split('\n---\n', 1)
    meta = {}
    for line in head.strip().splitlines():
        k, v = line.split(':', 1)
        meta[k.strip()] = v.strip()
    meta['body'] = body.strip()
    meta.setdefault('date', TODAY)
    meta['related'] = [s.strip() for s in meta.get('related', '').split(',') if s.strip()]
    meta['highlights'] = [s.strip() for s in meta.get('highlights', '').split('|') if s.strip()]
    meta['file'] = meta['slug'] + '.html'
    return meta


def inline(text):
    t = html.escape(text, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', t)
    t = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lambda m: f'<a href="{html.escape(m.group(2))}">{m.group(1)}</a>', t)
    return t


def slugify(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def render_body(md):
    """Returns (lede_html, body_html, faqs, word_count)."""
    blocks = re.split(r'\n\s*\n', md.strip())
    lede, out, faqs = None, [], []
    in_faq, words = False, 0
    q = None
    for b in blocks:
        b = b.strip()
        words += len(re.findall(r'\w+', b))
        if b.startswith('## '):
            title = b[3:].strip()
            in_faq = title.lower() in ('faq', 'frequently asked questions')
            if not in_faq:
                out.append(f'<h2 id="{slugify(title)}">{inline(title)}</h2>')
            continue
        if b.startswith('### '):
            first, _, rest = b.partition('\n')
            if in_faq:
                q = {'q': first[4:].strip(), 'a': []}
                faqs.append(q)
                if rest.strip():
                    q['a'].append(rest.strip())
            else:
                out.append(f'<h3>{inline(first[4:].strip())}</h3>')
                if rest.strip():
                    out.append(f'<p>{inline(rest.strip())}</p>')
            continue
        if in_faq and q is not None:
            q['a'].append(b)
            continue
        lines = b.splitlines()
        if all(l.startswith('- ') for l in lines):
            out.append('<ul>' + ''.join(f'<li>{inline(l[2:])}</li>' for l in lines) + '</ul>')
        elif all(re.match(r'\d+\. ', l) for l in lines):
            items = [re.sub(r'^\d+\. ', '', l) for l in lines]
            out.append('<ol>' + ''.join(f'<li>{inline(i)}</li>' for i in items) + '</ol>')
        elif all(l.startswith('>') for l in lines):
            txt = ' '.join(l.lstrip('> ').strip() for l in lines)
            out.append(f'<div class="callout">{inline(txt)}</div>')
        elif all(l.startswith('|') for l in lines):
            sep = re.compile(r'^\|(\s*:?-+:?\s*\|)+\s*$')
            rows = [[c.strip() for c in l.strip().strip('|').split('|')] for l in lines if not sep.match(l.strip())]
            head, *rest = rows
            th = ''.join(f'<th>{inline(c)}</th>' for c in head)
            trs = ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in rest)
            out.append(f'<div class="table-wrap"><table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>')
        else:
            para = inline(' '.join(l.strip() for l in lines))
            if lede is None and not out:
                lede = para
            else:
                out.append(f'<p>{para}</p>')
    for f in faqs:
        f['a_text'] = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', ' '.join(f['a'])).replace('**', '')
    return lede or '', '\n'.join(out), faqs, words


# ------------------------------------------------------------------ shared markup
def nav(active):
    items = [('index.html', 'Home'), ('services.html', 'Services'), ('about-us.html', 'About Us'),
             ('index.html#faq', 'FAQ'), ('blog.html', 'Blogs'), ('contact.html', 'Contact Us')]
    act = ' class="active"'
    links = '\n'.join(f'        <a href="{h}"{act if t == active else ""}>{t}</a>' for h, t in items)
    return f'''  <header class="nav">
    <div class="container nav-inner">
      <a class="logo" href="index.html" aria-label="TrucXpress home">
        <img class="logo-truck" src="assets/img/logo-truck.svg" alt="">
        <span class="logo-script">TrucXpress</span>
      </a>
      <nav class="nav-links" aria-label="Main navigation">
{links}
        <a href="contact.html" class="btn btn-primary btn-sm" data-popup="hire">Work With Us</a>
      </nav>
      <a href="contact.html" class="btn btn-primary btn-sm" data-popup="hire">Work With Us</a>
      <button class="nav-toggle" aria-label="Toggle menu"><span></span><span></span><span></span></button>
    </div>
  </header>'''


def footer_columns(landings):
    services = [('services.html', 'All Dispatch Services')] + [
        (p['file'], p['short']) for p in landings if p.get('group') == 'service']
    equipment = [(p['file'], p['short']) for p in landings if p.get('group') == 'equipment']
    col = lambda title, links: (f'        <div>\n          <h4>{title}</h4>\n          <div class="footer-links">\n'
                                + '\n'.join(f'            <a href="{h}">{html.escape(t)}</a>' for h, t in links)
                                + '\n          </div>\n        </div>')
    return ('        <!-- FOOTER-LINKS -->\n' + col('Services', services) + '\n' + col('Equipment', equipment)
            + '\n        <!-- /FOOTER-LINKS -->')


FOOTER_TAIL = '''        <div>
          <h4>Contact</h4>
          <div class="footer-links">
            <a href="tel:+19286132787">+1 (928) 613-2787</a>
            <a href="mailto:info@trucxpress.com">info@trucxpress.com</a>
            <a href="contact.html">Phoenix, AZ · Mansehra, PK</a>
          </div>
        </div>'''


def footer(landings):
    return f'''  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="f-about">
          <a class="logo" href="index.html">
            <img class="logo-truck" src="assets/img/logo-truck.svg" alt="">
            <span class="logo-script">TrucXpress</span>
          </a>
          <p>Where Logistics Meets Reliability. Commission-only freight dispatch backed by 24/7 tech &amp; support.</p>
        </div>
        <div>
          <h4>Menu</h4>
          <div class="footer-links">
            <a href="index.html">Home</a>
            <a href="services.html">Services</a>
            <a href="about-us.html">About Us</a>
            <a href="index.html#faq">FAQ</a>
            <a href="blog.html">Blogs</a>
            <a href="contact.html">Contact Us</a>
          </div>
        </div>
{footer_columns(landings)}
{FOOTER_TAIL}
      </div>
      <div class="footer-bottom">
        <span>Copyright © <span id="year">2026</span> TrucXpress LLC. All rights reserved.</span>
        <span>Where Logistics Meets Reliability</span>
      </div>
    </div>
  </footer>

  <button class="to-top" aria-label="Back to top">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>
  </button>

  <script src="assets/vendor/gsap.min.js?v={V}"></script>
  <script src="assets/vendor/ScrollTrigger.min.js?v={V}"></script>
  <script src="assets/js/main.js?v={V}"></script>
  <script src="assets/js/popup.js?v={V}"></script>
</body>
</html>
'''


def head(title, desc, url, og_type, schemas):
    e = lambda s: html.escape(s)
    ld = '\n'.join(f'  <script type="application/ld+json">{json.dumps(s, ensure_ascii=False)}</script>' for s in schemas)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(title, quote=False)}</title>
  <meta name="description" content="{e(desc)}">
  <!-- SEO -->
  <link rel="canonical" href="{url}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta property="og:type" content="{og_type}">
  <meta property="og:site_name" content="TrucXpress">
  <meta property="og:title" content="{e(title)}">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{OG}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{e(title)}">
  <meta name="twitter:description" content="{e(desc)}">
  <meta name="twitter:image" content="{OG}">
  <meta name="theme-color" content="#04060d">
{ld}
  <!-- /SEO -->
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/img/icon-192.png" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="stylesheet" href="assets/css/style.css?v={V}">
</head>
<body>
  <div class="page-glow"></div>
  <div class="grain"></div>
'''


def popup_attrs(p):
    a = f' data-popup="{p.get("popup", "hire")}"'
    if p.get('equipment'):
        a += f' data-equipment="{html.escape(p["equipment"])}"'
    return a


def nice_date(iso):
    d = date.fromisoformat(iso)
    return d.strftime('%B %-d, %Y')


def faq_html(faqs):
    if not faqs:
        return ''
    items = '\n'.join(
        f'''          <details class="faq-item"{" open" if i == 0 else ""}>
            <summary>{inline(f["q"])}<span class="faq-x"></span></summary>
            <div class="faq-a">{"".join(f"<p>{inline(a)}</p>" for a in f["a"])}</div>
          </details>''' for i, f in enumerate(faqs))
    return f'''        <h2 id="faq">Frequently asked questions</h2>
        <div class="faq-list article-faq">
{items}
        </div>'''


def related_html(p, by_slug):
    cards = []
    for s in p['related']:
        r = by_slug.get(s)
        if not r:
            raise SystemExit(f'{p["slug"]}: related page "{s}" not found')
        label = 'Guide' if r['type'] == 'landing' else r.get('category', 'Blog')
        cards.append(f'''        <a class="card related-card" href="{r["file"]}">
          <span class="tag">{html.escape(label)}</span>
          <h3>{inline(r["title"])}</h3>
          <p>{inline(r["description"])}</p>
          <span class="read-more">Read more {ARROW}</span>
        </a>''')
    if not cards:
        return ''
    return f'''      <div class="related">
        <h2>Keep reading</h2>
        <div class="grid-3">
{chr(10).join(cards)}
        </div>
      </div>'''


# ------------------------------------------------------------------ page builders
def build_page(p, by_slug, landings):
    lede, body, faqs, words = render_body(p['body'])
    url = f'{SITE}/{p["file"]}'
    is_post = p['type'] == 'post'
    crumb_name, crumb_url = ('Blog', 'blog.html') if is_post else ('Services', 'services.html')
    breadcrumb = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
        {'@type': 'ListItem', 'position': 2, 'name': crumb_name, 'item': f'{SITE}/{crumb_url}'},
        {'@type': 'ListItem', 'position': 3, 'name': p['title'], 'item': url}]}
    schemas = []
    if is_post:
        author = AUTHORS[p['author']]
        schemas.append({'@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': p['title'],
                        'description': p['description'], 'image': OG, 'datePublished': p['date'],
                        'dateModified': p.get('updated', p['date']), 'author': author['schema'],
                        'publisher': {'@id': SITE + '/#business'}, 'mainEntityOfPage': url,
                        'wordCount': words, 'articleSection': p['category']})
    else:
        schemas.append({'@context': 'https://schema.org', '@type': 'Service', 'name': p['title'],
                        'serviceType': p.get('service_type', p['title']), 'description': p['description'],
                        'provider': {'@id': SITE + '/#business'}, 'url': url,
                        'areaServed': {'@type': 'Country', 'name': 'United States'}})
    schemas.append(breadcrumb)
    if faqs:
        schemas.append({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
            {'@type': 'Question', 'name': f['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': f['a_text']}}
            for f in faqs]})

    minutes = max(3, math.ceil(words / 220))
    cta_label = p.get('cta_label', 'Work With Us')
    pop = popup_attrs(p)

    if is_post:
        a = AUTHORS[p['author']]
        top = f'''        <div class="post-meta"><span class="tag">{html.escape(p["category"])}</span><span>{minutes} min read</span><span>{nice_date(p["date"])}</span></div>
        <h1>{inline(p["title"])}</h1>
        <p class="lede">{lede}</p>
        <div class="byline">
          <span class="avatar">{a["initials"]}</span>
          <div><strong>By {html.escape(a["name"])}</strong><span>{html.escape(a["role"])}</span></div>
        </div>'''
        bottom_author = f'''        <div class="author-card">
          <span class="avatar">{a["initials"]}</span>
          <div><span class="eyebrow-sm">Written by</span><strong>{html.escape(a["name"])}</strong><em>{html.escape(a["role"])}</em><p>{html.escape(a["bio"])}</p></div>
        </div>'''
    else:
        chips = ''.join(f'<span>✓ {html.escape(h)}</span>' for h in p['highlights'])
        top = f'''        <span class="eyebrow">{html.escape(p.get("eyebrow", "Dispatch Service"))}</span>
        <h1>{inline(p["title"])}</h1>
        <p class="lede">{lede}</p>
        {f'<div class="hl-chips">{chips}</div>' if chips else ''}
        <div class="article-ctas">
          <a href="contact.html" class="btn btn-primary"{pop}>{html.escape(cta_label)} {ARROW}</a>
          <a href="tel:+19286132787" class="btn btn-ghost">Call +1 (928) 613-2787</a>
        </div>'''
        bottom_author = ''

    page = head(p['seo_title'], p['description'], url, 'article' if is_post else 'website', schemas)
    page += nav('Blogs' if is_post else 'Services') + '\n\n'
    page += f'''  <section class="section article-wrap">
    <div class="container">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><a href="{crumb_url}">{crumb_name}</a><span>/</span><span aria-current="page">{inline(p["title"])}</span></nav>
      <article class="article">
{top}
        <div class="article-body">
{body}
        </div>
{faq_html(faqs)}
{bottom_author}
        <div class="cta-banner reveal article-cta-banner">
          <h2>{inline(p.get("cta_title", "Ready to keep your truck loaded?"))}</h2>
          <p>{inline(p.get("cta_text", "Commission-only dispatching. No upfront fees, no forced loads."))}</p>
          <a href="contact.html" class="btn btn-primary"{pop}>{html.escape(cta_label)} {ARROW}</a>
          <div class="road-line"></div>
        </div>
      </article>
{related_html(p, by_slug)}
    </div>
  </section>

'''
    page += footer(landings)
    (ROOT / p['file']).write_text(page, encoding='utf-8')
    return words


# ------------------------------------------------------------------ site-wide refresh
def refresh_footers(landings):
    cols = footer_columns(landings)
    old_services = re.compile(r'        <div>\n          <h4>Services</h4>\n          <div class="footer-links">\n.*?\n          </div>\n        </div>', re.S)
    marked = re.compile(r'        <!-- FOOTER-LINKS -->.*?<!-- /FOOTER-LINKS -->', re.S)
    for f in ROOT.glob('*.html'):
        s = f.read_text(encoding='utf-8')
        if marked.search(s):
            s = marked.sub(lambda m: cols, s, count=1)
        elif old_services.search(s):
            s = old_services.sub(lambda m: cols, s, count=1)
        s = re.sub(r'\?v=\d+', f'?v={V}', s)
        f.write_text(s, encoding='utf-8')


def blog_listing(posts):
    cats = sorted({p['category'] for p in posts})
    chips = '<button class="chip active" data-filter="all">All</button>' + ''.join(
        f'<button class="chip" data-filter="{slugify(c)}">{html.escape(c)}</button>' for c in cats)
    cards = []
    for p in posts:
        a = AUTHORS[p['author']]
        icon = CATEGORY_ICONS.get(p['category'], CATEGORY_ICONS['Operations'])
        _, _, _, words = render_body(p['body'])
        cards.append(f'''        <article class="card post-card" data-cat="{slugify(p["category"])}">
          <a href="{p["file"]}" class="post-art" aria-hidden="true" tabindex="-1">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">{icon}</svg>
          </a>
          <div class="post-body">
            <div class="post-meta"><span class="tag">{html.escape(p["category"])}</span><span>{max(3, math.ceil(words / 220))} min read</span></div>
            <h3><a href="{p["file"]}">{inline(p["title"])}</a></h3>
            <p>{inline(p["description"])}</p>
            <span class="post-author">By {html.escape(a["name"])}</span>
            <a class="read-more" href="{p["file"]}">Read More {ARROW}</a>
          </div>
        </article>''')
    return f'''  <!-- POSTS -->
  <section class="section">
    <div class="container">
      <div class="blog-filters" role="group" aria-label="Filter posts by topic">{chips}</div>
      <div class="grid-3" id="post-grid">
{chr(10).join(cards)}
      </div>
    </div>
  </section>
  <script>
    (function () {{
      var chips = document.querySelectorAll('.blog-filters .chip');
      chips.forEach(function (c) {{
        c.addEventListener('click', function () {{
          chips.forEach(function (x) {{ x.classList.toggle('active', x === c); }});
          var f = c.dataset.filter;
          document.querySelectorAll('#post-grid .post-card').forEach(function (card) {{
            card.hidden = !(f === 'all' || card.dataset.cat === f);
          }});
        }});
      }});
    }})();
  </script>
  <!-- /POSTS -->'''


def refresh_blog(posts):
    f = ROOT / 'blog.html'
    s = f.read_text(encoding='utf-8')
    block = blog_listing(posts)
    if '<!-- POSTS -->' in s and '<!-- /POSTS -->' in s:
        s = re.sub(r'  <!-- POSTS -->.*?<!-- /POSTS -->', lambda m: block, s, count=1, flags=re.S)
    else:
        s = re.sub(r'  <!-- ================= POSTS ================= -->\n  <section class="section">.*?</section>',
                   lambda m: block, s, count=1, flags=re.S)
    f.write_text(s, encoding='utf-8')


def guide_links(landings):
    eq = [p for p in landings if p.get('group') == 'equipment']
    sv = [p for p in landings if p.get('group') == 'service']
    links = ''.join(f'<a href="{p["file"]}">{html.escape(p["short"])}</a>' for p in eq + sv)
    return f'<!-- GUIDE-LINKS --><div class="guide-links reveal"><span>Dispatch guides:</span>{links}</div><!-- /GUIDE-LINKS -->'


def refresh_guides(landings):
    block = guide_links(landings)
    for name, anchor in (('index.html', 'id="load-types"'), ('services.html', 'WHAT WE OFFER')):
        f = ROOT / name
        s = f.read_text(encoding='utf-8')
        if '<!-- GUIDE-LINKS -->' in s:
            s = re.sub(r'<!-- GUIDE-LINKS -->.*?<!-- /GUIDE-LINKS -->', lambda m: block, s, count=1, flags=re.S)
        elif name == 'index.html':
            # after the "Find Now" button row in the load types section
            s = re.sub(r'(<section class="section" id="load-types".*?data-popup="findload">.*?</a>\n      </div>)',
                       lambda m: m.group(1) + '\n      ' + block, s, count=1, flags=re.S)
        else:
            # under the six service cards
            s = re.sub(r'(<span class="eyebrow">What We Offer</span>.*?<div class="grid-3" data-stagger>.*?</article>\n      </div>)',
                       lambda m: m.group(1) + '\n      ' + block, s, count=1, flags=re.S)
        f.write_text(s, encoding='utf-8')


def refresh_sitemap():
    prio = {'index.html': '1.0', 'services.html': '0.9', 'blog.html': '0.7', 'about-us.html': '0.6', 'contact.html': '0.6'}
    rows = []
    for f in sorted(ROOT.glob('*.html')):
        loc = SITE + '/' if f.name == 'index.html' else f'{SITE}/{f.name}'
        p = prio.get(f.name, '0.8' if not f.name.startswith('blog-') else '0.6')
        rows.append(f'  <url><loc>{loc}</loc><lastmod>{TODAY}</lastmod><priority>{p}</priority></url>')
    (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n'
                                      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                      + '\n'.join(rows) + '\n</urlset>\n', encoding='utf-8')
    return len(rows)


def page_url(name):
    """File stem -> public path: index -> '', services-flatbed -> services/flatbed."""
    if name == 'index':
        return ''
    if name.startswith('services-'):
        return 'services/' + name[len('services-'):]
    return name


def clean_urls():
    """Link pages without '.html' (trucxpress.com/contact, /services/flatbed).
    .htaccess maps those addresses back to the files and 301s the old ones.
    Assets get root paths so pages under /services/ load them too.
    Runs last so templates and hand-written pages can keep plain file names."""
    rel = re.compile(r'(href=")(?![a-z]+:|/|#)([a-z0-9-]+)\.html(#[^"]*)?"')
    absu = re.compile(re.escape(SITE) + r'/([a-z0-9-]+)\.html')
    asset = re.compile(r'((?:href|src)=")(?:\./)?assets/')
    for f in list(ROOT.glob('*.html')) + [ROOT / 'sitemap.xml']:
        text = f.read_text(encoding='utf-8')
        new = rel.sub(lambda m: f'{m.group(1)}/{page_url(m.group(2))}{m.group(3) or ""}"', text)
        new = absu.sub(lambda m: f'{SITE}/{page_url(m.group(1))}', new)
        new = asset.sub(r'\1/assets/', new).replace('"./assets/', '"/assets/')
        if new != text:
            f.write_text(new, encoding='utf-8')


def main():
    pages = [parse(p) for p in sorted(CONTENT.glob('*.md'))]
    by_slug = {p['slug']: p for p in pages}
    landings = sorted([p for p in pages if p['type'] == 'landing'], key=lambda p: int(p.get('order', 99)))
    posts = sorted([p for p in pages if p['type'] == 'post'], key=lambda p: (p['date'], p.get('order', '0')), reverse=True)
    total = 0
    for p in pages:
        w = build_page(p, by_slug, landings)
        total += w
        print(f'  {p["file"]:52} {w:>5} words')
    refresh_blog(posts)
    refresh_guides(landings)
    refresh_footers(landings)
    n = refresh_sitemap()
    clean_urls()
    print(f'built {len(pages)} pages ({len(landings)} landing, {len(posts)} posts), {total} words; sitemap {n} URLs')


if __name__ == '__main__':
    main()
