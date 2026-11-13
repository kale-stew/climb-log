import {
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { formatCalendarDate } from '../lib/dates'
import { sizedImageUrl } from '../lib/image-url'
import { knownOutingType, outingName } from '../lib/places'
import PhotoLightbox, { type LightboxPhoto } from './PhotoLightbox'

interface Climb {
  id: string
  date: string | null
  title: string | null
  slug: string | null
  preview_img_url: string | null
  distance: number | null
  gain: number | null
  area: string | null
  state: string | null
  strava: string | null
}

interface ClimbTableProps {
  climbs: Climb[]
  pageSize?: number
  initialPage?: number
  basePath?: string
  climbImages?: Record<string, LightboxPhoto[]>
}

type SortField = 'date' | 'title' | 'distance' | 'gain' | 'area'
type SortOrder = 'asc' | 'desc'

const PAGE_SIZE_OPTIONS = [25, 50, 100]

const NO_CLIMB_IMAGES: Record<string, LightboxPhoto[]> = {}

// Assigned photos when the outing has them; otherwise its preview image. Any
// photo missing a place or date borrows the outing's, so none shows up bare.
// Place moves as a unit: mixing a photo's area with the outing's state could
// pair names that don't belong together.
function imagesFor(climb: Climb, climbImages: Record<string, LightboxPhoto[]>): LightboxPhoto[] {
  const assigned = climbImages[climb.id]
  if (assigned?.length) {
    return assigned.map(photo => {
      const hasPlace = Boolean(photo.area || photo.state)
      return {
        ...photo,
        area: hasPlace ? photo.area : climb.area,
        state: hasPlace ? photo.state : climb.state,
        date: photo.date || climb.date,
      }
    })
  }
  if (!climb.preview_img_url) return []
  return [
    {
      id: `${climb.id}-preview`,
      src: sizedImageUrl(climb.preview_img_url, 1600),
      alt: climb.title || 'Photo',
      area: climb.area,
      state: climb.state,
      date: climb.date,
    },
  ]
}

/** Strava's chevron mark, sized to the text so the table and cards render the same icon. */
function StravaMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        fill="#FC4C02"
        d="M15.39 17.94 13.3 13.8h-3.07L15.39 24l5.15-10.2h-3.07M10.15 0 3.3 13.8h4.04l2.81-5.55 2.79 5.55h4.01L10.15 0z"
      />
    </svg>
  )
}

/** The activity from the title's prefix. Titles without one get no tag rather than a vague "outing". */
function OutingTag({ title }: { title: string | null }) {
  const type = knownOutingType(title)
  if (!type) return null
  return (
    <>
      {' '}
      <span className="outing-tag">{type}</span>
    </>
  )
}

