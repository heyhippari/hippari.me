/**
 * Build-time OG image endpoint. getStaticPaths mirrors every real route in
 * the site 1:1, so BaseLayout.astro can default `ogImage` to `/og${path}.png`
 * for any page without each page needing to compute or pass one itself.
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import { getConfig } from '@/utils/config';
import {
  getAllPosts,
  getAllArticles,
  getAllPages,
  getAllEntries,
  getPostSlugPath,
  getArticleSlugPath,
  getPageSlugPath,
} from '@/utils/content';
import { getMetaValues, getYears } from '@/utils/browse';
import { renderOgImage } from '@/utils/og-image';

export const prerender = true;

interface CardProps {
  eyebrow: string;
  title:   string;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const siteConfig = await getConfig();
  const indexes = siteConfig.browse?.indexes ?? [];

  const [allPosts, allArticles, allPages, allEntries] = await Promise.all([
    getAllPosts(),
    getAllArticles(),
    getAllPages(),
    getAllEntries(),
  ]);

  const entries: { params: { path: string }; props: CardProps }[] = [];

  const add = (path: string, props: CardProps) => {
    entries.push({ params: { path }, props });
  };

  // ── Fixed routes ────────────────────────────────────────────────────────
  add('home', { eyebrow: siteConfig.tagline ?? siteConfig.title, title: siteConfig.title });
  add('posts', { eyebrow: siteConfig.title, title: 'Blog' });
  add('articles', { eyebrow: siteConfig.title, title: 'Articles' });
  add('archive', { eyebrow: siteConfig.title, title: 'Archive' });
  add('browse', { eyebrow: siteConfig.title, title: 'Browse' });
  add('browse/years', { eyebrow: 'Browse', title: 'Years' });

  // ── Browse: years ───────────────────────────────────────────────────────
  for (const year of getYears(allEntries)) {
    add(`browse/years/${year}`, { eyebrow: 'Browse — Year', title: year });
  }

  // ── Browse: configured indexes + values ─────────────────────────────────
  for (const index of indexes) {
    add(`browse/${index.slug}`, { eyebrow: 'Browse', title: index.title });

    for (const { value, slug } of getMetaValues(allEntries, index.key)) {
      add(`browse/${index.slug}/${slug}`, { eyebrow: `Browse — ${index.title}`, title: value });
    }
  }

  // ── Posts ───────────────────────────────────────────────────────────────
  for (const post of allPosts) {
    add(`posts/${getPostSlugPath(post.id, post.filePath)}`, {
      eyebrow: post.data.category ?? 'Post',
      title:   post.data.title,
    });
  }

  // ── Articles ────────────────────────────────────────────────────────────
  for (const article of allArticles) {
    add(`articles/${getArticleSlugPath(article.id, article.filePath)}`, {
      eyebrow: article.data.category ?? 'Article',
      title:   article.data.title,
    });
  }

  // ── Pages ───────────────────────────────────────────────────────────────
  for (const page of allPages) {
    add(getPageSlugPath(page.id, page.filePath), {
      eyebrow: 'Page',
      title:   page.data.title,
    });
  }

  return entries;
};

export const GET: APIRoute = async ({ props, url }) => {
  const siteConfig = await getConfig();
  const { eyebrow, title } = props as CardProps;

  const png = await renderOgImage({ eyebrow, title, site: siteConfig.title, contextUrl: url });

  return new Response(Buffer.from(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
