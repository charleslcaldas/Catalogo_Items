import * as React from 'react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface ResizableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  width: number
  minWidth?: number
  onResize: (width: number) => void
  onResizeEnd: (width: number) => void
}

export function ResizableHeader({
  width,
  minWidth = 50,
  onResize,
  onResizeEnd,
  className,
  children,
  ...props
}: ResizableHeaderProps) {
  const [isResizing, setIsResizing] = React.useState(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    const startX = e.pageX
    const startWidth = width

    document.body.style.userSelect = 'none'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(minWidth, startWidth + moveEvent.pageX - startX)
      onResize(newWidth)
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsResizing(false)
      document.body.style.userSelect = ''
      const finalWidth = Math.max(minWidth, startWidth + upEvent.pageX - startX)
      onResizeEnd(finalWidth)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <TableHead
      style={{ width, minWidth: width, maxWidth: width }}
      className={cn('relative group px-2 truncate', className)}
      {...props}
    >
      {children}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          'absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/50 z-20 transition-colors',
          isResizing && 'bg-primary',
        )}
      />
    </TableHead>
  )
}
