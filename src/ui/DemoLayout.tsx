import { useEffect, useState } from 'react'
import {
  Bell,
  BookOpen,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  FileBarChart,
  House,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Sparkles,
  Store,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { openDemo, type DemoStore } from '../core/storage'
import { merchantId } from '../core/model'
import { activity, accounts } from '../core/ledger'
import { today, money } from '../core/format'
import { Demo } from './demo-context'
import { preference, savePreference } from './preferences'
import { useTheme } from './theme'
import {
  ActivityList,
  Brand,
  Confirm,
  Field,
  Issue,
  Loading,
  Modal,
  ThemeButton,
  errorText,
} from './shared'

const routes = [
  { path: '/dashboard', name: 'Overview', Icon: LayoutDashboard },
  { path: '/credit', name: 'Credit ledger', Icon: ClipboardList },
  { path: '/customers', name: 'Customers', Icon: Users },
  { path: '/collections', name: 'Collections', Icon: Wallet },
  { path: '/reports', name: 'Reports', Icon: FileBarChart },
  { path: '/assistant', name: 'PopAI', Icon: Sparkles },
]
let opening: ReturnType<typeof openDemo> | undefined
const demoStore = () => (opening ??= openDemo())

export default function DemoLayout() {
  const location = useLocation()
  const nav = useNavigate()
  const [store, setStore] = useState<DemoStore>()
  const [saved, setSaved] = useState<Awaited<ReturnType<DemoStore['read']>>>()
  const [error, setError] = useState('')
  const [watchEpoch, setWatchEpoch] = useState(0)
  const [selected, setSelected] = useState(
    () => merchantId.safeParse(preference('merchant')).data ?? 'kirana',
  )
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState<'reset' | 'notifications' | 'menu' | null>(null)
  const [day, setDay] = useState(today)
  const theme = useTheme()
  useEffect(() => {
    let current = true
    void demoStore().then(
      (s) => {
        if (current) setStore(s)
      },
      (e) => {
        if (current) setError(errorText(e))
      },
    )
    return () => {
      current = false
    }
  }, [])
  useEffect(() => {
    if (!store) return
    return store.watch(
      (data) => {
        setSaved(data)
        setError('')
      },
      (e) => setError(errorText(e)),
    )
  }, [store, watchEpoch])
  useEffect(() => {
    const tick = () => setDay(today())
    const timer = setInterval(tick, 30_000)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', tick)
    }
  }, [])
  useEffect(() => {
    if (!message) return
    const id = setTimeout(() => setMessage(''), 3600)
    return () => clearTimeout(id)
  }, [message])

  function select(id: typeof selected) {
    setSelected(id)
    savePreference('merchant', id)
  }
  async function reset() {
    if (!store) return
    const state = await store.reset()
    setSaved(state)
    setError('')
    setWatchEpoch((x) => x + 1)
    select('kirana')
    setMessage('Demo restored to its original data.')
    nav('/dashboard', { replace: true })
  }
  const resetDialog = open === 'reset' && (
    <Confirm title="Reset the demo?" label="Reset demo data" danger close={() => setOpen(null)} run={reset}>
      All changes across the three fictional businesses will be replaced with fresh sample data. Your theme
      will stay the same.
    </Confirm>
  )
  if (error)
    return (
      <main id="main" className="recover panel">
        <Brand />
        <h1>Let’s get your demo back.</h1>
        <Issue>{error}</Issue>
        <p>Reset the saved demo to restore its fictional ledger.</p>
        <button className="btn primary" onClick={() => setOpen('reset')}>
          Reset Demo
        </button>
        {resetDialog}
      </main>
    )
  if (!store || !saved)
    return (
      <main id="main">
        <Loading />
      </main>
    )
  const { pathname, search } = location
  const params = new URLSearchParams(search)
  const customerParam = params.get('customer')
  const requestedWorkspace = merchantId.safeParse(params.get('workspace')).data
  const recordId = /^\/(customers|credit|popcard)\/([a-zA-Z0-9_-]{1,64})\/?$/.exec(pathname)?.[2]
  const requestMerchant = recordId
    ? saved.merchants.find((w) =>
        pathname.startsWith('/customers/')
          ? w.customers.some((c) => c.id === recordId)
          : w.requests.some((r) => r.id === recordId),
      )
    : undefined
  const customerMerchant = customerParam
    ? saved.merchants.find((w) => w.customers.some((c) => c.id === customerParam))
    : undefined
  const explicitMerchant = saved.merchants.find((w) => w.id === requestedWorkspace)
  const scoped = requestMerchant ?? customerMerchant ?? explicitMerchant
  const customerRoute =
    pathname === '/customer' ||
    params.get('view') === 'customer' ||
    (pathname.startsWith('/popcard/') && location.hash.startsWith('#card='))
  const workspace = scoped ?? saved.merchants.find((w) => w.id === selected)!
  function route(path: string) {
    if (workspace.id === selected) return path
    const [pathname, search = ''] = path.split('?')
    const query = new URLSearchParams(search)
    query.set('workspace', workspace.id)
    return pathname + '?' + query.toString()
  }
  function switchBusiness(id: string) {
    select(merchantId.parse(id))
    if (scoped) nav(pathname === '/customer' ? '/customer' : '/dashboard')
  }
  const customer =
    workspace.customers.find((c) => c.id === customerParam || c.id === recordId) ??
    workspace.customers.find((c) => c.id === workspace.requests.find((r) => r.id === recordId)?.customerId)

  const overdue = accounts(workspace, day).filter((a) => a.state === 'overdue')
  const pending = workspace.requests.filter((r) => r.status === 'pending')
  const section = recordId ? (/^\/customers\//.test(pathname) ? '/customers' : '/credit') : pathname
  const routeName = customerRoute
    ? 'Customer view'
    : (routes.find((r) => r.path === section)?.name ?? 'Workspace')
  function closeMenu() {
    setOpen(null)
  }
  const menu = (
    <>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="nav-list" aria-label="Workspace">
        {routes.map(({ path, name, Icon }) => (
          <NavLink key={path} to={route(path)} end={path === '/dashboard'} onClick={closeMenu}>
            <Icon size={18} />
            <span>{name}</span>
            {path === '/credit' && pending.length > 0 && <small>{pending.length}</small>}
            {path === '/assistant' && <span className="nav-new">LOCAL</span>}
          </NavLink>
        ))}
      </nav>
      <div className="nav-caption nav-secondary">EXPLORE</div>
      <nav className="nav-list" aria-label="Explore">
        <NavLink to={route('/customer')} onClick={closeMenu}>
          <Users size={18} />
          Customer view
        </NavLink>
        <Link to="/story" onClick={closeMenu}>
          <BookOpen size={18} />
          Project story
        </Link>
      </nav>
    </>
  )
  return (
    <Demo.Provider
      value={{
        snapshot: saved,
        workspace,
        day,
        route,
        reset,
        async run(cmd, opId) {
          // Persistent subscribers publish committed state, including changes from other tabs.
          return store.run(workspace.id, saved.revision, cmd, opId)
        },
        toast: setMessage,
      }}
    >
      <div className="app-layout">
        <aside className="sidebar">
          <Brand />
          <div className="workspace-select">
            <span className="store-icon">
              <Store size={17} />
            </span>
            <div>
              <small>DEMO BUSINESS</small>
              <label className="sr-only" htmlFor="merchant">
                Demo business
              </label>
              <select id="merchant" value={workspace.id} onChange={(e) => switchBusiness(e.target.value)}>
                {saved.merchants.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <ChevronDown size={14} className="workspace-chevron" />
          </div>
          {menu}
          <div className="sidebar-bottom">
            <div className="demo-pill">
              <span className="signal" /> Simulation workspace
            </div>
            <button className="nav-reset" type="button" onClick={() => setOpen('reset')}>
              <RefreshCw size={16} /> Reset Demo
            </button>
          </div>
        </aside>
        <div className="app-content">
          <header className="topbar">
            <div className="breadcrumbs">
              <button
                className="icon-btn mobile-menu"
                aria-label="Open navigation"
                onClick={() => setOpen('menu')}
              >
                <Menu size={20} />
              </button>
              <Link to="/" aria-label="PopPay home">
                <House size={16} />
              </Link>
              <span>/</span>
              <strong>{routeName}</strong>
            </div>
            <div className="top-actions">
              <div className="role-switch" aria-label="Demo perspective">
                <Link to={route('/dashboard')} aria-current={!customerRoute ? 'true' : undefined}>
                  Merchant
                </Link>
                <Link
                  to={route(customer ? '/customer?customer=' + customer.id : '/customer')}
                  aria-current={customerRoute ? 'true' : undefined}
                >
                  Customer
                </Link>
              </div>
              <ThemeButton {...theme} />
              <button
                className="icon-btn"
                title="Notifications"
                aria-label="Notifications"
                onClick={() => setOpen('notifications')}
              >
                <Bell size={17} />
                {overdue.length + pending.length > 0 && <i className="alert-dot" />}
              </button>
            </div>
          </header>
          <main id="main" className="content-inner">
            {store.mode === 'temporary' && (
              <Issue>
                Temporary demo: this browser blocked local storage. Changes will be lost when you reload.
              </Issue>
            )}
            <Outlet key={saved.revision + ':' + workspace.id} />
            <footer className="app-footer">
              <span>
                <CircleHelp size={15} /> Fictional data · Saved on this browser only
              </span>
              <Link to="/story">About this simulation</Link>
            </footer>
          </main>
        </div>
      </div>
      <div className={message ? 'toast is-visible' : 'toast'} role="status">
        {message}
        {message && (
          <button type="button" aria-label="Dismiss notification" onClick={() => setMessage('')}>
            <X size={16} />
          </button>
        )}
      </div>
      {resetDialog}
      {open === 'menu' && (
        <Modal title="Workspace" close={closeMenu}>
          <div className="mobile-nav">
            <Field label="Demo business">
              <select
                value={workspace.id}
                onChange={(e) => {
                  switchBusiness(e.target.value)
                  closeMenu()
                }}
              >
                {saved.merchants.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>
            {menu}
            <button className="nav-reset" onClick={() => setOpen('reset')}>
              <RefreshCw size={15} /> Reset Demo
            </button>
          </div>
        </Modal>
      )}
      {open === 'notifications' && (
        <Modal title="Workspace notifications" close={closeMenu}>
          <div className="notification-body">
            {pending.length > 0 && (
              <Link className="notification-row" to={route('/credit?filter=pending')} onClick={closeMenu}>
                {pending.length} requests awaiting review
              </Link>
            )}
            {overdue.length > 0 && (
              <Link
                className="notification-row"
                to={route('/collections?queue=overdue')}
                onClick={closeMenu}
              >
                {overdue.length} overdue accounts · {money(overdue.reduce((n, a) => n + a.balance, 0))}
              </Link>
            )}
            <h3>Recent ledger events</h3>
            <div
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('a')) closeMenu()
              }}
            >
              <ActivityList events={activity(workspace)} limit={5} />
            </div>
          </div>
        </Modal>
      )}
    </Demo.Provider>
  )
}
