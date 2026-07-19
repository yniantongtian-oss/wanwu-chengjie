import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Home from './pages/Home'
import StubPage from './pages/Stub'

const Create = lazy(() => import('./pages/Create'))
const Play = lazy(() => import('./pages/Play'))
const Result = lazy(() => import('./pages/Result'))
const Square = lazy(() => import('./pages/Square'))
const WorldArchive = lazy(() => import('./pages/WorldArchive'))

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border border-cyan-400/30 border-t-cyan-300" />
    </div>
  )
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<Create />} />
          <Route path="/play/:worldId" element={<Play />} />
          <Route path="/result/:worldId" element={<Result />} />
          <Route path="/square" element={<Square />} />
          <Route path="/world/:worldId" element={<WorldArchive />} />
          <Route path="*" element={<StubPage title="未知星域" />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
