import { ArrowRight, ClipboardList, Plus, Sparkles, Users, Wallet } from 'lucide-react'
import type { Workspace } from '../core/model'
import { account, metrics, trends } from '../core/queries'
import { money } from '../core/format'
import { Avatar, Badge } from './shared'
import { TrendChart } from './charts'

export function DashboardPreview({ workspace: w, day }: { workspace: Workspace; day: string }) {
  const m = metrics(w, day)
  return (
    <div className="product-preview">
      <div className="preview-chrome">
        <div>
          <span />
          <span />
          <span />
        </div>
        <span>poppay / overview</span>
        <Badge tone="active">● Demo workspace</Badge>
      </div>
      <div className="preview-shell">
        <aside aria-hidden="true">
          <img width="24" height="24" src="/mark.svg" alt="" />
          <div className="preview-nav-active">
            <Wallet size={13} /> Overview
          </div>
          <div>
            <ClipboardList size={13} /> Ledger
          </div>
          <div>
            <Users size={13} /> Customers
          </div>
          <div>
            <Sparkles size={13} /> PopAI
          </div>
        </aside>
        <div className="preview-main">
          <small>MERCHANT COMMAND CENTER</small>
          <div className="preview-title">
            <h2>Business overview</h2>
            <span>
              <Plus size={12} /> Create credit
            </span>
          </div>
          <div className="preview-stats">
            <div>
              <small>Total outstanding</small>
              <b>{money(m.outstanding)}</b>
            </div>
            <div>
              <small>Collected this month</small>
              <b>{money(m.month)}</b>
            </div>
            <div>
              <small>Pending requests</small>
              <b>{m.pending.toString().padStart(2, '0')}</b>
            </div>
          </div>
          <div className="preview-graph">
            <div>
              <strong>Credit & collections</strong>
              <small>LAST 6 WEEKS</small>
            </div>
            <TrendChart series={trends(w, day)} compact />
          </div>
          <div className="preview-row">
            <Avatar name={w.customers[0].name} />
            <span>
              <b>{w.customers[0].name}</b>
              <small>Outstanding balance</small>
            </span>
            <strong>{money(account(w, w.requests[0], day).balance)}</strong>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>
    </div>
  )
}
