import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from 'react'
import { formatCalendarDate } from '../lib/dates'
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
  climbImages?: Record<string, LightboxPhoto[]>
}

type SortField = 'date' | 'title' | 'distance' | 'gain' | 'area'
type SortOrder = 'asc' | 'desc'

const PAGE_SIZE_OPTIONS = [25, 50, 100]

// Previews are stored as 200px thumbnails, often as /img/{id}/?w=200. Request
// the width each surface needs, and drop the trailing slash so the request
// skips a redirect.
function sizedImageUrl(url: string, width: number): string {
  if (!url.startsWith('/img/')) return url
  const path = url.replace(/\/(?=\?|$)/, '')
  if (/[?&]w=\d+/.test(path)) return path.replace(/([?&]w=)\d+/, (_, prefix) => `${prefix}${width}`)
  return `${path}${path.includes('?') ? '&' : '?'}w=${width}`
}

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

export default function ClimbTable({
  climbs,
  pageSize: initialPageSize = 50,
  climbImages = NO_CLIMB_IMAGES,
}: ClimbTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState<string>('')
  const [stateFilter, setStateFilter] = useState<string>('')
  const [useMetric, setUseMetric] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
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
          <option value="">All Areas</option>
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
          <option value="">All States</option>
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
          {useMetric ? 'Metric' : 'Imperial'}
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
                            aria-label={`View photos from ${climb.title || 'this outing'}`}
                          >
                            <img
                              src={sizedImageUrl(climb.preview_img_url, 200)}
                              alt=""
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
                    <td>{formatDate(climb.date)}</td>
                    <td>
                      {climb.slug ? (
                        <a href={`/blog/hike/${climb.slug}/`}>{climb.title || 'Untitled'}</a>
                      ) : (
                        climb.title || 'Untitled'
                      )}
                    </td>
                    <td>
                      {climb.area}
                      {climb.state && (
                        <span style={{ color: 'var(--color-text-tertiary)' }}>, {climb.state}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatDistance(climb.distance)}</td>
                    <td style={{ textAlign: 'right' }}>{formatGain(climb.gain)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {climb.strava && (
                        <a
                          href={climb.strava}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on Strava"
                        >
                          🏃🏼‍♀️
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
                    >
                      🏃🏼
                    </a>
                  )}
                </div>
                {climb.preview_img_url && (
                  <button
                    type="button"
                    className="climb-mobile-photo"
                    onClick={event => openLightbox(climb, event.currentTarget)}
                    aria-label={`View photos from ${climb.title || 'this outing'}`}
                  >
                    <img
                      src={sizedImageUrl(climb.preview_img_url, 800)}
                      alt=""
                      loading="lazy"
                      onError={handleMobilePhotoError}
                    />
                  </button>
                )}
                <h3 className="climb-mobile-title">
                  {climb.slug ? (
                    <a href={`/blog/hike/${climb.slug}/`}>{climb.title || 'Untitled'}</a>
                  ) : (
                    climb.title || 'Untitled'
                  )}
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
        <div
          className="pagination"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="pagination-btn"
            title="First page"
          >
            ««
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
            title="Previous page"
          >
            «
          </button>

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
                <span key={item.key} style={{ color: 'var(--color-text-tertiary)' }}>
                  ...
                </span>
              ) : (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => item.page !== null && setCurrentPage(item.page)}
                  className={`pagination-btn ${currentPage === item.page ? 'active' : ''}`}
                >
                  {item.page}
                </button>
              ),
            )}

          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
            title="Next page"
          >
            »
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
            title="Last page"
          >
            »»
          </button>
        </div>
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

      <style>{`
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
          .pagination-btn:hover:not(:disabled) {
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
          transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        .pagination-btn:disabled {
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
      `}</style>
    </div>
  )
}