export default function ClimbTable({
  climbs,
  pageSize: initialPageSize = 50,
  initialPage = 1,
  basePath = '/journal',
  climbImages = NO_CLIMB_IMAGES,
}: ClimbTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState<string>('')
  const [stateFilter, setStateFilter] = useState<string>('')
  const [useMetric, setUseMetric] = useState(false)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [selectedOutingId, setSelectedOutingId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ photos: LightboxPhoto[]; index: number } | null>(null)
  const [lightboxOpener, setLightboxOpener] = useState<HTMLElement | null>(null)
  const selectedItemRef = useRef<HTMLElement | null>(null)

  const setSelectedItemRef = (element: HTMLElement | null) => {
    if (element && element.getClientRects().length > 0) selectedItemRef.current = element
  }

  // Get unique areas and states for filters
  const areas = useMemo(() => {
    const set = new Set(climbs.map(c => c.area).filter((a): a is string => Boolean(a)))
    return Array.from(set).sort()
  }, [climbs])

  const states = useMemo(() => {
    const set = new Set(climbs.map(c => c.state).filter((s): s is string => Boolean(s)))
    return Array.from(set).sort()
  }, [climbs])

  // Filter and sort climbs
  const filteredClimbs = useMemo(() => {
    let result = [...climbs]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        c =>
          c.title?.toLowerCase().includes(query) ||
          c.area?.toLowerCase().includes(query) ||
          c.state?.toLowerCase().includes(query),
      )
    }

    // Area filter
    if (areaFilter) {
      result = result.filter(c => c.area === areaFilter)
    }

    // State filter
    if (stateFilter) {
      result = result.filter(c => c.state === stateFilter)
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]

      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(String(bVal))
          : String(bVal).localeCompare(aVal)
      }

      return sortOrder === 'asc' ? aVal - Number(bVal) : Number(bVal) - aVal
    })

    return result
  }, [climbs, searchQuery, areaFilter, stateFilter, sortField, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredClimbs.length / pageSize)
  const paginatedClimbs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredClimbs.slice(start, start + pageSize)
  }, [filteredClimbs, currentPage, pageSize])

  useEffect(() => {
    const outingId = new URLSearchParams(window.location.search).get('outing')
    if (!outingId) return

    const index = filteredClimbs.findIndex(climb => climb.id === outingId)
    if (index === -1) return

    setSelectedOutingId(outingId)
    setCurrentPage(Math.floor(index / pageSize) + 1)
  }, [filteredClimbs, pageSize])

  // Keep ?page=N in the address bar so the current page can be shared or
  // reloaded. replaceState avoids filling history with every page change.
  useEffect(() => {
    const url = new URL(window.location.href)
    const next = currentPage > 1 ? String(currentPage) : null
    if (url.searchParams.get('page') === next) return
    if (next) url.searchParams.set('page', next)
    else url.searchParams.delete('page')
    window.history.replaceState(window.history.state, '', url)
  }, [currentPage])

  useEffect(() => {
    if (!selectedOutingId || currentPage < 1) return
    const frame = window.requestAnimationFrame(() => {
      selectedItemRef.current?.scrollIntoView({
        block: 'center',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selectedOutingId, currentPage])

  // Pagination controls are real links so they work before hydration and
  // without JavaScript. With JavaScript, a plain click pages in place.
  const pageHref = (page: number) => (page > 1 ? `${basePath}?page=${page}` : basePath)
  const goToPage = (event: MouseEvent<HTMLAnchorElement>, page: number) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return
    event.preventDefault()
    setCurrentPage(page)
  }
  const pageLink = (
    page: number,
    label: ReactNode,
    options: {
      key?: string
      title?: string
      disabled?: boolean
      active?: boolean
      className?: string
    } = {},
  ) =>
    options.disabled ? (
      <span
        key={options.key}
        className={`pagination-btn is-disabled${options.className ? ` ${options.className}` : ''}`}
        aria-disabled="true"
        title={options.title}
      >
        {label}
      </span>
    ) : (
      <a
        key={options.key}
        href={pageHref(page)}
        onClick={event => goToPage(event, page)}
        className={`pagination-btn${options.active ? ' active' : ''}${options.className ? ` ${options.className}` : ''}`}
        aria-current={options.active ? 'page' : undefined}
        aria-label={options.title ?? `Page ${page}`}
        title={options.title}
      >
        {label}
      </a>
    )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  const formatDistance = (miles: number | null) => {
    if (miles === null) return '-'
    if (useMetric) return `${(miles * 1.60934).toFixed(1)} km`
    return `${miles.toFixed(1)} mi`
  }

  const formatGain = (feet: number | null) => {
    if (feet === null) return '-'
    if (useMetric) return `${Math.round(feet * 0.3048).toLocaleString()} m`
    return `${feet.toLocaleString()} ft`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return formatCalendarDate(dateStr)
  }

  const handleThumbnailError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.hidden = true
    event.currentTarget.closest('.climb-thumb-link')?.classList.add('is-missing')
  }

  // A full-width photo slot with nothing in it reads as broken, so drop it.
  const handleMobilePhotoError = (event: SyntheticEvent<HTMLImageElement>) => {
    const button = event.currentTarget.closest<HTMLElement>('.climb-mobile-photo')
    if (button) button.style.display = 'none'
  }

  // The viewer steps through every photo from every outing that matches the
  // current search and filters, in table order, across all pages.
  const journalImages = useMemo(() => {
    const photos: LightboxPhoto[] = []
    const startIndex = new Map<string, number>()
    for (const climb of filteredClimbs) {
      const images = imagesFor(climb, climbImages)
      if (!images.length) continue
      startIndex.set(climb.id, photos.length)
      photos.push(...images)
    }
    return { photos, startIndex }
  }, [filteredClimbs, climbImages])

  const openLightbox = (climb: Climb, opener: HTMLElement) => {
    const start = journalImages.startIndex.get(climb.id)
    if (start === undefined) return
    setLightbox({ photos: journalImages.photos, index: start })
    setLightboxOpener(opener)
  }

  const closeLightbox = () => {
    setLightbox(null)
    setLightboxOpener(null)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}>↕</span>
    return sortOrder === 'asc' ? <span>↑</span> : <span>↓</span>
  }

  return (
    <div>
      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search outings..."
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value)
            setCurrentPage(1)
          }}
          style={{ minWidth: '200px' }}
        />
        {searchQuery && (
          <button
            type="button"
            className="clear-search"
            onClick={() => {
              setSearchQuery('')
              setCurrentPage(1)
            }}
          >
            Clear search
          </button>
        )}

        <select
          value={areaFilter}
          onChange={e => {
            setAreaFilter(e.target.value)
            setCurrentPage(1)
          }}
        >
          <option value="">All areas</option>
          {areas.map(area => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>

        <select
          value={stateFilter}
          onChange={e => {
            setStateFilter(e.target.value)
            setCurrentPage(1)
          }}
        >
          <option value="">All regions</option>
          {states.map(state => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setUseMetric(!useMetric)}
          className={useMetric ? 'filter-btn active' : 'filter-btn'}
        >
          {useMetric ? 'Units: km / m' : 'Units: mi / ft'}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
          Showing {filteredClimbs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
          {Math.min(currentPage * pageSize, filteredClimbs.length)} of {filteredClimbs.length}{' '}
          outings
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label
            htmlFor="outings-page-size"
            style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}
          >
            Per page:
          </label>
          <select
            id="outings-page-size"
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value))
              setCurrentPage(1)
            }}
            style={{ width: 'auto' }}
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty state */}
      {filteredClimbs.length === 0 && (
        <div className="empty-state">
          <p>No outings match your filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setAreaFilter('')
              setStateFilter('')
              setCurrentPage(1)
            }}
            className="btn"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Desktop Table */}
      {filteredClimbs.length > 0 && (
        <>
          <div className="table-container desktop-only">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Photo</th>
                  <th
                    aria-sort={
                      sortField === 'date'
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button type="button" className="table-sort" onClick={() => handleSort('date')}>
                      Date <SortIcon field="date" />
                    </button>
                  </th>
                  <th
                    aria-sort={
                      sortField === 'title'
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="table-sort"
                      onClick={() => handleSort('title')}
                    >
                      Outing <SortIcon field="title" />
                    </button>
                  </th>
                  <th
                    aria-sort={
                      sortField === 'area'
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button type="button" className="table-sort" onClick={() => handleSort('area')}>
                      Area <SortIcon field="area" />
                    </button>
                  </th>
                  <th
                    style={{ textAlign: 'right' }}
                    aria-sort={
                      sortField === 'distance'
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="table-sort"
                      onClick={() => handleSort('distance')}
                    >
                      Distance <SortIcon field="distance" />
                    </button>
                  </th>
                  <th
                    style={{ textAlign: 'right' }}
                    aria-sort={
                      sortField === 'gain'
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button type="button" className="table-sort" onClick={() => handleSort('gain')}>
                      Gain <SortIcon field="gain" />
                    </button>
                  </th>
                  <th style={{ textAlign: 'center' }}>Links</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClimbs.map(climb => (
                  <tr
                    key={climb.id}
                    ref={selectedOutingId === climb.id ? setSelectedItemRef : undefined}
                    className={selectedOutingId === climb.id ? 'outing-highlight' : undefined}
                  >
                    <td>
                      {climb.preview_img_url ? (
                        <div className="climb-thumb-link">
                          <button
                            type="button"
                            className="climb-thumb-button"
                            onClick={event => openLightbox(climb, event.currentTarget)}
                            aria-label={`View photos from ${outingName(climb.title)}`}
                          >
                            <img
                              src={sizedImageUrl(climb.preview_img_url, 200)}
                              alt={outingName(climb.title)}
                              className="climb-thumb"
                              loading="lazy"
                              onError={handleThumbnailError}
                            />
                          </button>
                        </div>
                      ) : (
                        <div className="climb-thumb-placeholder" />
                      )}
                    </td>
                    <td className="cell-fixed">{formatDate(climb.date)}</td>
                    <td>
                      {climb.slug ? (
                        <a href={`/blog/hike/${climb.slug}`}>{outingName(climb.title)}</a>
                      ) : (
                        outingName(climb.title)
                      )}
                      <OutingTag title={climb.title} />
                    </td>
                    <td>
                      {climb.area}
                      {climb.state && (
                        <span style={{ color: 'var(--color-text-tertiary)' }}>, {climb.state}</span>
                      )}
                    </td>
                    <td className="cell-fixed cell-number">{formatDistance(climb.distance)}</td>
                    <td className="cell-fixed cell-number">{formatGain(climb.gain)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {climb.strava && (
                        <a
                          href={climb.strava}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on Strava"
                          aria-label={`View ${outingName(climb.title)} on Strava`}
                          className="strava-link"
                        >
                          <StravaMark />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mobile-only">
            {paginatedClimbs.map(climb => (
              <div
                ref={selectedOutingId === climb.id ? setSelectedItemRef : undefined}
                className={`climb-mobile-card ${selectedOutingId === climb.id ? 'outing-highlight' : ''}`}
                key={climb.id}
              >
                <div className="climb-mobile-header">
                  <span className="climb-mobile-date">{formatDate(climb.date)}</span>
                  {climb.strava && (
                    <a
                      href={climb.strava}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View on Strava"
                      aria-label={`View ${outingName(climb.title)} on Strava`}
                      className="strava-link"
                    >
                      <StravaMark />
                    </a>
                  )}
                </div>
                {climb.preview_img_url && (
                  <button
                    type="button"
                    className="climb-mobile-photo"
                    onClick={event => openLightbox(climb, event.currentTarget)}
                    aria-label={`View photos from ${outingName(climb.title)}`}
                  >
                    <img
                      src={sizedImageUrl(climb.preview_img_url, 800)}
                      alt={outingName(climb.title)}
                      loading="lazy"
                      onError={handleMobilePhotoError}
                    />
                  </button>
                )}
                <h3 className="climb-mobile-title">
                  {climb.slug ? (
                    <a href={`/blog/hike/${climb.slug}`}>{outingName(climb.title)}</a>
                  ) : (
                    outingName(climb.title)
                  )}
                  <OutingTag title={climb.title} />
                </h3>
                <div className="climb-mobile-meta">
                  {climb.area && (
                    <span>
                      {climb.area}
                      {climb.state && `, ${climb.state}`}
                    </span>
                  )}
                </div>
                <div className="climb-mobile-stats">
                  <span>{formatDistance(climb.distance)}</span>
                  <span>{formatGain(climb.gain)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="pagination"
          aria-label="Journal pages"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          {pageLink(1, '««', {
            title: 'First page',
            disabled: currentPage === 1,
          })}
          {pageLink(currentPage - 1, '«', { title: 'Previous page', disabled: currentPage === 1 })}

          {/* Page numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => {
              // Show first, last, current, and nearby pages
              if (page === 1 || page === totalPages) return true
              if (Math.abs(page - currentPage) <= 2) return true
              return false
            })
            .reduce((acc: { key: string; page: number | null }[], page, idx, arr) => {
              // Add ellipsis between non-consecutive pages
              if (
                idx > 0 &&
                typeof arr[idx - 1] === 'number' &&
                page - (arr[idx - 1] as number) > 1
              ) {
                acc.push({ key: `ellipsis-after-${arr[idx - 1]}`, page: null })
              }
              acc.push({ key: `page-${page}`, page })
              return acc
            }, [])
            .map(item =>
              item.page === null ? (
                <span
                  key={item.key}
                  className="pagination-number"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  ...
                </span>
              ) : (
                pageLink(item.page, item.page, {
                  key: item.key,
                  active: currentPage === item.page,
                  className: 'pagination-number',
                })
              ),
            )}
          <span className="pagination-status">
            Page {currentPage} of {totalPages}
          </span>

          {pageLink(currentPage + 1, '»', {
            title: 'Next page',
            disabled: currentPage === totalPages,
          })}
          {pageLink(totalPages, '»»', {
            title: 'Last page',
            disabled: currentPage === totalPages,
          })}
        </nav>
      )}

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onIndexChange={index => setLightbox(current => (current ? { ...current, index } : null))}
          onClose={closeLightbox}
          opener={lightboxOpener}
        />
      )}

      <style
        // Raw CSS: as a text child, quotes are escaped on the server only, which breaks hydration.
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static stylesheet, no user input
        dangerouslySetInnerHTML={{
          __html: `
        .empty-state {
          text-align: center;
          padding: var(--space-2xl) var(--space-lg);
          color: var(--color-text-tertiary);
        }
        .empty-state p {
          margin-bottom: var(--space-md);
        }

        .outing-highlight {
          outline: 3px solid var(--color-text-accent);
          outline-offset: -3px;
          scroll-margin-top: calc(var(--header-height) + var(--space-lg));
        }

        .table-sort {
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          letter-spacing: inherit;
          text-transform: inherit;
        }

        .climb-thumb-button,
        .climb-mobile-photo {
          display: block;
          padding: 0;
          border: 0;
          background: transparent;
        }
        .climb-thumb-button { width: 100%; height: 100%; }

        .desktop-only {
          display: block;
        }
        .mobile-only {
          display: none;
        }

        .climb-mobile-card {
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--border-radius-lg);
          padding: var(--space-md);
          margin-bottom: var(--space-md);
        }
        .climb-mobile-photo {
          width: 100%;
          aspect-ratio: 16 / 9;
          margin-bottom: var(--space-md);
          overflow: hidden;
          background: var(--color-bg-secondary);
          border-radius: var(--border-radius);
        }
        .climb-mobile-photo img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .climb-mobile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-sm);
        }
        .climb-mobile-date {
          font-size: var(--font-size-sm);
          color: var(--color-text-tertiary);
        }
        .outing-tag {
          font-size: var(--font-size-sm);
          font-weight: 400;
          color: var(--color-text-tertiary);
          text-transform: lowercase;
          white-space: nowrap;
        }
        .strava-link { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; min-height: 24px; }
        .cell-fixed { white-space: nowrap; font-variant-numeric: tabular-nums; }
        .cell-number { text-align: right; }
        .climb-mobile-title {
          font-size: var(--font-size-lg);
          font-weight: 600;
          margin: 0 0 var(--space-sm);
        }
        .climb-mobile-title a {
          color: inherit;
          text-decoration: none;
        }
        @media (hover: hover) and (pointer: fine) {
          .climb-mobile-title a:hover { color: var(--color-text-accent); }
          .climb-thumb-link:hover .climb-thumb { transform: scale(1.05); }
          .pagination-btn:hover:not(.is-disabled):not(.active) {
            border-color: var(--color-border-hover);
            background: var(--color-bg-secondary);
          }
        }
        .climb-mobile-meta {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin-bottom: var(--space-sm);
        }
        .climb-mobile-stats {
          display: flex;
          gap: var(--space-lg);
          font-size: var(--font-size-sm);
          color: var(--color-text-tertiary);
        }

        .climb-thumb-link {
          display: block;
          width: 60px;
          height: 45px;
          border-radius: var(--border-radius);
          overflow: hidden;
          background: var(--color-bg-secondary);
        }
        .climb-thumb-link.is-missing {
          display: grid;
          place-items: center;
        }
        .climb-thumb-link.is-missing::after {
          content: '📷';
          font-size: 10px;
        }
        .climb-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s ease;
        }
        .climb-thumb-placeholder {
          width: 60px;
          height: 45px;
          border-radius: var(--border-radius);
          background: var(--color-bg-secondary);
          border: 1px dashed var(--color-border);
        }
        .pagination-btn {
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-text);
          border-radius: var(--border-radius);
          cursor: pointer;
          font-size: 0.875rem;
          line-height: 1.2;
          text-decoration: none;
          display: inline-block;
          transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.12s ease-out;
        }
        a.pagination-btn:active { transform: scale(0.97); }
        .pagination-btn.is-disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .pagination-btn.active {
          background: var(--color-text);
          color: var(--color-bg);
          border-color: var(--color-text);
        }

        @media (max-width: 768px) {
          .desktop-only {
            display: none;
          }
          .mobile-only {
            display: block;
          }
        }
        /* Fingers need bigger targets than the compact desktop controls. */
        @media (pointer: coarse) {
          .pagination-btn {
            min-width: 44px;
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .strava-link { min-width: 44px; min-height: 44px; margin: -10px; }
        }
        /* Every page number can't fit one row at touch size, so phones get "Page N of M" between the arrows. */
        .pagination-status { display: none; }
        @media (max-width: 480px) {
          .pagination-number { display: none; }
          .pagination-status {
            display: inline;
            padding: 0 var(--space-sm);
            font-size: 0.875rem;
            font-variant-numeric: tabular-nums;
            color: var(--color-text-secondary);
          }
        }
      `,
        }}
      />
    </div>
  )
}
