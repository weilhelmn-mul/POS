'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, OpenSale } from '@/types'

interface CartState {
  sales: OpenSale[]
  activeId: string | null
  active: () => OpenSale | null
  newSale: () => string
  selectSale: (id: string) => void
  closeSale: (id: string) => void
  setCustomer: (id: string | null, name: string) => void
  setDiscount: (d: number) => void
  setObservations: (o: string) => void
  setPaymentMethod: (m: string) => void
  addItem: (item: CartItem) => void
  updateQty: (productId: string, qty: number) => void
  updatePrice: (productId: string, price: number) => void
  removeItem: (productId: string) => void
  clearActive: () => void
  replaceItems: (items: CartItem[]) => void
  subtotal: () => number
  total: () => number
}

function genId() {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      sales: [],
      activeId: null,
      active: () => {
        const { sales, activeId } = get()
        return sales.find((s) => s.id === activeId) || null
      },
      newSale: () => {
        const sale: OpenSale = { id: genId(), customerId: null, customerName: 'Consumidor', items: [], discount: 0, observations: '', paymentMethod: 'cash', createdAt: Date.now() }
        set((st) => ({ sales: [...st.sales, sale], activeId: sale.id }))
        return sale.id
      },
      selectSale: (id) => set({ activeId: id }),
      closeSale: (id) => set((st) => {
        const sales = st.sales.filter((s) => s.id !== id)
        const activeId = st.activeId === id ? (sales[0]?.id ?? null) : st.activeId
        return { sales, activeId }
      }),
      setCustomer: (id, name) => set((st) => {
        const sales = st.sales.map((s) => s.id === st.activeId ? { ...s, customerId: id, customerName: name } : s)
        return { sales }
      }),
      setDiscount: (d) => set((st) => ({ sales: st.sales.map((s) => s.id === st.activeId ? { ...s, discount: d } : s) })),
      setObservations: (o) => set((st) => ({ sales: st.sales.map((s) => s.id === st.activeId ? { ...s, observations: o } : s) })),
      setPaymentMethod: (m) => set((st) => ({ sales: st.sales.map((s) => s.id === st.activeId ? { ...s, paymentMethod: m } : s) })),
      addItem: (item) => set((st) => {
        const sales = st.sales.map((s) => {
          if (s.id !== st.activeId) return s
          const existing = s.items.find((i) => i.productId === item.productId)
          let items
          if (existing) {
            items = s.items.map((i) => i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity, total: +((i.quantity + item.quantity) * i.unitPrice - i.discount).toFixed(2) } : i)
          } else {
            items = [...s.items, item]
          }
          return { ...s, items }
        })
        return { sales }
      }),
      updateQty: (productId, qty) => set((st) => ({
        sales: st.sales.map((s) => s.id !== st.activeId ? s : {
          ...s,
          items: s.items.map((i) => i.productId === productId ? { ...i, quantity: Math.max(0.001, qty), total: +((qty * i.unitPrice) - i.discount).toFixed(2) } : i),
        }),
      })),
      updatePrice: (productId, price) => set((st) => ({
        sales: st.sales.map((s) => s.id !== st.activeId ? s : {
          ...s,
          items: s.items.map((i) => i.productId === productId ? { ...i, unitPrice: price, total: +((i.quantity * price) - i.discount).toFixed(2) } : i),
        }),
      })),
      removeItem: (productId) => set((st) => ({
        sales: st.sales.map((s) => s.id !== st.activeId ? s : { ...s, items: s.items.filter((i) => i.productId !== productId) }),
      })),
      clearActive: () => set((st) => ({
        sales: st.sales.map((s) => s.id === st.activeId ? { ...s, items: [], discount: 0, customerId: null, customerName: 'Consumidor' } : s),
      })),
      replaceItems: (items) => set((st) => ({
        sales: st.sales.map((s) => s.id === st.activeId ? { ...s, items } : s),
      })),
      subtotal: () => {
        const a = get().active()
        return a ? +a.items.reduce((s, i) => s + i.total, 0).toFixed(2) : 0
      },
      total: () => {
        const a = get().active()
        return a ? +Math.max(0, a.items.reduce((s, i) => s + i.total, 0) - a.discount).toFixed(2) : 0
      },
    }),
    { name: 'pos-cart' },
  ),
)
