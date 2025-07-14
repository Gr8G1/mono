import './App.css'

import ReactLogo from './assets/react.svg?react'
import viteLogo from '/vite.svg'

function App() {
  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <ReactLogo className="logo react" />
        </a>
      </div>

      {/* 🔍 환경변수 표시 섹션 */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          background: '#1a1a1a',
          padding: '20px',
          borderRadius: '8px',
        }}
      >
        <h3>🔧 환경변수 정보</h3>
        <div
          style={{
            textAlign: 'left',
            fontSize: '14px',
            fontFamily: 'monospace',
          }}
        >
          <p>
            <strong>Mode:</strong> {(import.meta as any).env.MODE}
          </p>
          <p>
            <strong>App Name:</strong> {(import.meta as any).env.VITE_APP_NAME}
          </p>
          <p>
            <strong>App Version:</strong>{' '}
            {(import.meta as any).env.VITE_APP_VERSION}
          </p>
          <p>
            <strong>API Base URL:</strong>{' '}
            {(import.meta as any).env.VITE_API_BASE_URL}
          </p>
          <p>
            <strong>Debug Mode:</strong>{' '}
            {(import.meta as any).env.VITE_FEATURE_DEBUG}
          </p>
          <p>
            <strong>Node Env:</strong> {(import.meta as any).env.VITE_NODE_ENV}
          </p>
          <p>
            <strong>Local Dev:</strong>{' '}
            {(import.meta as any).env.VITE_LOCAL_DEV}
          </p>
          <p>
            <strong>Developer:</strong>{' '}
            {(import.meta as any).env.VITE_DEVELOPER_NAME}
          </p>
        </div>

        <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
          💡 VITE_ 접두사가 있는 변수만 클라이언트에서 접근 가능합니다
        </p>
      </div>
    </>
  )
}

export default App
