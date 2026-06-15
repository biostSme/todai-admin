export type ResizePreset = 'avatar' | 'cover' | 'article'

const PRESETS: Record<ResizePreset, { w: number; h: number; fit: 'cover' | 'contain' }> = {
  avatar:  { w: 400,  h: 400,  fit: 'cover' },   // ทีม, ศิษย์เก่า, บริษัท
  cover:   { w: 800,  h: 450,  fit: 'cover' },   // คอร์สเรียน, คอร์สองค์กร
  article: { w: 1200, h: 630,  fit: 'cover' },   // บทความ
}

export function resizeImage(file: File, preset: ResizePreset): Promise<File> {
  const { w, h, fit } = PRESETS[preset]
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!

      if (fit === 'cover') {
        const scale = Math.max(w / img.width, h / img.height)
        const sw = img.width * scale
        const sh = img.height * scale
        const sx = (w - sw) / 2
        const sy = (h - sh) / 2
        ctx.drawImage(img, sx, sy, sw, sh)
      } else {
        const scale = Math.min(w / img.width, h / img.height)
        const sw = img.width * scale
        const sh = img.height * scale
        ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh)
      }

      canvas.toBlob(blob => {
        if (!blob) return reject(new Error('Resize failed'))
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.88)
    }
    img.onerror = reject
    img.src = url
  })
}
