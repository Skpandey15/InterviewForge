import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfe_results',
      filename: 'remoteEntry.js',
      exposes: {
        './ResultPage': './src/pages/ResultPage.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        'react-router': { singleton: true },
      },
    }),
  ],
  server: { port: 3004, strictPort: true, cors: true },
  preview: { port: 3004, strictPort: true, cors: true },
  build: { target: 'chrome89' },
});
