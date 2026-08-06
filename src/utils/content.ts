import { getCollection, type CollectionEntry } from "astro:content";
import { DateTime } from "luxon";
import { getAssetPath } from "./url";
import { slugify } from "./text";

import { POSTS_PATH, PAGES_PATH, ARTICLES_PATH } from "../content.config";
export type Post = CollectionEntry<"posts">;
export type Page = CollectionEntry<"pages">;
export type Article = CollectionEntry<"articles">;

export type AnyEntry = {
  id: string;
  published: Date;
  title: string;
  href: string;
  collection: 'posts' | 'articles';
  category?: string;
  tags?: string[];
  color?: string;
};

export type AnyCollectionEntry = Post | Article;

let postsCache: Post[] | null = null;
let pagesCache: Page[] | null = null;
let articlesCache: Article[] | null = null;

function isVisiblePost(post: Post): boolean {
  // Show everything in development
  if (import.meta.env.DEV) {
    return true;
  }

  const isDraft = post.data.draft;

  const isFuturePost =
    DateTime.fromJSDate(post.data.published) > DateTime.now();

  return !isDraft && !isFuturePost;
}

function sortPosts(posts: Post[]): Post[] {
  return posts.sort((a, b) => {
    const aDate = DateTime.fromJSDate(
      a.data.updated ?? a.data.published
    ).toMillis();

    const bDate = DateTime.fromJSDate(
      b.data.updated ?? b.data.published
    ).toMillis();

    return bDate - aDate;
  });
}

export async function getAllPosts(): Promise<Post[]> {
  if (postsCache) {
    return postsCache;
  }

  const posts = await getCollection(
    "posts",
    isVisiblePost
  );

  postsCache = sortPosts(posts);

  return postsCache;
}

// ── Pages ──────────────────────────────────────────────────────────────────────

function sortPages(pages: Page[]): Page[] {
  return pages.sort((a, b) => {
    const aDate = a.data.updated
      ? DateTime.fromJSDate(a.data.updated).toMillis()
      : 0;
    const bDate = b.data.updated
      ? DateTime.fromJSDate(b.data.updated).toMillis()
      : 0;
    return bDate - aDate;
  });
}

export async function getAllPages(): Promise<Page[]> {
  if (pagesCache) {
    return pagesCache;
  }

  const pages = await getCollection("pages");

  pagesCache = sortPages(pages);

  return pagesCache;
}

// ── Articles ───────────────────────────────────────────────────────────────────

function isVisibleArticle(article: Article): boolean {
  if (import.meta.env.DEV) {
    return true;
  }

  const isDraft = article.data.draft;

  const isFutureArticle =
    DateTime.fromJSDate(article.data.published) > DateTime.now();

  return !isDraft && !isFutureArticle;
}

function sortArticles(articles: Article[]): Article[] {
  return articles.sort((a, b) => {
    const aDate = DateTime.fromJSDate(
      a.data.updated ?? a.data.published
    ).toMillis();

    const bDate = DateTime.fromJSDate(
      b.data.updated ?? b.data.published
    ).toMillis();

    return bDate - aDate;
  });
}

export async function getAllArticles(): Promise<Article[]> {
  if (articlesCache) {
    return articlesCache;
  }

  const articles = await getCollection("articles", isVisibleArticle);

  articlesCache = sortArticles(articles);

  return articlesCache;
}

/**
 * Posts and articles combined, sorted by published desc. The one shared source
 * of "every entry" for the archive and browse pages.
 */
export async function getAllEntries(): Promise<(Post | Article)[]> {
  const [posts, articles] = await Promise.all([getAllPosts(), getAllArticles()]);

  return [...posts, ...articles].sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf()
  );
}

/**
 * Remove hidden folders and normalize directory segments.
 *
 * Example:
 * posts/_2026/Japan Beyond Places.md
 * -> []
 *
 * posts/travel/Japan/Tokyo.md
 * -> ["travel", "japan"]
 */
export function getPostPathSegments(
  filePath?: string
): string[] {
  if (!filePath) {
    return [];
  }

  return filePath
    .replace(POSTS_PATH, "")
    .split("/")
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("_"))
    .slice(0, -1)
    .map(slugify);
}

/**
 * Get the final slug segment from Astro content entry ID.
 *
 * Example:
 * "travel/tokyo-beyond-places"
 * -> "tokyo-beyond-places"
 */
export function getPostSlugSegment(id: string): string {
  const segments = id.split("/");

  return segments.at(-1) ?? id;
}

/**
 * Generate nested slug path from file structure.
 *
 * Example:
 * travel/japan/tokyo.md
 * -> "travel/japan/tokyo"
 */
export function getPostSlugPath(
  id: string,
  filePath?: string
): string {
  const segments = getPostPathSegments(filePath);

  const slug =
    slugify(getPostSlugSegment(id));

  return segments.length > 0
    ? [...segments, slug].join("/")
    : slug;
}

/**
 * Route param slug used in getStaticPaths().
 *
 * Example:
 * "/travel/japan/tokyo"
 */
export function getPostSlug(
  id: string,
  filePath?: string
): string {
  return `/${getPostSlugPath(id, filePath)}`;
}

