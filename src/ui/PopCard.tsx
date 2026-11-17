import { useId, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Copy, Download, ScanLine, Share2, Zap } from 'lucide-react'
import { money, shortDate } from '../core/format'
import { Badge, Field, Issue, copyText, errorText, saveFile } from './shared'

export type CardProps = {
  merchant: string
  customer: string
  amount: number
  due: string
  purpose: string
  state: string
  id: string
  url?: string
}
export function CardFace({ card, miniature = false }: { card: CardProps; miniature?: boolean }) {
  return (
    <article className={`popcard ${miniature ? 'popcard-mini' : ''}`} aria-label="PopCard preview">
      <div className="popcard-brand">
        <Zap size={19} fill="currentColor" /> POPCARD <span>DEMO CREDIT</span>
      </div>
      <div className="popcard-title">
        <span>{card.merchant}</span>
        <strong>{money(card.amount)}</strong>
        <small>{card.purpose}</small>
      </div>
      <div className="popcard-bottom">
        <div>
          <small>ISSUED TO</small>
          <b>{card.customer}</b>
          <small>DUE {shortDate(card.due).toUpperCase()}</small>
          <Badge>{card.state}</Badge>
        </div>
        {card.url ? (
          <div className="pop-qr">
            <QRCodeCanvas
              value={card.url}
              level="M"
              size={108}
              marginSize={4}
              title="Scan to open this fictional PopCard"
            />
          </div>
        ) : (
          <div className="qr-placeholder" aria-hidden="true">
            <ScanLine size={35} />
          </div>
        )}
      </div>
      <div className="popcard-number">{card.id === 'preview' ? 'REQUEST PREVIEW' : 'ID · ' + card.id}</div>
    </article>
  )
}
export function CardActions({
  card,
  toast,
}: {
  card: CardProps & { url: string }
  toast: (s: string) => void
}) {
  const preview = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const id = useId()
  async function action(run: () => Promise<void> | void) {
    setError('')
    try {
      await run()
    } catch (e) {
      setError(errorText(e))
    }
  }
  async function png() {
    const qr = preview.current?.querySelector('canvas')
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 1100
    const ctx = canvas.getContext('2d')
    if (!ctx || !qr) throw new Error('The QR could not be rendered. Try again.')
    ctx.fillStyle = '#c5fa79'
    ctx.fillRect(0, 0, 900, 1100)
    ctx.strokeStyle = '#7cac51'
    ctx.lineWidth = 2
    for (let i = 0; i < 8; i++) {
      ctx.beginPath()
      ctx.arc(850, 245, 90 + i * 28, 0, Math.PI * 2)
      ctx.stroke()
    }
    const line = (text: string, y: number, size: number, weight: string, max = 760) => {
      ctx.fillStyle = '#172a15'
      ctx.font = `${weight} ${size}px system-ui`
      ctx.fillText(text, 60, y, max)
    }
    line('⚡ POPCARD / POPPAY', 112, 32, '700')
    line(card.merchant, 216, 45, '700')
    line(money(card.amount), 345, 106, '800')
    line(card.purpose, 420, 36, '500')
    line(card.customer, 562, 42, '750', 555)
    line('Due ' + shortDate(card.due), 626, 34, '500', 480)
    line(card.state.toUpperCase(), 687, 30, '700', 480)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(qr, 595, 510, 245, 245)
    line('REQUEST ID · ' + card.id, 875, 25, '600')
    line('FICTIONAL DEMO · NO MONEY MOVES', 1015, 30, '700')
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('PNG export is unavailable in this browser.')
    saveFile(`poppay-${card.id}-demo.png`, blob)
    toast('PopCard PNG exported.')
  }
  return (
    <div className="card-share">
      <div ref={preview}>
        <CardFace card={card} />
      </div>
      <div className="actions">
        <button
          className="btn primary"
          onClick={() =>
            void action(async () => {
              await copyText(card.url)
              toast('Demo link copied.')
            })
          }
        >
          <Copy size={16} /> Copy demo link
        </button>
        <button className="btn secondary" onClick={() => void action(png)}>
          <Download size={16} /> Download PNG
        </button>
        {typeof navigator.share === 'function' && (
          <button
            className="btn secondary"
            onClick={() =>
              void action(async () => {
                try {
                  await navigator.share({ title: 'PopPay fictional PopCard', url: card.url })
                } catch (e) {
                  if (!(e instanceof Error && e.name === 'AbortError')) throw e
                }
              })
            }
          >
            <Share2 size={16} /> Share
          </button>
        )}
      </div>
      <Field label="Shareable demo link">
        <input id={id} type="text" readOnly value={card.url} onFocus={(e) => e.currentTarget.select()} />
      </Field>
      <p className="muted">
        The QR contains a fictional snapshot. Only this browser can see or update the original request.
      </p>
      {error && <Issue>{error}</Issue>}
    </div>
  )
}
