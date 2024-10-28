import './i18n';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntApp } from 'antd';  // 重命名避免与你的 App 组件冲突
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US';
import jaJP from 'antd/locale/ja_JP';
import MainApp from './App'
import 'antd/dist/reset.css'
import './styles/global.css'
import './styles/markdown.css'
const currentLanguage = localStorage.getItem('i18nextLng') || 'zh';


// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page">
          <h1>Something went wrong.</h1>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// 防止在 strict mode 下重复渲染的问题
const prepare = async () => {
  if (process.env.NODE_ENV === 'development') {
    // const { worker } = await import('./mocks/browser')
    // return worker.start() // 如果你使用 MSW 做 mock
  }
  return Promise.resolve()
}

prepare().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ConfigProvider
          locale={currentLanguage.startsWith('zh') ? zhCN : enUS}
          theme={{
            token: {
              // 自定义主题
              colorPrimary: '#00b96b',
            },
          }}
        >
          <AntApp>
            <MainApp />
          </AntApp>
        </ConfigProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  )
})

// 如果你需要 PWA 支持
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js').then(
//       registration => {
//         console.log('ServiceWorker registration successful')
//       },
//       err => {
//         console.log('ServiceWorker registration failed: ', err)
//       }
//     )
//   })
// }