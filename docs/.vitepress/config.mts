import { defineConfig } from 'vitepress';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'Flowy';
const isProjectPages = !repository.endsWith('.github.io');

export default defineConfig({
  title: 'Flowy Docs',
  description: 'Documentation for the Flowy hub, runner, and deployment workflows.',
  base: isProjectPages ? `/${repository}/` : '/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Architecture', link: '/guide/architecture' },
      { text: 'Deployment', link: '/guide/deployment' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Architecture', link: '/guide/architecture' },
          { text: 'Deployment', link: '/guide/deployment' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/FrankLeeeee/Flowy' },
    ],
    footer: {
      message: 'Built with VitePress and GitHub Pages.',
      copyright: 'Copyright © 2026 Frank Lee',
    },
  },
});
