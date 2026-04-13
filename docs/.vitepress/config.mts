import { defineConfig } from 'vitepress';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'Flowy';
const isProjectPages = !repository.endsWith('.github.io');

export default defineConfig({
  title: 'Flowy Docs',
  description: 'Step-by-step documentation for installing Flowy, connecting runners, and dispatching tasks to your AI CLIs.',
  base: isProjectPages ? `/${repository}/` : '/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/guide/getting-started' },
      { text: 'Run Your First Task', link: '/guide/usage' },
      { text: 'Runner & Provider Guide', link: '/guide/developer-reference' },
    ],
    sidebar: [
      {
        text: 'Docs',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Run Your First Task', link: '/guide/usage' },
          { text: 'Runner & Provider Guide', link: '/guide/developer-reference' },
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
