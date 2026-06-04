export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE')
}

export function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
