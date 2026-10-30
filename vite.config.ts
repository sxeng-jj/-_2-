import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * 개발 서버(npm run dev)에서도 /api/* 를 쓸 수 있게 Vercel 함수(api/*.ts)를 그대로 연결한다.
 * 배포 환경에서는 Vercel 이 이 함수들을 직접 실행한다.
 */
const API_ROUTES = ['pixabay', 'places']
const SERVER_ENV = ['PIXABAY_API_KEY', 'JEJU_CULTURE_INFO_KEY', 'JEJU_CULTURE_LOCATION_KEY']

function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      // .env.local 의 서버 전용 키를 함수가 process.env 로 읽을 수 있게 넘긴다 (브라우저로는 나가지 않는다)
      for (const k of SERVER_ENV) if (env[k]) process.env[k] = env[k]
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const name = API_ROUTES.find((r) => url.pathname === `/api/${r}`)
        if (!name) return next()
        const mod = await server.ssrLoadModule(`/api/${name}.ts`)
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
