import type { UserConfig } from './types'

export const defaultConfig: UserConfig = {
  title:       'Hippari',
  description: 'Personal website, digital garden, mind dump, whatever.',
  url:         'https://hippari.me',
  locale:      'en',

  author: {
    name: 'Hippari',
  },

  navigation: [
    { title: 'Essays',  url: '/posts' },
    { title: 'Notes',   url: '/notes' },
    { title: 'Archive', url: '/archive' },
    { title: 'About',   url: '/about' },
  ],

  footerLinks: [
    { title: 'Now',      url: '/now' },
    { title: 'Colophon', url: '/colophon' },
    { title: 'RSS',      url: '/rss.xml' },
  ],

  social: [],

  heroText:     'Personal website, digital garden, mind dump, whatever.',
  tagline:      'pulling; stretching; tension​',
  postsPerPage: 10,
  recentPosts:  5,
  showLogo:     false,

  // Generic, no assumed keys — real indexes are configured per-site (see config.yaml).
  browse: {
    years:   true,
    indexes: [],
  },
}