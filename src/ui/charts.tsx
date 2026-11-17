import { useId } from 'react'
import { money, shortDate } from '../core/format'
const axisAmount = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })
type Point = { from: string; end: string; issued: number; collected: number }

export function TrendChart({ series, compact = false }: { series: Point[]; compact?: boolean }) {
  const id = useId()
  const largest = Math.max(...series.flatMap((p) => [p.issued, p.collected]), 300)
  const increment = 10 ** Math.floor(Math.log10(largest / 3))
  const step = Math.ceil(largest / 3 / increment) * increment
  const max = step * 3
  const plot = (field: 'issued' | 'collected') =>
    series.map((p, i) => [58 + 99 * i, 149 - (p[field] / max) * 116])
  const collection = plot('collected')
  const issued = plot('issued')
  const path = (p: number[][]) => p.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ')
  return (
    <div className={`trend-chart ${compact ? 'compact-chart' : ''}`}>
      <div className="chart-legend">
        <span>
          <i className="dot issued" />
          Credit issued
        </span>
        <span>
          <i className="dot collected" />
          Collected
        </span>
      </div>
      <svg
        className="trend-svg"
        viewBox="0 0 590 182"
        role="img"
        aria-label="Line chart comparing credit issued and collected over six weeks"
      >
        <defs>
          <linearGradient id={id} x2="0" y2="1" gradientUnits="objectBoundingBox">
            <stop stopColor="currentColor" stopOpacity=".23" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[33, 72, 110, 149].map((y, i) => (
          <g key={y}>
            <path className="chart-grid" d={`M 58 ${y} H 553`} />
            <text x="48" y={y + 4} textAnchor="end">
              {'₹' + axisAmount.format(((3 - i) * step) / 100)}
            </text>
          </g>
        ))}
        <path className="chart-green" fill={`url(#${id})`} d={`${path(collection)} L 553 149 H 58 Z`} />
        <path className="chart-purple chart-line" d={path(issued)} />
        <path className="chart-green chart-line" d={path(collection)} />
        {collection.map(([x, y], i) => (
          <g key={series[i].end}>
            <circle className="chart-green chart-point" cx={x} cy={y} r="3.6" />
            <text x={x} y="173" textAnchor="middle">
              {shortDate(series[i].end)}
            </text>
          </g>
        ))}
      </svg>
      {!compact && (
        <details className="chart-data">
          <summary>View chart data</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">Week ending</th>
                <th scope="col">Issued</th>
                <th scope="col">Collected</th>
              </tr>
            </thead>
            <tbody>
              {series.map((p) => (
                <tr key={p.end}>
                  <td>{shortDate(p.end)}</td>
                  <td>{money(p.issued)}</td>
                  <td>{money(p.collected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  )
}
export function Distribution({
  items,
  label,
}: {
  items: { label: string; amount: number; count?: number }[]
  label: string
}) {
  const max = Math.max(...items.map((x) => x.amount), 1)
  return (
    <ul className="distribution" aria-label={label}>
      {items.map((item) => (
        <li key={item.label}>
          <div>
            <span>
              {item.label}
              {item.count !== undefined && <small> · {item.count}</small>}
            </span>
            <strong>{money(item.amount)}</strong>
          </div>
          <progress value={item.amount} max={max} aria-label={`${item.label}: ${money(item.amount)}`} />
        </li>
      ))}
    </ul>
  )
}
