import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * 모노레포 웹 프로젝트용 공통 Vite 설정
 * @param {string} projectRoot - 프로젝트 루트 경로 (예: 'scope/type')
 * @param {object} options - 추가 옵션
 */
export function createWebConfig(projectRoot = '', options = {}) {
  return defineConfig({
    plugins: [react(), svgr(), tsconfigPaths(), ...(options.plugins || [])],

    resolve: {
      alias: {
        // 프로젝트별 추가 alias
        ...options.alias,
      },
    },

    server: {
      host: true,
      port: options.port || 5173,
      ...options.server,
    },

    build: {
      outDir: 'dist',
      ...options.build,
    },

    optimizeDeps: {
      include: ['react', 'react-dom'],
      ...options.optimizeDeps,
    },

    define: {
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'development'
      ),
      ...options.define,
    },

    ...options.vite,
  })
}

export default createWebConfig
