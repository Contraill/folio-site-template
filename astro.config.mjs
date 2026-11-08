import { defineConfig } from 'astro/config';

/* Static pages. The Folio controller serves them behind its own Worker, which applies the access model in site.yaml. */
export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  markdown: { syntaxHighlight: false },
  devToolbar: { enabled: false },
  security: {
    csp: {
      directives: ["default-src 'self'", "img-src 'self' data:", "base-uri 'none'", "form-action 'self'", "object-src 'none'", "frame-src 'none'"],
    },
  },
});
