import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load .env file manually for use in config
  const env = loadEnv(mode, process.cwd(), '')

  const rawBasePath = env.VITE_APP_BASE_PATH || '/';
  const normalizedBasePath = rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`;
  const basePath = normalizedBasePath.endsWith('/') ? normalizedBasePath : `${normalizedBasePath}/`;

  return {
    base: basePath,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env': {}
    }
  }
})