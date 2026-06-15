import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  altText = 'Preview da imagem',
}: {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  altText?: string
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex justify-center items-center [&>button]:text-white [&>button]:bg-black/50 [&>button]:rounded-full [&>button]:w-8 [&>button]:h-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 hover:[&>button]:bg-black/70">
        <DialogTitle className="sr-only">Visualizar Imagem</DialogTitle>
        <DialogDescription className="sr-only">Imagem em tamanho original</DialogDescription>
        <img
          src={imageUrl}
          alt={altText}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl bg-black/50"
        />
      </DialogContent>
    </Dialog>
  )
}
