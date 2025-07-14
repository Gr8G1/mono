import { createWebConfig } from '@mono/configs-vite'
import { resolve } from 'path'
import { defineConfig, loadEnv } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // 🔍 환경변수 로깅
  console.log('\n🚀 === Vite 환경변수 정보 ===')
  console.log(`📍 Mode: ${mode}`)
  console.log(`📍 NODE_ENV: ${process.env.NODE_ENV}`)
  console.log('\n📦 VITE_ 접두사 환경변수 (loadEnv로 로드):')

  const viteVars = Object.entries(env).filter(([key]) =>
    key.startsWith('VITE_')
  )
  viteVars.forEach(([key, value]) => {
    console.log(`  ✅ ${key}: ${value}`)
  })

  console.log('================================\n')

  return createWebConfig('apps/web/project', {
    plugins: [
      createHtmlPlugin({
        inject: {
          data: {
            GA_ID: mode === 'production' ? env.VITE_AUW_GA_ID : '',
            GTM_ID: mode === 'production' ? env.VITE_AUW_GTM_ID : '',
          },
        },
      }),
    ],

    alias: {
      '@': resolve(__dirname, 'src'),
    },

    define: {
      global: 'window', // draft-js 용도 (word 파일 에디터)
    },

    vite: {
      base: '/',
    },
  })
})
