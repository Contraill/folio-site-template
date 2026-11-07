import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/* Pages: src/content/pages/<name>.md is /<name>, index.md is the home page; `order` sorts the menu. In a password site
   they are encrypted at build. Images there go inside the page as data: addresses, never as separate files. */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/pages' }),
  schema: z.object({ title: z.string(), description: z.string().optional(), order: z.number().optional() }).strict(),
});

export const collections = { pages };
