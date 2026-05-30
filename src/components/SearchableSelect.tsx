import { useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn, getContrastColor } from '@/lib/utils'

export function SearchableSelect({
  options,
  value,
  onChange,
  onAddNew,
  placeholder = 'Selecione...',
  emptyText = 'Nenhum resultado.',
  valueColor,
}: {
  options: { value: string; label: string; color?: string }[]
  value: string | undefined
  onChange: (value: string) => void
  onAddNew?: () => void
  placeholder?: string
  emptyText?: string
  valueColor?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const colorToUse = valueColor || selected?.color

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-8 text-sm px-3 font-normal shadow-sm border-input',
            colorToUse ? 'border-transparent' : 'bg-background hover:bg-muted/50',
          )}
          style={
            colorToUse
              ? { backgroundColor: colorToUse, color: getContrastColor(colorToUse) }
              : undefined
          }
        >
          <div className="flex items-center truncate min-w-0">
            {colorToUse && !valueColor && (
              <div className="w-2 h-2 rounded-full mr-2 border border-black/20 shrink-0 bg-current opacity-75 mix-blend-multiply" />
            )}
            <span className="truncate">{selected ? selected.label : placeholder}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar..." className="h-8 text-sm" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === opt.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {opt.color && (
                    <div
                      className="w-3 h-3 rounded-full mr-2 border border-black/10 shrink-0"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {onAddNew && (
            <div className="p-1 border-t bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-sm text-primary font-medium"
                onClick={() => {
                  setOpen(false)
                  onAddNew()
                }}
              >
                <Plus className="mr-2 h-4 w-4 shrink-0" /> Novo
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
