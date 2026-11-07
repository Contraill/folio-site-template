# Folio site template

A small site, published by the Folio controller from this repository: push to `main` and it is live at `https://<name>.oztozlu.dev`, open to everyone, to the people you name, or to whoever has the password.

## Start a site

1. **Use this template** on GitHub, name the repository (the name becomes the address unless `folio.yaml` sets `name`). It may be public or private: who can read the site is set in `folio.yaml`, not by the repository.
2. Edit `folio.yaml` and the pages in `src/content/pages`, then push to `main`.

That is all: the controller builds, deploys, creates the address and, for `access`, the sign-in. A first commit made by "Use this template" is picked up within 15 minutes; every later push within a minute or two.

## folio.yaml

```yaml
kind: site
access: public            # public, access or password
name: my-site             # optional: my-site.oztozlu.dev (lowercase letters, digits, hyphens)
allow: [someone@example.com, other@example.com]   # access only
title: { en: My site }
```

| `access` | Who reads it | How |
| --- | --- | --- |
| `public` | everyone | plain pages |
| `access` | the people in `allow` | Cloudflare Access asks for their email and sends a one-time code. The controller creates the sign-in before the address goes live, and the site's Worker checks the person again on every request: if anything about the sign-in is wrong, the site refuses rather than opens. |
| `password` | anyone with the password | every page is encrypted at build (AES-256-GCM, key from PBKDF2-SHA-256 with 600 000 iterations) and opened in the browser. The password never leaves it; the derived key is kept for the tab only (**Lock** forgets it). |

### Setting the password

`access: password` needs a strong password (14 characters or more) as a secret of the repository, never in a file:

```sh
gh secret set FOLIO_PASSWORD -R <owner>/<repository>
```

Then push (or run the *Folio* workflow). Without the secret the build stops and nothing is published. Changing the password re-encrypts the site at the next build. The encrypted pages are public files: only the password's strength protects them, so use a long passphrase.

In a password site, images go inside the pages as `data:` addresses: any separate file would be public, and the build refuses to publish one.

## Develop

```sh
pnpm install
pnpm dev            # http://localhost:4321
pnpm test           # the encryption and the leak check
pnpm build          # dist/; for a password site, FOLIO_PASSWORD=… pnpm build
```

Requires Node 26 (`.node-version`) and pnpm 12. `.github/workflows/folio.yml` runs the same tests and build on every push, with no access to anything but `FOLIO_PASSWORD`, and leaves `dist/` as the `folio-site` artifact for the controller.

## Taking a site down

Delete `folio.yaml`, archive the repository or delete it: the controller removes the site and its address within minutes.
