import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, LockKeyhole, Send, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router'
import { answer, prompts } from '../core/assistant'
import type { Reply } from '../core/assistant'
import { uid } from '../core/model'
import { useDemo } from '../ui/demo-context'
import { Badge, Issue, PageHead, PanelHead, Table, errorText } from '../ui/shared'

type Turn = {
  id: string
  input: string
  reply: Reply
  status?: 'confirmed' | 'cancelled'
  href?: string
  error?: string
}
export default function Assistant() {
  const { workspace: w, day, run } = useDemo()
  const [turns, setTurns] = useState<Turn[]>([])
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState<string | null>(null)
  function submit(text: string) {
    const input = text.trim()
    if (!input) return
    setTurns((ts) => [...ts, { id: uid(), input, reply: answer(input, w, day) }])
    setMessage('')
  }
  async function confirm(t: Turn) {
    if (working || !t.reply.action || t.status) return
    setWorking(t.id)
    const cmd = t.reply.action.command
    try {
      const data = await run(cmd, t.id)
      const op = data.merchants.find((m) => m.id === w.id)?.operations.find((o) => o.id === t.id)
      if (!op) throw new Error('The ledger did not confirm the operation.')
      const href =
        cmd.kind === 'create'
          ? `/popcard/${op.result.id}`
          : cmd.kind === 'repay'
            ? `/credit/${cmd.requestId}`
            : cmd.kind === 'reminder'
              ? `/collections?customer=${cmd.customerId}`
              : undefined
      setTurns((ts) =>
        ts.map((x) => (x.id === t.id ? { ...x, status: 'confirmed', href, error: undefined } : x)),
      )
    } catch (e) {
      setTurns((ts) => ts.map((x) => (x.id === t.id ? { ...x, error: errorText(e) } : x)))
    } finally {
      setWorking(null)
    }
  }
  return (
    <div className="page-stack">
      <PageHead label="ON-DEVICE MERCHANT COPILOT" title="PopAI">
        Ask about your ledger or prepare the next step for {w.name}.
      </PageHead>
      <div className="assistant-grid">
        <section className="panel assistant-panel">
          <PanelHead title="Ask PopAI" action={<Badge tone="active">● Local assistant</Badge>}>
            Answers come from the selected business’s demo records.
          </PanelHead>
          <div className="conversation" role="log" aria-label="PopAI conversation" aria-live="polite">
            {!turns.length && (
              <div className="assistant-empty">
                <div>
                  <Sparkles size={30} />
                </div>
                <h2>What would you like to know?</h2>
                <p>Try a question about balances, collections or pending requests.</p>
                <div className="prompt-grid">
                  {prompts.slice(0, 4).map((p) => (
                    <button key={p} onClick={() => submit(p)}>
                      {p} <ArrowRight size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((t) => (
              <article className="turn" key={t.id}>
                <div className="user-turn">
                  <span className="sr-only">You: </span>
                  {t.input}
                </div>
                <div className="ai-turn">
                  <span className="ai-avatar">
                    <Sparkles size={17} />
                  </span>
                  <div>
                    <strong>PopAI</strong>
                    <p>{t.reply.text}</p>
                    {t.reply.table && <Table {...t.reply.table} label="PopAI ledger results" />}
                    {t.reply.action && (
                      <div className="action-preview">
                        <Badge tone="pending">
                          {t.status === 'confirmed'
                            ? 'Confirmed locally'
                            : t.status === 'cancelled'
                              ? 'Cancelled'
                              : 'Needs confirmation'}
                        </Badge>
                        <h3>{t.reply.action.label}</h3>
                        {t.reply.action.details.map((d) => (
                          <p key={d}>{d}</p>
                        ))}
                        {!t.status && (
                          <div className="actions">
                            <button
                              className="btn primary small"
                              disabled={!!working}
                              onClick={() => void confirm(t)}
                            >
                              {working === t.id ? 'Working…' : 'Confirm action'}
                            </button>
                            <button
                              className="btn secondary small"
                              disabled={!!working}
                              onClick={() =>
                                setTurns((ts) =>
                                  ts.map((x) => (x.id === t.id ? { ...x, status: 'cancelled' } : x)),
                                )
                              }
                            >
                              <X size={14} /> Cancel
                            </button>
                          </div>
                        )}
                        {t.href && (
                          <Link to={t.href} className="text-link">
                            View result <ArrowRight size={16} />
                          </Link>
                        )}
                        {t.error && <Issue>{t.error}</Issue>}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <form
            className="chat-compose"
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              submit(message)
            }}
          >
            <label className="sr-only" htmlFor="prompt">
              Ask PopAI
            </label>
            <input
              id="prompt"
              maxLength={400}
              placeholder="Ask about your demo ledger…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <button
              className="btn primary"
              title="Send to PopAI"
              aria-label="Send to PopAI"
              disabled={!message.trim()}
            >
              <Send size={18} />
            </button>
          </form>
          <small className="muted chat-note">
            <LockKeyhole size={13} /> Stays on this device. No model or network service is called.
          </small>
        </section>
        <aside className="panel assistant-tips">
          <PanelHead title="Try a prompt">Read your ledger or preview a local action.</PanelHead>
          {[
            ...prompts.slice(4),
            `Prepare a reminder for ${w.customers[0].name}`,
            `Generate a PopCard for ₹500 for ${w.customers[0].name}`,
            `Record a ₹200 repayment for ${w.customers[0].name}`,
          ].map((p) => (
            <button key={p} className="prompt-chip" onClick={() => submit(p)}>
              {p}
              <ArrowRight size={14} />
            </button>
          ))}
          <div className="boundary">
            <LockKeyhole size={17} /> Changes need your confirmation. PopAI uses local rules to interpret
            supported requests.
          </div>
        </aside>
      </div>
    </div>
  )
}
