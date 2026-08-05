// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

import sitemap from "@astrojs/sitemap";
import { wikilinkResolver, directiveToHtml, obsidianTextFormatting } from './src/plugins/satteri.ts';
import { resolveVaultImagePaths, imageAttributes, galleryGrouping } from './src/plugins/satteri-gallery.ts';

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: 'https://hippari.me',

  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true,
      minify: 'oxc',
    },
    ssr: {
      // Externalize native / build-time deps so rolldown doesn't bundle them.
      // Miniflare (the Cloudflare adapter's pre-rendering runtime) runs in
      // Node.js and can load these natively.
      external: ['sharp', 'satori'],
    },
  },

  integrations: [mdx(), sitemap()],

  experimental: {
    contentIntellisense: true,
  },

  fonts: [
    {
      // Variable WOFF2 for the website (best compression, smooth weight interpolation)
      name: "Atkinson Hyperlegible Next",
      cssVariable: "--font-atkinson",
      provider: fontProviders.fontsource(),
      weights: ["200 800"],
      formats: ["woff2", "woff"],
    },
    {
      // Variable WOFF2 for the website
      name: "Atkinson Hyperlegible Mono",
      cssVariable: "--font-mono",
      provider: fontProviders.fontsource(),
      weights: ["200 800"],
      formats: ["woff2", "woff"],
      fallbacks: ["monospace"],
    }
  ],

  markdown: {
    processor: satteri({
      mdastPlugins: [directiveToHtml, obsidianTextFormatting, resolveVaultImagePaths],
      hastPlugins: [wikilinkResolver, imageAttributes, galleryGrouping],
      features: {
        wikilinks: true,
        directive: true,
        smartPunctuation: { quotes: true, dashes: true, ellipses: true },
        gfm: {
          footnotes: {
            label: "Footnotes",
            backContent: "↑",
            backLabel: "Back to reference {reference}",
          }
        },
        subscript: true,
        superscript: true,
      }
    })
  },

  adapter: cloudflare()
});