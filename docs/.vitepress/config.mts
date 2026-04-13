import { defineConfig } from 'vitepress';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'Flowy';
const isProjectPages = !repository.endsWith('.github.io');

export default defineConfig({
  title: 'Flowy Docs',
  description: 'Documentation for getting Flowy running, connecting runners, and using it day to day.',
  base: isProjectPages ? `/${repository}/` : '/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Get Started', link: '/guide/getting-started' },
      { text: 'Usage Guide', link: '/guide/usage' },
      { text: 'Reference', link: '/guide/developer-reference' },
    ],
    sidebar: [
      {
        text: 'Docs',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Usage Guide', link: '/guide/usage' },
          { text: 'Reference', link: '/guide/developer-reference' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/FrankLeeeee/Flowy' },
    ],
    footer: {
      message: 'Built with VitePress and published with GitHub Pages.',
      copyright: 'Copyright © 2026 Frank Lee',
    },
  },
});
