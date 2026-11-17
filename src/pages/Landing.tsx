import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDot,
  ClipboardList,
  GitFork,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router'
import { seed } from '../core/seed'
import { account, customerStats, metrics } from '../core/queries'
import { money } from '../core/format'
import { DashboardPreview } from '../ui/DashboardPreview'
import { CardFace } from '../ui/PopCard'
import { Avatar, Badge, TextLink } from '../ui/shared'
import { PublicFrame, authorUrl, repoUrl } from '../ui/PublicFrame'

const journey = [
  ['01', 'Request credit', 'A customer asks to put a purchase on their tab.', Users],
  ['02', 'Merchant reviews', 'Review the amount, reason and due date in one place.', ClipboardList],
  ['03', 'Approve credit', 'Approval posts credit to the local ledger.', Check],
  ['04', 'Record repayments', 'A partial payment reduces the balance immediately.', Wallet],
  ['05', 'Settle the balance', 'Close the loop with a receipt and a clear record.', ShieldCheck],
] as const
export default function Landing() {
  const sample = seed()
  const w = sample.merchants[0]
  const r = w.requests.find((r) => r.id === 'kirana-pending-1')!
  const m = metrics(w, sample.anchor)
  return (
    <PublicFrame>
      <section className="public-hero">
        <div className="public-wrap hero-grid">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="signal" /> THE FUTURE OF EVERYDAY CREDIT
            </div>
            <h1 tabIndex={-1} data-page-heading>
              Udhaar,
              <br /> without the <em>uncertainty.</em>
            </h1>
            <p>
              Track credit, understand collections, and build stronger customer relationships — all in one
              beautifully simple experience.
            </p>
            <div className="hero-ctas">
              <Link className="btn primary large" to="/demo">
                Explore Interactive Demo <ArrowUpRight size={19} />
              </Link>
              <a className="btn secondary large" href="#how-it-works">
                See How PopPay Works <ArrowDown size={16} />
              </a>
            </div>
            <a className="github-link" href={repoUrl} target="_blank" rel="noopener noreferrer">
              <GitFork size={16} /> View source on GitHub <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="hero-visual">
            <div className="hero-preview-label">
              <span>MERCHANT WORKSPACE</span>
              <span>
                <i className="signal" /> INTERACTIVE DEMO
              </span>
            </div>
            <DashboardPreview workspace={w} day={sample.anchor} />
            <div className="preview-float">
              <span className="float-icon">
                <ShieldCheck size={20} />
              </span>
              <span>
                <strong>You’re in control</strong>
                <small>Every rupee, accounted for.</small>
              </span>
            </div>
          </div>
        </div>
      </section>
      <div className="public-disclosure">
        <div className="public-wrap">
          <span className="disclosure-icon">
            <ShieldCheck size={18} />
          </span>
          <p>
            <strong>Built to explore.</strong> PopPay is an interactive product demo. All transactions,
            customer profiles, credit scores, and payments are simulated.
          </p>
          <span className="disclosure-tag">NO SIGN-UP REQUIRED</span>
        </div>
      </div>
      <section className="public-wrap public-section" id="features">
        <header className="section-intro">
          <div className="eyebrow">
            <span className="signal" /> THE WORKSPACE
          </div>
          <h2>
            Leave the notebook behind.
            <br />
            <em>Keep the human connection.</em>
          </h2>
          <p>A smarter way to manage udhaar, built around the way neighborhood businesses already work.</p>
        </header>
        <div className="feature-pair">
          <article className="feature-tile feature-ledger">
            <span className="feature-icon">
              <ClipboardList size={22} />
            </span>
            <h3>Digital udhaar, from end to end.</h3>
            <p>Review requests, approve credit and follow every repayment in a single ledger.</p>
            <div className="feature-ledger-list">
              {w.requests.slice(0, 3).map((r, i) => {
                const a = account(w, r, sample.anchor)
                const n = w.customers.find((c) => c.id === r.customerId)!.name
                return (
                  <div key={r.id}>
                    <Avatar name={n} tone={i} />
                    <span>
                      <b>{n}</b>
                      <small>{r.purpose}</small>
                    </span>
                    <Badge>{a.state}</Badge>
                    <b>{money(a.balance)}</b>
                  </div>
                )
              })}
            </div>
            <TextLink to="/credit">Explore the credit ledger</TextLink>
          </article>
          <article className="feature-tile feature-card">
            <span className="feature-icon">
              <ScanLine size={22} />
            </span>
            <h3>Meet the PopCard.</h3>
            <p>A shareable card for one request, with its amount, due date and status in view.</p>
            <CardFace
              miniature
              card={{
                id: 'preview',
                merchant: w.name,
                customer: w.customers[0].name,
                amount: r.amount,
                due: r.due,
                purpose: r.purpose,
                state: r.status,
                url: window.location.origin + '/popcard/' + r.id,
              }}
            />
            <TextLink to={`/popcard/${r.id}`}>Open a demo PopCard</TextLink>
          </article>
        </div>
        <div className="feature-pair secondary-features">
          <article className="feature-tile">
            <span className="feature-icon">
              <Users size={22} />
            </span>
            <h3>See the people behind the numbers.</h3>
            <p>Customer profiles bring payment history, open credit and upcoming dates together.</p>
            <div className="inline-preview">
              <Avatar name={w.customers[0].name} />
              <span>
                <b>{w.customers[0].name}</b>
                <small>Outstanding balance</small>
              </span>
              <strong>{money(customerStats(w, w.customers[0].id, sample.anchor).balance)}</strong>
            </div>
            <TextLink to="/customers">Browse customers</TextLink>
          </article>
          <article className="feature-tile">
            <span className="feature-icon">
              <TrendingUp size={22} />
            </span>
            <h3>Know what needs your attention.</h3>
            <p>See what’s overdue, what’s due soon and which conversations to follow up on.</p>
            <div className="inline-preview">
              <span className="mini-icon">
                <Wallet size={18} />
              </span>
              <span>
                <b>Collections intelligence</b>
                <small>Past the agreed due date</small>
              </span>
              <strong>{money(m.overdue)}</strong>
            </div>
            <TextLink to="/collections">See collections</TextLink>
          </article>
        </div>
        <article className="feature-tile ai-feature">
          <div>
            <span className="feature-icon">
              <Sparkles size={22} />
            </span>
            <h3>Ask PopAI. Get an answer from your ledger.</h3>
            <p>
              Look up balances, find overdue accounts and prepare reminders. The assistant runs on this
              device and asks before making a change.
            </p>
            <TextLink to="/assistant">Try PopAI</TextLink>
          </div>
          <div className="preview-chat">
            <span>“How much is outstanding?”</span>
            <div>
              <Sparkles size={17} />
              <p>
                {w.name} has <strong>{money(m.outstanding)}</strong> outstanding across approved credit.
              </p>
            </div>
          </div>
        </article>
      </section>
      <section className="journey-section" id="how-it-works">
        <div className="public-wrap public-section">
          <header className="section-intro">
            <div className="eyebrow">
              <span className="signal" /> HOW IT WORKS
            </div>
            <h2>
              From request to <em>settled.</em>
            </h2>
            <p>Follow a single purchase through the entire credit journey.</p>
          </header>
          <ol className="journey">
            {journey.map(([n, title, text, Icon]) => (
              <li key={n}>
                <div>
                  <Icon size={22} />
                  <span>{n}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <Link className="btn primary" to="/demo">
            Try the full lifecycle <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <section className="public-wrap public-section">
        <div className="story-banner">
          <div>
            <div className="eyebrow">
              <CircleDot size={14} /> THE PROJECT
            </div>
            <h2>From hackathon idea to a working credit simulation.</h2>
            <p>
              Abhishek Verma built the original PopPay around a simple question: could a neighborhood shop
              track udhaar without losing the trust that makes it work? PopPay 2.0 turns that idea into a
              complete browser-based demo.
            </p>
            <div className="actions">
              <Link className="btn primary" to="/story">
                Read the project story <ArrowRight size={16} />
              </Link>
              <TextLink to={authorUrl} external>
                Creator’s portfolio
              </TextLink>
            </div>
          </div>
          <div className="story-stamp" aria-hidden="true">
            <Zap size={90} fill="currentColor" />
          </div>
        </div>
      </section>
    </PublicFrame>
  )
}
