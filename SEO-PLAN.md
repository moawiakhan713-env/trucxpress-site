# TrucXpress SEO plan

Keyword map, content plan and the setup steps that only the site owner can do.
Written 2026-11-07, after the technical SEO pass (titles, descriptions,
canonical tags, social cards, schema, sitemap, robots.txt, old-URL redirects).

## Where the keywords came from

From who ranks today for dispatch searches and the words they use
(O Trucking, DAT, FreightWaves guides, many small dispatch sites), plus the
TrucXpress offer itself. There are **no search-volume numbers** here: those come
from Google Keyword Planner (free with a Google Ads account, no need to run ads)
or Ubersuggest's free tier. Use them to pick between keywords in the same group,
not to replace the groups.

What competitors do that works: one page per **equipment type** and per **state
or city** ("flatbed dispatch Arizona", "power only dispatch Phoenix"), plus
**guides for new authorities** and **pricing pages**. That is the pattern to copy,
with real content on each page, not the same text with the city swapped.

## Keyword map (one main keyword per page)

| Page | Main keyword | Supporting keywords |
|---|---|---|
| Home `/` | truck dispatch services | dispatch services for owner operators, truck dispatcher for owner operators, commission truck dispatch |
| Services | truck dispatching services | freight dispatch services, load booking service, carrier setup packets, broker vetting |
| About | truck dispatch company | carrier-first dispatch, dispatch company Phoenix |
| Contact | truck dispatch Phoenix AZ | dispatch service Arizona, hire a truck dispatcher |
| Blog | truck dispatch tips | owner operator tips, new authority tips |

### Landing pages (built 2026-11-07)

| New page | Main keyword | Why |
|---|---|---|
| `/dispatch-for-new-authority.html` | dispatch for new authority | New MCs search this a lot and many dispatchers refuse them. TrucXpress takes them. |
| `/dispatch-pricing.html` | how much do truck dispatchers charge | Buyers compare price before calling. Explain commission-only clearly. |
| `/dry-van-dispatch.html` | dry van dispatch service | Equipment pages, one each. |
| `/reefer-dispatch.html` | reefer dispatch service | |
| `/flatbed-dispatch.html` | flatbed dispatch service | |
| `/power-only-dispatch.html` | power only dispatch | |
| `/box-truck-dispatch.html` | box truck dispatch service | Box truck owners are a big, underserved group. |
| `/hotshot-dispatch.html` | hotshot dispatch service | |
| `/truck-dispatch-arizona.html` | truck dispatch Arizona | Local page backed by the Phoenix office. Add Texas, California, Georgia later. |

## Blog topics (all 12 written 2026-11-07, plus the 3 earlier posts)

1. How much do truck dispatchers charge? (truck dispatcher fees)
2. Dispatch percentage vs flat fee: which is cheaper for one truck?
3. How to get loads with a new MC number (loads for new authority)
4. What is a carrier setup packet and what goes in it
5. How to check if a freight broker is legit (verify freight broker)
6. Spot rate vs contract rate for owner-operators
7. Best lanes for dry van out of Arizona (dry van lanes Arizona)
8. Reefer loads: what pays and what to avoid
9. Power only trucking: how it works and who it suits
10. Box truck loads: how to find them without a CDL A
11. Factoring for small carriers: what to ask before signing
12. Detention pay: how to get paid for waiting at the dock

Two posts a month is enough. Consistency matters more than volume.

## How to write each page or post

1. **Pick one main keyword.** Search it on Google first and read the top five
   results. Write something more useful than all of them, not longer for its own sake.
2. **Put the keyword in four places:** the title tag, the H1, the first two
   sentences, and the page URL. Use supporting keywords naturally in H2 headings.
3. **Answer the question in the first paragraph.** "Most truck dispatchers charge
   5 to 10 percent of the load." Then explain.
4. **Use real experience.** Actual lanes, rates you have seen, mistakes carriers
   make, a short story from a real load (no names). This is what generic SEO
   agencies cannot write and what Google rewards.
5. **Structure:** H1, short intro, 4 to 7 H2 sections, a short FAQ (3 to 5
   questions), and a call to action that opens the matching popup.
6. **Link inside the site:** every post links to the services page and to one
   related post; equipment pages link to the matching blog posts.
7. **Name the author.** "By Moawia Khan, Founder" with one line of experience
   builds trust with both carriers and Google.
8. **Length:** the current pages run 500 to 750 words, enough to answer each
   question fully. Once Search Console shows which pages get impressions,
   expand those to 900 to 1,500 words with more real examples. Never copy
   text between pages.
9. **Update** the date and facts on posts every 6 to 12 months.

## Steps only the owner can do (account access needed)

1. **Google Search Console** (search.google.com/search-console): add
   `trucxpress.com` as a Domain property, verify with the DNS TXT record in
   Hostinger hPanel (Domains → DNS / Nameservers), then submit
   `https://trucxpress.com/sitemap.xml` under Sitemaps. Use URL Inspection →
   Request indexing on the home page.
2. **Google Business Profile** (business.google.com) for the Phoenix office.
   This is what puts TrucXpress on Google Maps for "truck dispatch Phoenix".
   Same name, address and phone as the website, category "Trucking company" or
   "Logistics service", and ask happy carriers for reviews.
3. **Bing Webmaster Tools**: import from Search Console in one click.
4. **Consistent listings**: Facebook page, LinkedIn company page, and trucking
   directories, all with the exact same name, address and phone number. Then
   send the profile URLs so they can be added to the site and to the schema
   (`sameAs`).

## About the "your site is not on Google" emails

They are automated outreach sent to almost every new domain. Do not pay
anyone who cannot show which keywords they will target and what they will
publish. Everything in this file can be done in-house.

## Adding or editing a page

All landing pages and blog posts live as text files in `content/`. To add a
post, copy an existing `content/blog-*.md`, change the front matter (slug,
title, description, author: founder, dispatcher or sales) and the text, then run:

    python3 tools/build.py

The script rebuilds every page, the blog listing, footer links, the guide
links on the home and services pages, and sitemap.xml. Bylines: founder posts
show "Moawia Khan, Founder & CEO"; dispatcher and sales posts show the team role.
