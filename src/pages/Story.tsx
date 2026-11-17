import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Database,
  GitCommitHorizontal,
  Layers3,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router'
import { PublicFrame, authorUrl, repoUrl } from '../ui/PublicFrame'
import { TextLink } from '../ui/shared'

export default function Story() {
  return (
    <PublicFrame story>
      <div className="public-wrap story-content">
        <header className="section-intro story-intro">
          <div className="eyebrow">
            <BookOpen size={16} /> THE POPPAY PROJECT
          </div>
          <h1 tabIndex={-1} data-page-heading>
            From a handwritten tab
            <br /> to a <em>digital ledger.</em>
          </h1>
          <p>How a hackathon prototype became a complete interactive simulation for everyday credit.</p>
          <div className="actions">
            <Link className="btn primary" to="/demo">
              Open the simulation <ArrowRight size={16} />
            </Link>
            <TextLink to={repoUrl} external>
              View repository
            </TextLink>
          </div>
        </header>
        <div className="equal-grid story-evolution">
          <article className="panel">
            <span className="feature-icon">
              <GitCommitHorizontal size={23} />
            </span>
            <h2>Original prototype</h2>
            <p>
              PopPay started as a hackathon project about informal credit at neighborhood shops. The Next.js
              prototype used Supabase for authentication, merchant and customer records, transactions and
              realtime events. It explored PopCard sharing, trust indicators and merchant assistance.
            </p>
          </article>
          <article className="panel">
            <span className="feature-icon">
              <Layers3 size={23} />
            </span>
            <h2>PopPay 2.0</h2>
            <p>
              The current version is a self-contained React and TypeScript app, built with Vite. A visitor
              can handle a complete fictional credit journey immediately. Both perspectives use one ledger.
              No signup, server, external model or payment integration is required.
            </p>
          </article>
        </div>
        <section className="panel architecture">
          <h2>One deployment. One ledger.</h2>
          <p>
            Netlify serves the same static build on every route. Record IDs are resolved inside the browser,
            so a deployment never needs to know which fictional requests a visitor created.
          </p>
          <ol
            className="architecture-flow"
            aria-label="Architecture: static hosting to browser views to domain service to IndexedDB"
          >
            <li>
              <span>01</span>
              <strong>Netlify static assets</strong>
              <small>HTML, JavaScript, styles and optional offline cache</small>
            </li>
            <li aria-hidden="true" className="arch-arrow">
              <ArrowDown size={18} />
            </li>
            <li>
              <span>02</span>
              <strong>Merchant, customer and PopAI</strong>
              <small>React routes and local view state</small>
            </li>
            <li aria-hidden="true" className="arch-arrow">
              <ArrowDown size={18} />
            </li>
            <li>
              <span>03</span>
              <strong>Typed credit engine</strong>
              <small>Validate requests, append ledger events, derive balances</small>
            </li>
            <li aria-hidden="true" className="arch-arrow">
              <ArrowDown size={18} />
            </li>
            <li>
              <span>04</span>
              <strong>IndexedDB via Dexie</strong>
              <small>Atomic commits and reactive updates across tabs</small>
            </li>
          </ol>
        </section>
        <div className="equal-grid story-decisions">
          <article className="panel">
            <Database size={24} />
            <h2>Why IndexedDB</h2>
            <p>
              Structured records outgrow key-value preferences quickly. IndexedDB supplies transactions,
              persistent data and schema upgrades without a server. A small in-memory workspace takes over
              if storage is blocked. Theme and workspace selection are lightweight preferences.
            </p>
          </article>
          <article className="panel">
            <ShieldCheck size={24} />
            <h2>Trust the math</h2>
            <p>
              Amounts are stored as integer paise. Approval appends exactly one issue entry, while
              repayments append against a specific request ID. The engine rejects overpayment, duplicate
              postings and invalid transitions. Balances, statements and charts all read those same entries.
            </p>
          </article>
          <article className="panel">
            <Sparkles size={24} />
            <h2>PopAI stays grounded</h2>
            <p>
              A local intent parser recognizes a bounded set of questions and commands. The assistant reads
              the selected ledger, shows proposed changes and waits for confirmation. It calls no model and
              makes no lending decisions.
            </p>
          </article>
          <article className="panel">
            <Layers3 size={24} />
            <h2>Where local ends</h2>
            <p>
              Tabs on the same browser can see shared commits. Separate browsers cannot synchronize. A
              PopCard can carry a small, fictional snapshot for preview only. Clearing site data removes
              local changes, and nothing is backed up to a server.
            </p>
          </article>
        </div>
        <section className="story-banner story-author">
          <div>
            <div className="eyebrow">DESIGNED AND BUILT BY</div>
            <h2>Abhishek Verma</h2>
            <p>
              PopPay is a portfolio demonstration. It does not issue credit, transfer money, check a credit
              bureau or establish enforceable obligations.
            </p>
            <div className="actions">
              <TextLink to={authorUrl} external>
                Portfolio
              </TextLink>
              <TextLink to={repoUrl} external>
                GitHub repository
              </TextLink>
            </div>
          </div>
        </section>
      </div>
    </PublicFrame>
  )
}
