# Folio site template

A small site, published by the Folio controller from this repository: push to `main` and it is live at `https://<name>.oztozlu.dev`, open to everyone, to the people you name, or to whoever has the password. A site can also have an **admin area** (`/admin`, `/api/admin`) that only its admins reach, even when the site itself is public.

There are three Folio templates; pick by what you are making:

| Template | Makes | Lives at | Who can open it |
| --- | --- | --- | --- |
| `folio-play-template` | a game | `oztozlu.dev/play/<name>`, part of Folio | everyone |
| `folio-lab-template` | an experiment or simulation | `oztozlu.dev/lab/<name>`, part of Folio | everyone |
| `folio-site-template` (this one) | a separate site | `<name>.oztozlu.dev` | everyone, people you name, or whoever has a password; optional protected admin area |

## Start a site

1. **Use this template** on GitHub and name the repository. The name, in lower case, becomes the address (`<name>.oztozlu.dev`) unless `site.yaml` sets `name`. The repository may be public or private: who can read the site is set in `site.yaml`, not by the repository's visibility.
2. Edit `site.yaml` and the pages in `src/content/pages` (Markdown with a `title`, and `order` for the menu).
3. Push to `main`.

That is all: the controller builds, deploys, creates the address and, if asked, the sign-in. No secrets (except a password site's own password), DNS records or Cloudflare settings, and nothing to change in the Folio repository. The first commit made by *Use this template* is picked up by itself.

```sh
pnpm install
pnpm dev            # http://localhost:4321
pnpm test           # the encryption, the leak check and the manifest rules
pnpm build          # dist/; for a password site, FOLIO_PASSWORD=… pnpm build
```

Requires Node 26 (`.node-version`) and pnpm 12.

## What happens after a push

1. `.github/workflows/folio.yml` installs, tests and builds the site, with access to nothing but `FOLIO_PASSWORD` (a password site's only secret), and keeps `dist/` as the `folio-site` artifact (14 days).
2. The Folio controller (a GitHub App and its own workflow, in the private `folio-controller` repository) hears the build finish. It reads `site.yaml` **from the same commit as the build** and checks the files (below).
3. For `access: access` and for an admin area, it creates or updates their Cloudflare Access applications **before** the address answers, so the site is never briefly open.
4. It deploys the files behind its own Worker (`folio-r<repository id>`; the repository can't bring its own Worker code), attaches `<name>.oztozlu.dev`, and then requests the address: the front page must answer as its access model says, and `/admin/` must answer 404 without an admin area and ask for sign-in with one. A protected site that answers openly is detached at once and the deploy fails.

A push is usually live within two minutes. Your own computer may remember for a while that a brand-new address didn't exist yet (negative DNS caching): another network, or a few minutes, shows it.

**If something goes wrong**, the last good version stays online:

- a failed test or build: nothing is published; the next push tries again;
- a deploy the controller refuses or can't finish: the repository is marked as failing in the controller's run log, with the reason, and is tried again after 10, 20, 40, 80 and 160 minutes (a new commit starts over).

**Going back**: revert the commit and push.

## site.yaml

```yaml
kind: site
access: public              # public (default) · access · password
name: my-site               # the address, my-site.oztozlu.dev. Default: the repository's name in lower case
title: { en: My site }      # used in the page titles

# access: access only
login: [otp, google]        # how people sign in: otp (default), google, or both
allow: [you@example.com, friend@example.com]   # who may; at least one person or service token
deny: [someone@example.com] # refused even if allowed (and even if Google says yes)
serviceTokens: [ci-check]   # Access service tokens, by name, for automated checks

# optional, whatever `access` says
admin:
  enabled: true             # default false; without it /admin and /api/admin answer 404
  login: google             # otp (default), google, or both
  allow: [you@example.com]  # who may; at least one person or service token
  deny: []
  serviceTokens: []
```

Emails are compared in lower case. `allow`, `deny`, `serviceTokens` and `login` at the top level only mean something with `access: access`; a file that uses them otherwise is refused with `allow, deny and serviceTokens only apply to access`.

`folio.yaml` is the old name of this file and is still read; a repository with **both** files stops the build and the controller changes nothing (`both site.yaml and folio.yaml are present; keep only site.yaml`), so a protected site is never opened by guessing which one is meant.

### The address

- Lower-case letters, digits and hyphens, 1 to 63 characters, not starting or ending with a hyphen.
- Reserved, never given to a site: `www`, `mail`, `smtp`, `imap`, `pop`, `mx`, `api`, `admin`, `app`, `apps`, `auth`, `login`, `vault`, `folio`, `controller`, `develop`, `preview`, `staging`, `status`, `cdn`, `static`, `assets`, `oztozlu`, `izzet`, `cv`, `play`, `lab`, `docs`, `blog`.
- First come, first served: an address another repository has, an address with DNS records the controller didn't make, or one attached to another Worker, is refused (`… belongs to another repository`, `… already has DNS records that the controller didn't create`, `… is attached to another Worker`).
- Changing `name` moves the site: the new address is attached, the old one detached.

## Who can read it

| `access` | Who reads it | How |
| --- | --- | --- |
| `public` | everyone | plain pages |
| `access` | the people in `allow` (and service tokens) | Cloudflare Access asks them to sign in. The site's Worker checks Access's token again on every request (below); if anything about the sign-in is wrong, the site refuses rather than opens. Responses are never cached and carry `noindex`. |
| `password` | anyone with the password | every page is encrypted at build (AES-256-GCM, key from PBKDF2-SHA-256 with 600 000 iterations) and opened in the browser. The password never leaves the browser; the derived key is kept for the tab only (**Lock** forgets it). Never cached, never indexed. |

### Setting a password

`access: password` needs a strong password (14 characters or more) as a secret of the repository, never in a file:

```sh
gh secret set FOLIO_PASSWORD -R <owner>/<repository>
```

Then push (or run the *Folio* workflow). Without the secret the build stops and nothing is published. Changing the password re-encrypts the site at the next build. The encrypted pages are public files: only the password's strength protects them, so use a long passphrase. In a password site, images go inside the pages as `data:` addresses: any separate file would be public, and the controller refuses to publish one.

## Signing in

Two login methods, set once for the whole account and reused by every site:

| `login` | What the person does | Set up |
| --- | --- | --- |
| `otp` (default) | enters their email, gets a one-time code from Cloudflare | always available |
| `google` | signs in with their Google account | set up once for the account (below) |

With both (`login: [otp, google]`) Access shows a choice. A site asking for Google when Google isn't set up fails to deploy (`Google sign-in is not set up for this account`) instead of falling back to something else.

### Google, once for the account

Already done for this account (8 November 2026); for the record, or to redo it:

1. In Google Cloud, a project (`oztozlu-sign-in`) with **Google Auth Platform** configured (app name, support email, audience *External*) and an OAuth client of type *Web application*, with origin `https://<team>.cloudflareaccess.com` and redirect URI `https://<team>.cloudflareaccess.com/cdn-cgi/access/callback`.
2. In Cloudflare Zero Trust, *Integrations → Identity providers → Google*, with that client's id and secret. Its *Test* button signs you in and shows what Access will see.
3. The login method's id goes into the controller's repository variable `ACCESS_IDP_GOOGLE`.

No site needs its own Google app: every `<name>.oztozlu.dev` signs in through the same Access team.

### Google's Testing and Production modes

The Google app is in **Testing**: only the Google accounts on its *Test users* list (at most 100 over the app's life) can sign in with Google at all; anyone else gets an error from Google before Access sees them. To let any Google account through, the app must be **published** (Google Auth Platform → Audience → *Publish app*), which needs a home page and a privacy policy on a domain listed under *Branding* (`https://oztozlu.dev` and `https://oztozlu.dev/privacy`, once Folio is live there). Because the app has a logo, Google then asks for brand verification (a few days, with the domain verified in Search Console); removing the logo avoids it. Only basic sign-in scopes are used (name, email, profile picture).

### Google's list and the site's list are different things

- **Google test users** decide who Google lets sign in to the app at all (only while in Testing).
- **`allow` / `deny`** decide who a site lets in, after Google (or the one-time code) has said who they are.

With Google in Testing, a person needs both: their account on the test users list and their email in `allow`. The one-time code needs only `allow`.

### Adding or removing someone

Edit `allow` or `deny` in `site.yaml` (and, for Google in Testing, the test users list) and push. The controller updates the Access application and the site's Worker together. Removal takes effect on the next request after the deploy: the Worker checks the person against the list it was deployed with on every request, so an Access session that is still valid doesn't keep them in. Sessions last 24 hours otherwise.

## An admin area

A public blog at `z.oztozlu.dev` with an admin area at `z.oztozlu.dev/admin`:

```yaml
kind: site
access: public
admin:
  enabled: true
  login: google
  allow: [you@example.com]
```

- `/`, `/posts`, `/posts/…` stay public; `/admin`, `/admin/…`, `/api/admin` and `/api/admin/…` need an admin's sign-in.
- The admin area has its own Access application (`folio-r<id>-admin`, for `<name>/admin` and `<name>/api/admin`) and its own list; the site's own `allow`, if any, doesn't open it.
- The site's Worker decides what an admin path is **after** decoding and normalising the address, so `/ADMIN`, `//admin`, `/x/../admin`, `/%61dmin`, `/%2561dmin`, `/admin.html` and `/admin;x` are admin paths too; a path it can't read safely (a bad encoding, a NUL, a backslash) is refused with 400. Each admin request needs a valid token from the admin application and a person on the admin list who isn't denied; otherwise 403.
- Without `admin.enabled`, every admin path answers 404, even on a public site: an `/admin` page in the build is never public by accident.
- Admin responses are never cached and carry `noindex`.

This is **protection for static admin pages**, not a CMS: there is no editor, database or API behind them (see *Implemented, deferred, limits*).

### The identity contract

How a site knows who is signed in, and what it may rely on:

- Cloudflare Access adds a signed token (`Cf-Access-Jwt-Assertion`) to each request it lets through. The site's Worker verifies it itself: RS256 signature against the team's published keys, issuer `https://<team>.cloudflareaccess.com`, audience of the right Access application, expiry and not-before (60 s leeway). Then the person (`email`) or service token (`common_name`, its client id) must be on the list and not denied.
- `GET /api/admin/whoami` answers a signed-in admin with that verified identity: `{"identity":{"email":"you@example.com"},"verifiedBy":"cloudflare-access"}`, or `{"identity":{"service":"<client id>"},…}` for a service token. An admin page's script may ask it who is signed in.
- Nothing the browser sends is trusted on its own: an email header, a cookie value or a role field in a request is never taken as identity.
- **Roles** (`admin`, `editor`, `viewer`) are not managed by the controller: signing in proves who someone is, not what they may do. When sites get server code, the application will check roles itself, on the server, from the verified identity the Worker passes it.

## Taking a site down

Delete `site.yaml`, archive the repository or delete it: the controller removes the address, the Worker and the site's Access applications within minutes. A deleted repository is noticed at once through GitHub's event; if that event is missed, the controller's sweep (every six hours) does it.

## What the controller accepts

- `index.html` at the root of `dist/`;
- no Worker code (`_worker.js`), no links, no paths leaving `dist/`;
- at most 5 000 files, 25 MiB per file, 100 MiB in all;
- for `access: password`: only pages (each one sealed), styles, scripts, fonts, `_headers` and the favicon; any other file would be public, so it is refused.

## Implemented, deferred, limits

| | Status |
| --- | --- |
| Push → build → deploy at `<name>.oztozlu.dev`, with `public`, `access` or `password` | Implemented; each mode tested end to end |
| One-time code sign-in, allow and deny lists, service tokens | Implemented; tested |
| Google sign-in | Set up for the account and tested with Cloudflare's own login test; signing in to a site with Google in a browser is the one step not yet run end to end |
| Admin area for static pages, normalised paths, `whoami` | Implemented; tested on a live site with a service token, including encoded and mixed-case paths |
| Site server code (APIs, a database, a backend behind `/api/admin`) | Deferred: sites are static files behind the controller's Worker |
| Roles (`admin`, `editor`, `viewer`) | Deferred, with server code: the application will check them |
| A CMS or editor | Out of scope |
| Google sign-in for any Google account | Waits for the Google app to be published (needs Folio's privacy page live) |
