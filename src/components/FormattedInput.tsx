import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface FormattedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string | number
  onValueChange: (val: string) => void
  isPrice?: boolean
  prefixText?: string
}

export function FormattedInput({
  value,
  onValueChange,
  onBlur,
  isPrice,
  className,
  prefixText,
  ...props
}: FormattedInputProps) {
  const [focused, setFocused] = useState(false)
  const [localVal, setLocalVal] = useState(String(value))

  useEffect(() => {
    if (!focused) setLocalVal(String(value))
  }, [value, focused])

  const displayValue = focused
    ? localVal
    : value === ''
      ? ''
      : Number(value).toLocaleString(
          'en-US',
          isPrice
            ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
            : { maximumFractionDigits: 4 },
        )

  return (
    <div className="relative w-full">
      {prefixText && !focused && value !== '' && (
        <span className="absolute left-2 top-1.5 text-muted-foreground text-[10px] font-medium z-10 pointer-events-none">
          {prefixText}
        </span>
      )}
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        className={cn(className, prefixText && !focused && value !== '' ? 'pl-5' : '')}
        value={displayValue}
        onFocus={(e) => {
          setFocused(true)
          setLocalVal(String(value))
          props.onFocus?.(e)
        }}
        onChange={(e) => {
          let val = e.target.value.replace(/,/g, '.')
          setLocalVal(val)

          const parsed = val
          if (parsed === '' || /^-?\d*\.?\d*$/.test(parsed)) {
            onValueChange(parsed)
          }
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
      />
    </div>
  )
}
