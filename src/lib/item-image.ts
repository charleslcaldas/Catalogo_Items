import pb from '@/lib/pocketbase/client'

export function getItemImageUrl(item: any, size: number = 100): string {
  const placeholder = `https://img.usecurling.com/p/${size}/${size}?q=tools&color=gray`

  const fotoCatalogo = item?.expand?.foto_catalogo_id
  if (fotoCatalogo && typeof fotoCatalogo === 'object') {
    if (fotoCatalogo.arquivo) {
      const opts = size <= 400 ? { thumb: `${size}x${size}` } : undefined
      return pb.files.getURL(fotoCatalogo, fotoCatalogo.arquivo, opts)
    }
    if (fotoCatalogo.url_foto) {
      return fotoCatalogo.url_foto
    }
  }

  if (item?.foto_url) {
    return item.foto_url
  }

  return placeholder
}
