import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'Flowy';
const isProjectPages = !repository.endsWith('.github.io');

export default defineConfig({
  plugins: [react()],
  base: isProjectPages ? `/${repository}/` : '/',
});