export function getPagePathSegments(
  filePath?: string
): string[] {
  if (!filePath) {
    return [];
  }

  return filePath
    .replace(PAGES_PATH, "")
    .split("/")
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("_"))
    .slice(0, -1)
    .map(slugify);
}

export function getPageSlugPath(
  id: string,
  filePath?: string
): string {
  const segments = getPagePathSegments(filePath);
  const slug = slugify(getPostSlugSegment(id));

  return segments.length > 0
    ? [...segments, slug].join("/")
    : slug;
}

export function getPageSlug(
  id: string,
  filePath?: string
): string {
  return `/${getPageSlugPath(id, filePath)}`;
}

/**
 * Full page URL — pages are served at the root (no /pages/ prefix).
 *
 * Example:
 * "about" -> "/about"
 */
export function getPageUrl(
  id: string,
  filePath?: string
): string {
  return getAssetPath(getPageSlugPath(id, filePath));
}

/**
 * Full post URL.
 *
 * Example:
 * "/posts/travel/japan/tokyo"
 */
export function getPostUrl(
  id: string,
  filePath?: string
): string {
  return getAssetPath(
    `posts/${getPostSlugPath(id, filePath)}`
  );
}

/**
 * Remove hidden folders and normalize directory segments for articles.
 *
 * Example:
 * articles/_drafts/on-attention.md
 * -> []
 *
 * articles/tech/self-hosting.md
 * -> ["tech"]
 */
export function getArticlePathSegments(
  filePath?: string
): string[] {
  if (!filePath) {
    return [];
  }

  return filePath
    .replace(ARTICLES_PATH, "")
    .split("/")
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("_"))
    .slice(0, -1)
    .map(slugify);
}

/**
 * Generate nested slug path from article file structure.
 *
 * Example:
 * tech/self-hosting.md
 * -> "tech/self-hosting"
 */
export function getArticleSlugPath(
  id: string,
  filePath?: string
): string {
  const segments = getArticlePathSegments(filePath);
  const slug = slugify(getPostSlugSegment(id));

  return segments.length > 0
    ? [...segments, slug].join("/")
    : slug;
}

/**
 * Route param slug used in getStaticPaths() for articles.
 *
 * Example:
 * "/tech/self-hosting"
 */
export function getArticleSlug(
  id: string,
  filePath?: string
): string {
  return `/${getArticleSlugPath(id, filePath)}`;
}

/**
 * Full article URL.
 *
 * Example:
 * "/articles/tech/self-hosting"
 */
export function getArticleUrl(
  id: string,
  filePath?: string
): string {
  return getAssetPath(
    `articles/${getArticleSlugPath(id, filePath)}`
  );
}

export async function buildBacklinkMap(): Promise<Map<string, { title: string; slug: string }[]>> {
  const articles = await getAllArticles();
  const map = new Map<string, { title: string; slug: string }[]>();

  for (const article of articles) {
    const body = article.body ?? '';
    const articleSlug = getArticleSlugPath(article.id, article.filePath);
    const entry = { title: article.data.title, slug: articleSlug };

    // wikilinks: [[Target]], [[Target|Alias]], [[Target#Heading]] — key by the
    // same slug wikilinkResolver (src/plugins/satteri.ts) resolves the target to.
    for (const match of body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
      const target = match[1].split('#')[0].trim();
      if (!target) continue;
      const key = slugify(target);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }

    // markdown links: [text](/articles/slug)
    for (const match of body.matchAll(/\[([^\]]+)\]\(\/articles\/([^)#]+)/g)) {
      const key = match[2];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
  }

  return map;
}

export async function getSeriesArticles(series: string) {
  const posts = await getAllPosts();
  return posts
    .filter(p => p.data.series === series)
    .sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));
}

// ── Grouping ───────────────────────────────────────────────────────────────────

export function getPostsGroupedByYear(
  entries: Post[]
): [string, Post[]][] {
  const grouped = entries.reduce<Record<string, Post[]>>((acc, entry) => {
    const year = DateTime.fromJSDate(entry.data.published).year.toString();
    (acc[year] ??= []).push(entry);
    return acc;
  }, {});

  for (const year in grouped) {
    grouped[year].sort(
      (a, b) =>
        DateTime.fromJSDate(b.data.published).toMillis() -
        DateTime.fromJSDate(a.data.published).toMillis()
    );
  }

  return Object.entries(grouped).sort(
    ([a], [b]) => Number(b) - Number(a)
  );
}

export function getArticlesGroupedByYear(
  entries: Article[]
): [string, Article[]][] {
  const grouped = entries.reduce<Record<string, Article[]>>((acc, entry) => {
    const year = DateTime.fromJSDate(entry.data.published).year.toString();
    (acc[year] ??= []).push(entry);
    return acc;
  }, {});

  for (const year in grouped) {
    grouped[year].sort(
      (a, b) =>
        DateTime.fromJSDate(b.data.published).toMillis() -
        DateTime.fromJSDate(a.data.published).toMillis()
    );
  }

  return Object.entries(grouped).sort(
    ([a], [b]) => Number(b) - Number(a)
  );
}
