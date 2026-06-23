import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function PriceInput({
  value,
  onChange,
  onBlur,
  className,
  disabled,
}: {
  value: number | undefined
  onChange: (val: number | undefined) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  className?: string
  disabled?: boolean
}) {
  const [strVal, setStrVal] = useState(value !== undefined ? String(value) : '')

  useEffect(() => {
    if (value !== undefined && strVal !== String(value) && strVal !== `${value}.`) {
      if (parseFloat(strVal) !== value) {
        setStrVal(String(value))
      }
    } else if (value === undefined && strVal !== '') {
      setStrVal('')
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/,/g, '.')
    val = val.replace(/[^0-9.-]/g, '')
    const parts = val.split('.')
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('')
    }
    setStrVal(val)
    if (val === '' || val === '.' || val === '-') {
      onChange(undefined)
    } else {
      onChange(parseFloat(val))
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (value !== undefined) {
      // Optional minimal formatting
    }
    onBlur?.(e)
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      className={cn('font-mono', className)}
      value={strVal}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="0.00"
      disabled={disabled}
    />
  )
}
