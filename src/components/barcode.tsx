'use client'
import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

interface BarcodeProps {
  value: string
  width?: number
  height?: number
  displayValue?: boolean
  format?: string
  className?: string
}

export function Barcode({ value, width = 2, height = 60, displayValue = true, format = 'CODE128', className }: BarcodeProps) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      JsBarcode(ref.current, value || ' ', { format, width, height, displayValue, margin: 4, fontSize: 13 })
    } catch (e) {
      console.error('barcode error', e)
    }
  }, [value, width, height, displayValue, format])
  return <svg ref={ref} className={className} />
}
