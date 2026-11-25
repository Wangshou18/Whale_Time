export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, index)
  return `${value >= 100 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function filenameStamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

export function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,，、\s]+/)
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean),
    ),
  ).slice(0, 8)
}

export function isTextLike(type: string, name: string): boolean {
  if (type.startsWith('text/')) return true
  return /\.(txt|md|markdown|json|csv|log|ts|tsx|js|jsx|css|html|xml|yml|yaml)$/i.test(name)
}
