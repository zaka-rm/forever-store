import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { fetchOrders, setOrderStatus, deleteOrder, ordersToCsv, formatDate, type OrderRow } from '@/lib/adminData'
import {
  ORDER_STATUSES,
  ORDER_FLOW,
  ORDER_STATUS_LABELS_FR,
  ORDER_STATUS_BADGE,
  type OrderStatus,
} from '@/lib/orderStatus'
import { formatPrice } from '@/lib/format'
import { orderWhatsAppUrl, printDeliverySlip, printDeliverySlips } from '@/lib/orderActions'
import { NewOrderForm } from '@/pages/admin/NewOrderForm'

function nextStatus(s: string): OrderStatus | null {
  const i = ORDER_FLOW.indexOf(s as OrderStatus)
  if (i === -1 || i >= ORDER_FLOW.length - 1) return null
  return ORDER_FLOW[i + 1]
}

export function OrdersPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')

  async function reload() {
    setOrders(await fetchOrders())
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter((o) => {
      if (statusFilter !== 'all' && (o.status || 'pending') !== statusFilter) return false
      if (q && !`${o.customer_name} ${o.phone ?? ''} ${o.order_ref ?? ''} ${o.customer_email ?? ''} ${o.city ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [orders, query, statusFilter])

  // Orders in the current view that still need to be prepared/shipped.
  const toShip = filtered.filter((o) => o.status !== 'cancelled' && o.status !== 'delivered')

  function exportCsv() {
    const csv = ordersToCsv(filtered)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    ;(async () => {
      try {
        setOrders(await fetchOrders())
      } catch {
        setError("Impossible de charger les commandes. Avez-vous exécuté 02_products-and-admin.sql (policies admin) ?")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function changeStatus(o: OrderRow, status: string) {
    const prev = o.status
    setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, status } : x)))
    try {
      await setOrderStatus(o.id, status)
      // Best-effort status email — silently ignored if the email function
      // (send-order-email) isn't deployed yet, so the status change never breaks.
      supabase.functions
        .invoke('send-order-email', {
          body: { orderId: o.id, status, siteUrl: window.location.origin },
        })
        .catch(() => {})
    } catch {
      setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, status: prev } : x)))
    }
  }

  async function handleDelete(o: OrderRow) {
    if (!confirm(`Supprimer définitivement la commande ${o.order_ref ?? ''} de ${o.customer_name} ?`)) return
    await deleteOrder(o.id)
    setOrders((list) => list.filter((x) => x.id !== o.id))
  }

  if (loading) return <p className="py-16 text-center text-ink/40">Chargement…</p>
  if (error) return <p className="rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{error}</p>

  if (creating) {
    return (
      <NewOrderForm
        onSaved={async () => {
          setCreating(false)
          await reload()
        }}
        onCancel={() => setCreating(false)}
      />
    )
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          {filtered.length}{filtered.length !== orders.length ? ` / ${orders.length}` : ''} commande{orders.length > 1 ? 's' : ''}
        </p>
        <div className="flex flex-none flex-wrap justify-end gap-2">
          {toShip.length > 0 && (
            <button
              onClick={() => printDeliverySlips(toShip)}
              className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink hover:border-ink"
            >
              🖨 Bons du jour ({toShip.length})
            </button>
          )}
          {orders.length > 0 && (
            <button
              onClick={exportCsv}
              className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink hover:border-ink"
            >
              ⬇ Export CSV
            </button>
          )}
          <button
            onClick={() => setCreating(true)}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-sage-700"
          >
            + Nouvelle commande
          </button>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="mb-5 flex flex-col gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom, téléphone, n° de commande…"
            className="w-full rounded-full border border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${statusFilter === 'all' ? 'bg-ink text-cream' : 'bg-cream-dark text-ink/60 hover:text-ink'}`}
            >
              Toutes
            </button>
            {ORDER_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${statusFilter === s ? 'bg-ink text-cream' : 'bg-cream-dark text-ink/60 hover:text-ink'}`}
              >
                {ORDER_STATUS_LABELS_FR[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <p className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center text-sm text-ink/40">
          Aucune commande pour le moment.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center text-sm text-ink/40">
          Aucune commande ne correspond.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((o) => {
            const status = (o.status || 'pending') as OrderStatus
            const next = nextStatus(status)
            return (
              <div key={o.id} className="overflow-hidden rounded-3xl border border-ink/10 bg-cream-dark">
                <button
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {o.customer_name}
                      {o.order_ref && <span className="ml-2 text-xs font-normal text-ink/40">#{o.order_ref}</span>}
                    </p>
                    <p className="truncate text-xs text-ink/45">{o.customer_email} · {formatDate(o.created_at)}</p>
                  </div>
                  <span className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-medium ${ORDER_STATUS_BADGE[status]}`}>
                    {ORDER_STATUS_LABELS_FR[status]}
                  </span>
                  <span className="flex-none font-display text-sm font-bold text-ink">
                    {formatPrice(Number(o.total))}
                  </span>
                  <span className="flex-none text-ink/30">{expanded === o.id ? '−' : '+'}</span>
                </button>

                {expanded === o.id && (
                  <div className="border-t border-ink/10 px-5 py-4 text-sm">
                    <ul className="mb-4 flex flex-col gap-1.5">
                      {o.items.map((it, i) => (
                        <li key={i} className="flex justify-between text-ink/70">
                          <span>{it.name} × {it.quantity}</span>
                          <span>{formatPrice(it.price * it.quantity)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mb-4 flex flex-col gap-1 border-t border-ink/10 pt-3 text-xs text-ink/50">
                      <span>
                        Paiement : {o.payment_method === 'cod' ? 'À la livraison' : o.payment_method === 'card' ? 'Carte (Stripe)' : '—'}
                      </span>
                      <span>Sous-total : {formatPrice(Number(o.subtotal))} · Livraison : {formatPrice(Number(o.shipping))}</span>
                      {(o.address || o.city) && (
                        <span>
                          Livraison : {[o.address, o.city, o.zip, o.region, o.country].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {o.phone && <span>Tél : {o.phone}</span>}
                      {o.notes && (
                        <span className="mt-1 rounded-lg bg-clay-500/10 px-2 py-1 text-clay-600">📝 {o.notes}</span>
                      )}
                    </div>

                    {/* Quick actions: contact the customer / print for the courier */}
                    <div className="mb-4 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
                      <a
                        href={orderWhatsAppUrl(o)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-1.5 text-xs font-medium text-white hover:brightness-95"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M17.5 14.4c-.3-.15-1.7-.85-2-.95-.25-.1-.45-.15-.65.15-.2.3-.75.95-.9 1.1-.15.2-.35.2-.65.05-.3-.15-1.25-.45-2.4-1.5-.9-.8-1.5-1.75-1.65-2.05-.15-.3 0-.45.15-.6.15-.15.3-.35.45-.55.15-.2.2-.3.3-.5.1-.2.05-.4-.05-.55-.1-.15-.65-1.55-.9-2.15-.2-.55-.45-.5-.65-.5h-.55c-.2 0-.5.05-.75.35-.25.3-1 1-1 2.4s1.05 2.8 1.2 3c.15.2 2.05 3.15 5 4.4.7.3 1.25.5 1.65.65.7.2 1.35.2 1.85.1.55-.05 1.7-.7 1.95-1.35.25-.65.25-1.2.15-1.35-.1-.15-.3-.2-.6-.35zM12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.25A10 10 0 1012 2z"/></svg>
                        WhatsApp le client
                      </a>
                      <button
                        onClick={() => printDeliverySlip(o)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-1.5 text-xs font-medium text-ink hover:border-ink"
                      >
                        🖨️ Bon de livraison
                      </button>
                    </div>

                    {/* Fulfilment workflow */}
                    <div className="border-t border-ink/10 pt-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink/40">Statut de la commande</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {status !== 'cancelled' && next && (
                          <button
                            onClick={() => changeStatus(o, next)}
                            className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-cream hover:bg-sage-700"
                          >
                            {status === 'pending' ? 'Confirmer la commande' : `Marquer : ${ORDER_STATUS_LABELS_FR[next]}`}
                          </button>
                        )}
                        {status !== 'cancelled' && status !== 'delivered' && (
                          <button
                            onClick={() => changeStatus(o, 'cancelled')}
                            className="rounded-full border border-clay-500/30 px-4 py-1.5 text-xs text-clay-600 hover:border-clay-500"
                          >
                            Annuler
                          </button>
                        )}
                        {status === 'cancelled' && (
                          <button
                            onClick={() => changeStatus(o, 'pending')}
                            className="rounded-full border border-ink/15 px-4 py-1.5 text-xs text-ink hover:border-ink"
                          >
                            Rétablir
                          </button>
                        )}
                        <select
                          value={status}
                          onChange={(e) => changeStatus(o, e.target.value)}
                          className="ml-auto rounded-full border border-ink/15 bg-cream px-3 py-1.5 text-xs text-ink outline-none"
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>{ORDER_STATUS_LABELS_FR[s]}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => handleDelete(o)}
                        className="mt-3 text-xs text-ink/40 underline-offset-2 hover:text-clay-600 hover:underline"
                      >
                        Supprimer cette commande
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
