import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Download, FileJson, Printer } from 'lucide-react'
import { csv, report, reportTypes } from '../core/reports'
import { money } from '../core/format'
import type { ReportType } from '../core/reports'
import { useDemo } from '../ui/demo-context'
import { Empty, Field, PageHead, PanelHead, Table, saveFile } from '../ui/shared'

export default function Reports() {
  const { workspace: w, day, toast } = useDemo()
  const [params] = useSearchParams()
  const [customerId, setCustomer] = useState(
    w.customers.find((c) => c.id === params.get('customer'))?.id ?? w.customers[0].id,
  )
  const [type, setType] = useState<ReportType>(params.has('customer') ? 'statement' : 'summary')
  const data = report(w, type, day, customerId)
  const displayRows = data.rows.map((row) =>
    row.map((value, i) => {
      const currency =
        data.headers[i].endsWith('(INR)') ||
        (type === 'summary' && i === 1 && String(row[0]).endsWith('(INR)'))
      if (!currency) return value
      const [whole, fraction] = String(value).split('.')
      return money(Number(whole) * 100 + Number(fraction))
    }),
  )
  function download(format: 'csv' | 'json') {
    saveFile(
      `poppay-demo-${w.id}-${type}-${day}.${format}`,
      new Blob([format === 'csv' ? csv(data) : JSON.stringify(data, null, 2)], {
        type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json',
      }),
    )
    toast(`${format.toUpperCase()} report exported.`)
  }
  return (
    <div className="page-stack reports-page">
      <PageHead label="REPORTS & EXPORTS" title="Reports">
        Review ledger data, export a statement or print a copy.
      </PageHead>
      <section className="panel report-controls">
        <PanelHead title="Build a report">Reports use this browser’s active demo ledger.</PanelHead>
        <div className="filter-row">
          <Field label="Report type">
            <select value={type} onChange={(e) => setType(e.target.value as ReportType)}>
              {Object.entries(reportTypes).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          {type === 'statement' && (
            <Field label="Customer">
              <select value={customerId} onChange={(e) => setCustomer(e.target.value)}>
                {w.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => download('csv')}>
            <Download size={16} /> Download CSV
          </button>
          <button className="btn secondary" onClick={() => download('json')}>
            <FileJson size={16} /> Download JSON
          </button>
          <button className="btn secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print / save PDF
          </button>
        </div>
      </section>
      <section className="panel report-print">
        <PanelHead title={data.title}>
          {w.name} · As of {day}
        </PanelHead>
        <p>{data.hint}</p>
        <p className="boundary">{data.disclaimer}</p>
        {data.rows.length ? (
          <Table headers={data.headers} rows={displayRows} label={data.title} />
        ) : (
          <Empty title="No entries for this report" />
        )}
      </section>
    </div>
  )
}
