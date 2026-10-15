const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** Parse a YYYY-MM-DD value as a local calendar date, not UTC midnight. */
export function parseCalendarDate(value: string): Date {
  const match = DATE_ONLY_PATTERN.exec(value)
  if (!match) return new Date(value)

  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

export function formatCalendarDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
  return parseCalendarDate(value).toLocaleDateString('en-US', options)
}

/** Format a date-only value as a friendly age, such as "8 months ago". */
export function formatRelativeDate(value: string, now = new Date()): string {
  const date = parseCalendarDate(value)
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((dateUtc - nowUtc) / 86_400_000)
  const formatter = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })

  if (Math.abs(days) < 7) return formatter.format(days, 'day')

  const weeks = Math.round(days / 7)
  if (Math.abs(days) < 60) return formatter.format(weeks, 'week')

  const months = Math.round(days / 30.4375)
  if (Math.abs(days) < 365) return formatter.format(months, 'month')

  return formatter.format(Math.round(days / 365.25), 'year')
}

/** Use relative time for genuinely recent dates, then switch to a compact date. */
export function formatRecentDate(value: string, now = new Date()): string {
  const date = parseCalendarDate(value)
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const ageInDays = Math.abs(Math.round((nowUtc - dateUtc) / 86_400_000))

  if (ageInDays < 60) return formatRelativeDate(value, now)
  return formatCalendarDate(value, { month: 'short', day: 'numeric' })
}
