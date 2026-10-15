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
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  return parseCalendarDate(value).toLocaleDateString('en-US', options)
}
