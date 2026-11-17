# SEO Worker

A Cloudflare Worker that sits in front of Azure Static Web Apps on
`www.3dprintlog.com/prints/*`, `/projects/*` and `/users/*`. For a public print, project or
profile it writes that page's title, description, canonical link, Open Graph and Twitter tags,
JSON-LD and a short HTML summary into the app shell, so search engines and link-preview bots
that don't run JavaScript see the page instead of "Loading… — 3D Print Log".

Part of HoffmanEngineering/3d-print-log-api#281. The metadata comes from the API's anonymous
`GET /api/{Prints,Projects,Users}/{id}/seo` (`SeoController`, see "Public images and SEO
metadata" in the API repo's `AGENTS.md`).

## What it does

| Request                                                                                                                               | Result                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `GET`/`HEAD` `/prints/{id}`, `/projects/{guid}`, `/users/{id}`, `/users/{id}/achievements` (trailing slash allowed, any query string) | Fetches the shell from the origin and `/seo` in parallel, then rewrites the shell (below) |
| Anything else: `/prints/new`, `/prints/123/edit`, `/prints/copy/1`, non-numeric ids, `POST`, …                                        | `fetch(request)`, untouched                                                               |

Print and user ids are 64-bit integers. **Project ids are GUIDs**, not digits: that is what the
app's `/projects/:id` and the API's `Projects/{id:Guid}` use, so `/projects/123` passes through.

Depending on `/seo`:

- **200:** the shell's `<title>` is replaced, and every `meta[name=description]`,
  `link[rel=canonical]`, `og:*`, `twitter:*`, `robots`/`googlebot` meta, JSON-LD script and
  the Markdown-twin `link[rel=alternate]` (inherited from the home page) is removed and written
  once from `/seo`: `description`, `canonical`, `og:site_name`, `og:type` (`article` for a print
  or project, `profile` for a user), `og:title`, `og:description`, `og:url`, `og:image` (+
  `width`/`height` when known, `alt`), `twitter:card` (`summary_large_image` with an image,
  `summary` without), `twitter:title`/`description`/`image`/`image:alt`, and one
  `<script type="application/ld+json">`. A summary goes inside `<app-root>`.
  - **The shell's `noindex` is removed.** Every shell carries `robots`/`googlebot` `noindex`
    (`scripts/shell-lib.mjs`), and nothing in the app removes it, so public pages are noindexed
    for any crawler today. The Worker is what makes them indexable.
  - The canonical URL is kept on `SITE_ORIGIN`: if the API ever names another host, the path is
    kept and the host replaced (and it's logged).
- **404** (not public: private, unlisted, missing; the same for the owner): the shell with
  status **404** and one `<meta name="robots" content="noindex">`. Nothing else changes, so the
  SPA still boots: the shell's scripts are untouched and the app fetches the print with the
  visitor's own token, so an owner viewing their own private print still sees it. Browsers
  run a page's scripts whatever its status.
- **Anything else fails open**, returning the origin response exactly as received (body,
  status, headers, ETag) and logging a `console.warn` line: a timeout (`SEO_TIMEOUT_MS`,
  1.5 s), a network error, a status other than 200/404 (429 from the API's anonymous rate
  limit included), non-JSON, an unexpected shape, a bad `SITE_ORIGIN`, or a 404 whose body
  says "No endpoint exists at this path". That last one is an API without `/seo` (not
  deployed yet, or rolled back), and treating it as "not public" would turn every public page
  into a 404.
- **An origin response that isn't a 200 `text/html`** (redirect, 304, 404 page, error) passes
  through untouched.

`HEAD` gets the same status and headers as `GET`, with no body.

### Headers and caching

- All origin headers are kept (the `globalHeaders` security headers, the report-only CSP,
  `Link`, `Content-Encoding`). `content-length`, `etag` and `last-modified` are dropped on a
  rewritten page: the length changes, and the shell's validators would let a browser get a 304
  for a page whose metadata changed. The Worker strips `If-None-Match`/`If-Modified-Since`/
  `Range` from the request it sends the origin for the same reason. Rewritten responses carry
  `x-seo-worker: rewritten` or `not-public`, which makes the Worker easy to spot with `curl -I`.
- `Cache-Control` is the origin's (today `public, must-revalidate, max-age=30` on shells),
  unless it would allow longer than the `/seo` answer: then it becomes
  `public, max-age=<seo max-age>`. `no-cache`/`no-store`/`private` from the origin are kept.
- `/seo` is cached in the colo's Cache API for its `max-age` (the API sends 300 s; the Worker
  caps it at 300 s). Only the JSON and a fresh `Cache-Control` are stored, never the API's
  other headers. 404s are not cached, because the API sends them without `Cache-Control`.

### Decisions

- **Summary after the skeleton, not instead of it.** The summary (`<article
class="app-seo-summary">`: title as `<h1>`, "By" author link, description, image with
  `width`/`height` and `loading="lazy"`, facts as a `<dl>`) is appended to `<app-root>` after the
  shell's loading skeleton. The skeleton's `__center` block is `min-height: calc(100vh - 64px)`,
  so the summary starts below the fold. People see the same spinner they see today (no flash of
  unstyled text, no layout shift when Angular replaces `<app-root>`), and the lazy image isn't
  fetched by someone who never scrolls. It's still ordinary visible content, not hidden text, so
  crawlers and no-JS readers get it without anything that looks like cloaking.
- **JSON-LD types.** Print: `CreativeWork` (a made, documented thing; `Product` would imply an
  offer and `HowTo` steps it doesn't have), with `ImageObject`, `author` `Person`,
  `datePublished`/`dateModified`, `mainEntityOfPage`. Project: `CollectionPage` (a page that
  gathers several prints). Profile: `ProfilePage` whose `mainEntity` is the `Person`, which is
  the shape Google documents for profile pages. All are `isPartOf` the `WebSite`. `<`, `>`, `&`,
  U+2028 and U+2029 are `\u` escaped, so nothing from the API can close the script.
- **Escaping.** Every text and attribute value is HTML-escaped (`&<>"'`). Image, author and
  canonical URLs must be absolute `http(s)`: anything else (`javascript:`, `data:`,
  protocol-relative) drops the image or the author link, and a non-http canonical fails open.
- **Routes live in the dashboard, not `wrangler.jsonc`**, so a redeploy never re-adds a route
  someone removed to roll back.

## Config (`vars` in `wrangler.jsonc`)

| Var              | Production                   | Purpose                                                                    |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `API_BASE_URL`   | `https://api.3dprintlog.com` | Where `/api/.../seo` lives                                                 |
| `SITE_ORIGIN`    | `https://www.3dprintlog.com` | The canonical host                                                         |
| `SEO_TIMEOUT_MS` | `1500`                       | How long to wait for `/seo` before failing open                            |
| `ORIGIN_URL`     | unset                        | Local dev only: fetch pages from this origin instead of the request's host |

No secrets: the Worker only reads public endpoints.

## Local development

Needs Node 22.12+. The package is separate from the Angular app (its own `package.json` and
lockfile; the app's tsconfig, ESLint, unit tests and build ignore `cloudflare/`).

```bash
cd cloudflare/seo-worker
npm ci
npm run dev        # wrangler dev on http://127.0.0.1:8790, pages from production
curl -s --compressed http://127.0.0.1:8790/prints/<public id> | grep -E 'og:|<title>'
```

`npm run dev` sets `ORIGIN_URL=https://www.3dprintlog.com`, so pages come from the live site
and `/seo` from the production API. Port 8790 keeps clear of the app (4200) and the API (5000).
For a local API, add `--var API_BASE_URL:https://localhost:5001` (or whatever it listens on).
Stop the dev server when done; if it hangs on to the port, kill it by port.

## Tests

```bash
npm test           # Vitest inside workerd (@cloudflare/vitest-plugin)
npm run typecheck
```

The tests run in the Workers runtime, so `HTMLRewriter`, the Cache API and
`AbortSignal.timeout` are the real ones. Outbound `fetch` (origin and API) is mocked per test.
`test/worker.test.ts` rewrites `test/fixtures/app-shell.html`, a real shell copied from
`https://www.3dprintlog.com/prints/1`. After a change to `src/shells/`, `scripts/shell-lib.mjs` or
`src/index.prod.html`, refresh it from a build (`npm run build` at the repo root, then
`npm run fixture:shell` here).

`@cloudflare/vitest-plugin` is the current name of `@cloudflare/vitest-pool-workers`, which is
deprecated. Dependencies are pinned exactly. `.npmrc` sets `legacy-peer-deps` because npm 10's
resolver crashes (`Cannot read properties of null (reading 'edgesOut')`) on Vitest 5's optional
peers. `vite` is listed directly for the same reason.

CI (`.github/workflows/ci.yml`, job `seo-worker`) runs the typecheck, the tests and
`wrangler deploy --dry-run` on every PR.

## Deploy

`.github/workflows/deploy-seo-worker.yml`, manual (`workflow_dispatch`): tests, then
`wrangler deploy` behind the `production` environment's approval. Deploying uploads the Worker;
traffic reaches it only through the routes added in the dashboard.

## Manual setup checklist

Chris does these in order. Nothing here has been done yet.

1. **Deploy the API first.** The release with 3d-print-log-api#285 must be live:
   `curl -s -o /dev/null -w '%{http_code}\n' https://api.3dprintlog.com/api/Prints/<public id>/seo`
   should print `200` (it prints `404` today). The Worker fails open on the API's no-route 404,
   but a working `/seo` is the point. Also run the image backfill (`docs/image-backfill.md` in
   the API repo) so social images exist.
2. **Create a Cloudflare account** (free plan is enough) and **add the zone** `3dprintlog.com`.
3. **Check every DNS record Cloudflare imported** against the current provider (today
   Namecheap: `dns1/dns2.registrar-servers.com`). Don't trust the import scan and don't guess
   values: compare record by record against the Namecheap dashboard. In particular:
   - `www` CNAME to the Static Web App (`*.azurestaticapps.net`), and the apex record SWA uses
     for `3dprintlog.com`, plus any `TXT`/`asuid`-style validation records for SWA custom
     domains.
   - `api` CNAME to the App Service (`*.azurewebsites.net`) and its `asuid.api` TXT
     verification record.
   - Email: SES (us-east-2) DKIM CNAMEs (`*._domainkey`), the custom MAIL FROM domain's MX and
     SPF TXT if one is set up, the apex SPF TXT, `_dmarc` TXT, and any MX for inbound mail.
   - Anything else (Google site verification, Auth0 custom domain, etc.).
4. **Proxy settings.** `www` must be proxied (orange cloud) for the Worker to run. Start with
   `api` and the apex as **DNS only** (gray cloud): App Service and SWA validate and renew their
   managed certificates against those names, and proxying isn't needed for this Worker. Email
   records are never proxied.
5. **Move the nameservers** at Namecheap to the two Cloudflare gives you, and wait for the zone
   to show Active.
6. **SSL/TLS mode: Full (strict).** SWA and App Service both serve valid certificates.
   Flexible would cause a redirect loop with SWA's HTTPS redirect.
7. **Confirm the SWA custom domains still validate** behind the proxy: Azure portal, Static Web
   App, Custom domains, both `www` and the apex show Ready. If `www` shows a validation or
   certificate-renewal problem while proxied, switch it to DNS-only, let it validate, then
   proxy it again (or validate with a TXT record), and check again before the next renewal.
8. **Create an API token** (My Profile, API Tokens, Create Token): permission Account,
   **Workers Scripts: Edit**, limited to this account. Zone, Workers Routes: Edit is only needed
   if routes are ever moved into `wrangler.jsonc`.
9. **GitHub:** on the `production` environment of 3d-print-log-ui, add secret
   `CLOUDFLARE_API_TOKEN`; add variable `CLOUDFLARE_ACCOUNT_ID` (repository or `production`
   environment; the id is on the account's Workers overview page).
10. **Run the deploy workflow** (Actions, Deploy SEO Worker, Run workflow) and approve the
    `production` deployment. This uploads `printlog-seo`; no traffic reaches it yet.
11. **Add the routes** (Workers & Pages, `printlog-seo`, Settings, Domains & Routes, or the
    zone's Workers Routes), each with Worker `printlog-seo`:
    `www.3dprintlog.com/prints/*`, `www.3dprintlog.com/projects/*`, `www.3dprintlog.com/users/*`.
    Failure mode: leave "fail open" (the default), so a Worker over its limits passes requests
    to the origin.
12. **Verify:**
    - `curl -s -A "Discordbot" https://www.3dprintlog.com/prints/<public id> | grep -E '<title>|og:|twitter:|ld\+json|noindex'`
      shows the print's title and tags and no `noindex`.
    - `curl -sI https://www.3dprintlog.com/prints/<public id>` shows `x-seo-worker: rewritten`
      and the security headers (`strict-transport-security`, `x-frame-options`, the CSP).
    - A private print: `curl -sI https://www.3dprintlog.com/prints/<private id>` is `404` with
      `x-seo-worker: not-public`; signed in, the owner can still open it in the browser.
    - `/prints/new`, `/prints/<id>/edit` and a signed-in session work as before.
    - Facebook Sharing Debugger (developers.facebook.com/tools/debug) and the X/Twitter card
      preview (post composer or a card validator) show the image and title.
    - Workers Logs (observability is on) show no stream of `seo unavailable` warnings. A run
      of `status 429` means the API's anonymous per-IP limit (`Api:AnonymousRateLimitPerMinute`,
      600/min) is being hit by Cloudflare's egress IPs; raise it or exempt `/seo`.
13. **Rollback:** delete the three routes in the dashboard. Traffic goes straight to SWA again
    immediately; the deployed Worker can stay. A redeploy does not re-add them.

### The apex redirect

`https://3dprintlog.com/...` answers `301` to `https://www.3dprintlog.com/...` today. That is
Static Web Apps (most likely the `www` custom domain set as the default domain; the response carries the
`staticwebapp.config.json` global headers), not a rule in this repo. Nothing changes: the
Worker's routes are on `www` only, so an apex request still reaches SWA, gets the redirect, and
the follow-up `www` request runs the Worker. If the apex is ever proxied, a Cloudflare redirect
rule could do the same at the edge, but it isn't needed.
