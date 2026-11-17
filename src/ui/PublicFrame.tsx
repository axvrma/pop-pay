import { ArrowUpRight, GitFork } from 'lucide-react'
import { Link } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { Brand, ThemeButton } from './shared'
import { useTheme } from './theme'

export const repoUrl = 'https://github.com/axvrma/pop-pay'
export const authorUrl = 'https://axvrma.com'
export function PublicFrame({ children, story = false }: { children: ReactNode; story?: boolean }) {
  const theme = useTheme()
  useEffect(() => {
    document.title = story ? 'Project story | PopPay' : 'PopPay — Udhaar, without the uncertainty'
    const hash = window.location.hash
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else document.querySelector<HTMLHeadingElement>('[data-page-heading]')?.focus({ preventScroll: true })
  }, [story])
  return (
    <div className="public-site">
      <header className="public-header">
        <div className="public-wrap public-nav">
          <Brand />
          <nav aria-label="Public navigation">
            <a href={story ? '/#features' : '#features'}>Product</a>
            <a href={story ? '/#how-it-works' : '#how-it-works'}>How it works</a>
            <Link to="/story" aria-current={story ? 'page' : undefined}>
              Project story
            </Link>
          </nav>
          <div className="public-actions">
            <ThemeButton {...theme} />
            <Link to="/demo" className="btn secondary small">
              Launch demo <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="public-footer">
        <div className="public-wrap">
          <div>
            <Brand />
            <p>Your money. Your people. Your peace of mind.</p>
          </div>
          <div className="public-footer-links">
            <Link to="/story">Engineering story</Link>
            <a href={repoUrl} target="_blank" rel="noopener noreferrer">
              <GitFork size={16} /> GitHub
            </a>
            <a href={authorUrl} target="_blank" rel="noopener noreferrer">
              Abhishek Verma <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
        <div className="public-wrap footer-legal">
          <span>© {new Date().getFullYear()} PopPay · An independent portfolio project</span>
          <span>Fictional demo only. No real money moves.</span>
        </div>
      </footer>
    </div>
  )
}
