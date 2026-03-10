import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // server: {
  //   port: 3000,
  //   host: '0.0.0.0',
  //   strictPort: true,
  //   allowedHosts: [
  //     'localhost',
  //     '127.0.0.1',
  //     '.preview.emergentagent.com',
  //     '.preview.emergentcf.cloud',
  //     '.emergentagent.com'
  //   ],
  //   hmr: {
  //     clientPort: 443,
  //   },
  // },
  // preview: {
  //   port: 3000,
  //   host: '0.0.0.0',
  // },
  // build: {
  //   outDir: 'build',
  //   sourcemap: false,
  // },
  define: {
    // Support for process.env in legacy code (optional, for compatibility)
    'process.env': {}
  }
})
