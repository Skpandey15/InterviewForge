import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfe_admin',
      filename: 'remoteEntry.js',
      exposes: {
        './AdminApp': './src/AdminApp.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        'react-router': { singleton: true },
      },
    }),
  ],
  server: { port: 3005, strictPort: true, cors: true },
  preview: { port: 3005, strictPort: true, cors: true },
  build: { target: 'chrome89' },
});
