import { resizeImage } from './resizeImage'

type ResizeMode = 'avatar' | 'cover' | 'article'

export async function uploadImage(
  file: File,
  folder: string,
  mode: ResizeMode = 'avatar',
  fixedFilename?: string
): Promise<string | null> {
  if (!file.type.startsWith('image/')) {
    alert('กรุณาเลือกไฟล์รูปภาพ')
    return null
  }
  const resized = await resizeImage(file, mode)
  const filename = fixedFilename || `${Date.now()}.jpg`

  const form = new FormData()
  form.append('file', resized, filename)
  form.append('folder', folder)
  form.append('filename', filename)

  const res = await fetch('/api/upload', { method: 'POST', body: form })
  if (!res.ok) {
    alert('อัปโหลดไม่สำเร็จ')
    return null
  }
  const { url } = await res.json()
  return url
}
