/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: https://<user>.github.io/nazotoki/ で配信する
export default defineConfig({
  base: '/nazotoki/',
  plugins: [react()],
  // public/assets/（ゲーム素材）と区別するため、ビルド成果物は app/ に出す
  build: { assetsDir: 'app' },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
