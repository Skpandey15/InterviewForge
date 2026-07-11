import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfe_dashboard',
      filename: 'remoteEntry.js',
      exposes: {
        './DashboardPage': './src/pages/DashboardPage.tsx',
        './MyInterviewsPage': './src/pages/MyInterviewsPage.tsx',
        './ProfilePage': './src/pages/ProfilePage.tsx',
        './SettingsPage': './src/pages/SettingsPage.tsx',
        './HelpPage': './src/pages/HelpPage.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        'react-router': { singleton: true },
      },
    }),
  ],
  server: { port: 3002, strictPort: true, cors: true },
  preview: { port: 3002, strictPort: true, cors: true },
  build: { target: 'chrome89' },
});
