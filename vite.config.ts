import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * 개발 서버(npm run dev)에서도 /api/pixabay 를 쓸 수 있게 Vercel 함수(api/pixabay.ts)를 그대로 연결한다.
 * 배포 환경에서는 Vercel 이 이 함수를 직접 실행한다.
 */
function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/pixabay', async (req, res) => {
        if (env.PIXABAY_API_KEY) process.env.PIXABAY_API_KEY = env.PIXABAY_API_KEY
        const url = new URL(req.url ?? '', 'http://localhost')
        const mod = await server.ssrLoadModule('/api/pixabay.ts')
        const out = {
          status(code: number) {
            res.statusCode = code
            return out
          },
          setHeader(k: string, v: string) {
            res.setHeader(k, v)
            return out
          },
          json(body: unknown) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(body))
          },
        }
        await (mod.default as (a: unknown, b: unknown) => Promise<void>)({ query: Object.fromEntries(url.searchParams) }, out)
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  base: './',
  // dist/index.html 한 파일로 묶는다 (Vercel 배포와 더블클릭 실행 모두 가능)
  plugins: [react(), tailwindcss(), viteSingleFile(), devApi(loadEnv(mode, process.cwd(), ''))],
}))
