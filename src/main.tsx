import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// 支持子路径部署（如 GitHub Pages 项目页）：vite base → router basename
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

// 不使用 StrictMode：会导致 canvas 效果双重执行
createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={basename}>
    <App />
  </BrowserRouter>,
)
