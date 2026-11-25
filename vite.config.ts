import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 本项目固定用 Node 22 运行（见 .nvmrc），系统全局仍是 Node 16。
// 直接 `npm start` / `npm run dev` 会走系统 Node 16，Vite 6 在 16 上只会抛出
// 难以理解的 crypto$2.getRandomValues is not a function，这里提前拦下并给出指引。
type Runtime = { versions: { node: string }; exit: (code: number) => void }
const runtime = (globalThis as unknown as { process?: Runtime }).process
const nodeMajor = Number.parseInt(runtime?.versions.node.split('.')[0] ?? '', 10)

if (nodeMajor && nodeMajor < 18) {
  console.error(
    [
      '',
      `[鲸时] 当前 Node 是 v${runtime?.versions.node}，本项目需要 18 以上（推荐 22）。`,
      '本机约定：系统全局保持 Node 16，只有这个项目用 Node 22。',
      '正确做法是双击项目根目录的 start.bat，它会自动用 .nvmrc 指定的 Node 启动，',
      '不会修改你的全局 Node 版本。',
      '',
    ].join('\n'),
  )
  runtime?.exit(1)
}

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
