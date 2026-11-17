import { StrictMode, Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import '@fontsource-variable/manrope/wght.css'
import '@fontsource-variable/space-grotesk/wght.css'
import './style.css'
import Landing from './pages/Landing'
import Story from './pages/Story'
import { Theme } from './ui/theme'
import { preference, savePreference } from './ui/preferences'
import { Loading, Missing } from './ui/shared'

const Demo = lazy(() => import('./ui/DemoLayout'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Credit = lazy(() => import('./pages/Credit'))
const CreditDetail = lazy(() => import('./pages/Credit').then((m) => ({ default: m.CreditDetail })))
const Customers = lazy(() => import('./pages/Customers'))
const CustomerDetail = lazy(() => import('./pages/Customers').then((m) => ({ default: m.CustomerDetail })))
const CustomerHome = lazy(() => import('./pages/Customers').then((m) => ({ default: m.CustomerHome })))
const PopCard = lazy(() => import('./pages/PopCardPage'))
const Collections = lazy(() => import('./pages/Collections'))
const Reports = lazy(() => import('./pages/Reports'))
const Assistant = lazy(() => import('./pages/Assistant'))

function NavigationEffects() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash && !hash.startsWith('#card=')) {
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView())
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}
function App() {
  const [theme, setTheme] = useState(() => (preference('theme') === 'light' ? 'light' : 'dark'))
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return (
    <Theme.Provider
      value={{
        theme,
        toggle() {
          const next = theme === 'dark' ? 'light' : 'dark'
          setTheme(next)
          savePreference('theme', next)
        },
      }}
    >
      <BrowserRouter>
        <a
          className="skip"
          href="#main"
          onClick={(e) => {
            const main = document.getElementById('main')
            if (main) {
              e.preventDefault()
              main.tabIndex = -1
              main.focus()
              main.scrollIntoView()
            }
          }}
        >
          Skip to main content
        </a>
        <NavigationEffects />
        <Suspense
          fallback={
            <main id="main">
              <Loading />
            </main>
          }
        >
          <Routes>
            <Route index element={<Landing />} />
            <Route path="story" element={<Story />} />
            <Route path="demo" element={<Navigate to="/dashboard" replace />} />
            <Route element={<Demo />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="credit" element={<Credit />} />
              <Route path="credit/:id" element={<CreditDetail />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="customer" element={<CustomerHome />} />
              <Route path="popcard/:id" element={<PopCard />} />
              <Route path="collections" element={<Collections />} />
              <Route path="reports" element={<Reports />} />
              <Route path="assistant" element={<Assistant />} />
            </Route>
            <Route
              path="*"
              element={
                <main id="main" className="recover">
                  <Missing title="Page not found">This page isn’t part of the PopPay demo.</Missing>
                </main>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </Theme.Provider>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener(
    'load',
    () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        /* Normal online loading still works. */
      })
    },
    { once: true },
  )
}
