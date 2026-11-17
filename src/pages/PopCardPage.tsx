import { ArrowRight, ScanLine, ShieldCheck } from 'lucide-react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { useDemo } from '../ui/demo-context'
import { CardActions, CardFace } from '../ui/PopCard'
import { Missing, PageHead, PanelHead, errorText } from '../ui/shared'
import { account } from '../core/ledger'
import { cardLink, readCard } from '../core/popcard'
import { money, shortDate } from '../core/format'

export default function PopCardPage() {
  const { id = '' } = useParams()
  const { workspace: w, day, toast, snapshot } = useDemo()
  const { hash } = useLocation()
  const [params] = useSearchParams()
  let card
  let problem = ''
  try {
    card = readCard(id, hash)
  } catch (e) {
    problem = errorText(e)
  }
  if (problem) return <Missing title="Unable to open this PopCard">{problem}</Missing>
  const r = (!card || card.revision === snapshot.revision) && w.requests.find((r) => r.id === id)
  if (r) {
    const c = w.customers.find((c) => c.id === r.customerId)!
    const state = account(w, r, day).state
    const url = cardLink(w, r, snapshot.revision, window.location.origin)
    const asCustomer = params.get('view') === 'customer' || !!hash
    return (
      <div className="page-stack popcard-page">
        <PageHead label="THE POPCARD EXPERIENCE" title="Your PopCard is ready">
          One card for the request, the due date and the conversation around it.
        </PageHead>
        <div className="popcard-grid">
          <CardActions
            card={{
              merchant: w.name,
              customer: c.name,
              amount: r.amount,
              due: r.due,
              purpose: r.purpose,
              state,
              id,
              url,
            }}
            toast={toast}
          />
          <section className="panel popcard-explainer">
            <div className="feature-icon">
              <ScanLine size={23} />
            </div>
            <PanelHead title="Open the local record">
              This PopCard points to a request in {w.name}’s demo ledger.
            </PanelHead>
            <dl className="facts">
              <div>
                <dt>Requested amount</dt>
                <dd>{money(r.amount)}</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>{shortDate(r.due)}</dd>
              </div>
            </dl>
            <div className="actions">
              <Link className="btn primary" to={`/credit/${r.id}${asCustomer ? '?view=customer' : ''}`}>
                {asCustomer ? 'View credit record' : 'Review request'} <ArrowRight size={16} />
              </Link>
              <Link className="btn secondary" to={`/customer?customer=${c.id}`}>
                Open as customer
              </Link>
            </div>
            <p className="boundary">
              <ShieldCheck size={18} /> In another browser, this link opens a read-only snapshot. It does
              not synchronize or collect payments.
            </p>
          </section>
        </div>
      </div>
    )
  }
  if (!card)
    return (
      <Missing title="PopCard not found">
        Open the full demo link to see a snapshot, or find the request on the browser that created it.
      </Missing>
    )
  return (
    <div className="page-stack popcard-page">
      <PageHead label="SHARED DEMO SNAPSHOT" title="A PopCard for everyday credit">
        This is a read-only view of a fictional request.
      </PageHead>
      <div className="popcard-grid">
        <CardFace card={{ ...card, purpose: 'Fictional credit request', state: 'shared preview' }} />
        <section className="panel popcard-explainer">
          <PanelHead title="A preview on this browser">
            The merchant’s live request, decisions and repayments are stored on the browser that created it.
            This preview cannot change that ledger.
          </PanelHead>
          <Link className="btn primary" to="/demo">
            Try your own demo <ArrowRight size={17} />
          </Link>
        </section>
      </div>
    </div>
  )
}
