/**
 * Build-time OG image rendering: satori (JSX-like tree → SVG) + sharp
 * (SVG → PNG). Zero client JS — every image is generated once at build time
 * by src/pages/og/[...path].png.ts.
 *
 * Card colors mirror the real theme tokens in src/styles/theme.css. satori
 * can't read CSS custom properties, so the resolved values are hardcoded here.
 *
 * Fonts are accessed via Astro's Fonts API so they stay in sync with the
 * font configuration in astro.config.mjs and work in both Node.js and the
 * Workers runtime used by the Cloudflare adapter for pre-rendering.
 */

import { fontData, experimental_getFontFileURL } from 'astro:assets';
import satori from 'satori';
import sharp from 'sharp';

// ── Font configuration (mirrors astro.config.mjs) ─────────────────────────
const BODY_VAR  = '--font-atkinson';
const MONO_VAR  = '--font-mono';
const BODY_NAME = 'Atkinson Hyperlegible Next';
const MONO_NAME = 'Atkinson Hyperlegible Mono';

const COLORS = {
  background: '#2a212c',
  foreground: '#d1d5dc',
  muted:      '#d7d0d7',
  border:     '#79697b',
  clay:       '#ad46ff',
};

const WIDTH = 1200;
const HEIGHT = 630;

// ── Font loading ──────────────────────────────────────────────────────────

async function getFontBuffer(cssVar: string, contextUrl: URL): Promise<ArrayBuffer> {
  const entries = fontData[cssVar];
  if (!entries?.length) {
    throw new Error(`Font ${cssVar} not found in fontData. Is it configured in astro.config.mjs?`);
  }

  // Satori only supports TTF, OTF, and WOFF (v1) — not WOFF2.
  // Find the first entry with a .woff source (the config requests both
  // WOFF2 for the website and WOFF for OG images).
  const woffEntry = entries.find((entry) =>
    entry.src.some((src) => src.url.endsWith('.woff'))
  );
  const fontSrc = woffEntry?.src.find((src) => src.url.endsWith('.woff'));

  if (!fontSrc?.url) {
    throw new Error(`No .woff font file found for ${cssVar}. Is the 'woff' format configured in astro.config.mjs?`);
  }
  const url = experimental_getFontFileURL(fontSrc.url, contextUrl);
  return fetch(url).then(r => r.arrayBuffer());
}

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type FontConfig = { name: string; data: ArrayBuffer; weight: FontWeight; style: 'normal' };

let fontsCache: Promise<FontConfig[]> | undefined;

function loadFonts(contextUrl: URL): Promise<FontConfig[]> {
  if (!fontsCache) {
    fontsCache = Promise.all([
      getFontBuffer(BODY_VAR, contextUrl),
      getFontBuffer(MONO_VAR, contextUrl),
    ]).then(([body, mono]) => [
      { name: BODY_NAME, data: body, weight: 400, style: 'normal' as const },
      { name: BODY_NAME, data: body, weight: 700, style: 'normal' as const },
      { name: MONO_NAME, data: mono, weight: 500, style: 'normal' as const },
    ]);
  }
  return fontsCache;
}

// ── Public API ────────────────────────────────────────────────────────────

export interface OgImageInput {
  eyebrow: string;
  title:   string;
  site:    string;
  /** The URL of the current request, needed for font file resolution. */
  contextUrl: URL;
}

export async function renderOgImage({ eyebrow, title, site, contextUrl }: OgImageInput): Promise<Uint8Array> {
  const fonts = await loadFonts(contextUrl);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width:  WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: COLORS.background,
          padding: '72px',
          fontFamily: BODY_NAME,
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontFamily: MONO_NAME,
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: COLORS.muted,
              },
              children: eyebrow,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flex: 1,
                alignItems: 'center',
                fontFamily: BODY_NAME,
                fontSize: 64,
                fontWeight: 700,
                lineHeight: 1.15,
                color: COLORS.foreground,
              },
              children: title,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                borderTop: `1px solid ${COLORS.border}`,
                paddingTop: '28px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: COLORS.clay,
                    },
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      fontFamily: MONO_NAME,
                      fontSize: 20,
                      fontWeight: 500,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: COLORS.muted,
                    },
                    children: site,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { width: WIDTH, height: HEIGHT, fonts }
  );

  return new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer());
}
