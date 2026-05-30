import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function PriceInput({
  value,
  onChange,
  className,
}: {
  value: number | undefined
  onChange: (val: number | undefined) => void
  className?: string
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
    val = val.replace(/[^0-9.]/g, '')
    const parts = val.split('.')
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('')
    }
    setStrVal(val)
    if (val === '' || val === '.') {
      onChange(undefined)
    } else {
      onChange(parseFloat(val))
    }
  }

  return (
    <Input
      className={cn('font-mono', className)}
      value={strVal}
      onChange={handleChange}
      placeholder="0.00"
    />
  )
}
