import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    base: './',
    plugins: [react(), ...(single ? [viteSingleFile()] : [])],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      emptyOutDir: true,
      assetsInlineLimit: single ? 100_000_000 : 4096,
    },
    server: {
      port: 5173,
      // 端口固定：IndexedDB 按「协议 + 域名 + 端口」隔离，
      // 端口一旦漂移（5173 → 5174）就会看到一份空数据，因此禁止自动换端口。
      strictPort: true,
      host: '127.0.0.1',
    },
    preview: {
      port: 4173,
      strictPort: true,
      host: '127.0.0.1',
    },
  }
})
