import { useState, useMemo } from 'react'

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
}

type SortField = 'date' | 'title' | 'distance' | 'gain' | 'area'
type SortOrder = 'asc' | 'desc'

const PAGE_SIZE_OPTIONS = [25, 50, 100]

export default function ClimbTable({ climbs, pageSize: initialPageSize = 50 }: ClimbTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState<string>('')
  const [stateFilter, setStateFilter] = useState<string>('')
  const [useMetric, setUseMetric] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

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
      result = result.filter(c => 
        c.title?.toLowerCase().includes(query) ||
        c.area?.toLowerCase().includes(query) ||
        c.state?.toLowerCase().includes(query)
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
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (aVal === null) aVal = sortOrder === 'asc' ? Infinity : -Infinity
      if (bVal === null) bVal = sortOrder === 'asc' ? Infinity : -Infinity

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal)
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })

    return result
  }, [climbs, searchQuery, areaFilter, stateFilter, sortField, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredClimbs.length / pageSize)
  const paginatedClimbs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredClimbs.slice(start, start + pageSize)
  }, [filteredClimbs, currentPage, pageSize])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const formatDistance = (miles: number | null) => {
    if (miles === null) return '-'
    if (useMetric) return `${(miles * 1.60934).toFixed(1)} km`
    return `${miles.toFixed(1)} mi`
  }

  const formatGain = (feet: number | null) => {
    if (feet === null) return '-'
    if (useMetric) return `${Math.round(feet * 0.3048).toLocaleString()} m`
    return `${feet.toLocaleString()}'`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
          placeholder="Search climbs..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
          style={{ minWidth: '200px' }}
        />
        
        <select 
          value={areaFilter} 
          onChange={(e) => { setAreaFilter(e.target.value); setCurrentPage(1) }}
        >
          <option value="">All Areas</option>
          {areas.map(area => (
            <option key={area} value={area}>{area}</option>
          ))}
        </select>

        <select 
          value={stateFilter} 
          onChange={(e) => { setStateFilter(e.target.value); setCurrentPage(1) }}
        >
          <option value="">All States</option>
          {states.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>

        <button 
          onClick={() => setUseMetric(!useMetric)}
          className={useMetric ? 'filter-btn active' : 'filter-btn'}
        >
          {useMetric ? 'Metric' : 'Imperial'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
          Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredClimbs.length)} of {filteredClimbs.length} climbs
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>Per page:</label>
          <select 
            value={pageSize} 
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
            style={{ width: 'auto' }}
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty state */}
      {filteredClimbs.length === 0 && (
        <div className="empty-state">
          <p>No climbs match your filters.</p>
          <button onClick={() => { setSearchQuery(''); setAreaFilter(''); setStateFilter(''); setCurrentPage(1) }} className="btn">
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
                  <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }} aria-label={`Sort by date, currently ${sortField === 'date' ? sortOrder : 'unsorted'}`}>
                    Date <SortIcon field="date" />
                  </th>
                  <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }} aria-label={`Sort by title, currently ${sortField === 'title' ? sortOrder : 'unsorted'}`}>
                    Hike <SortIcon field="title" />
                  </th>
                  <th onClick={() => handleSort('area')} style={{ cursor: 'pointer' }} aria-label={`Sort by area, currently ${sortField === 'area' ? sortOrder : 'unsorted'}`}>
                    Area <SortIcon field="area" />
                  </th>
                  <th onClick={() => handleSort('distance')} style={{ cursor: 'pointer', textAlign: 'right' }} aria-label={`Sort by distance, currently ${sortField === 'distance' ? sortOrder : 'unsorted'}`}>
                    Distance <SortIcon field="distance" />
                  </th>
                  <th onClick={() => handleSort('gain')} style={{ cursor: 'pointer', textAlign: 'right' }} aria-label={`Sort by gain, currently ${sortField === 'gain' ? sortOrder : 'unsorted'}`}>
                    Gain <SortIcon field="gain" />
                  </th>
                  <th style={{ textAlign: 'center' }}>Links</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClimbs.map((climb) => (
                  <tr key={climb.id}>
                    <td>
                      {climb.preview_img_url ? (
                        <a href={climb.slug ? `/blog/hike/${climb.slug}` : '#'} className="climb-thumb-link">
                          <img 
                            src={climb.preview_img_url} 
                            alt={climb.title || ''}
                            className="climb-thumb"
                            loading="lazy"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement
                              el.style.opacity = '0'
                              el.parentElement!.style.background = 'var(--color-bg-tertiary)'
                              el.parentElement!.style.display = 'flex'
                              el.parentElement!.style.alignItems = 'center'
                              el.parentElement!.style.justifyContent = 'center'
                              el.parentElement!.innerHTML = '<span style="font-size: 10px; color: var(--color-text-tertiary)">📷</span>'
                            }}
                          />
                        </a>
                      ) : (
                        <div className="climb-thumb-placeholder" />
                      )}
                    </td>
                    <td>{formatDate(climb.date)}</td>
                    <td>
                      {climb.slug ? (
                        <a href={`/blog/hike/${climb.slug}`}>{climb.title || 'Untitled'}</a>
                      ) : (
                        climb.title || 'Untitled'
                      )}
                    </td>
                    <td>
                      {climb.area}
                      {climb.state && <span style={{ color: 'var(--color-text-tertiary)' }}>, {climb.state}</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatDistance(climb.distance)}</td>
                    <td style={{ textAlign: 'right' }}>{formatGain(climb.gain)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {climb.strava && (
                        <a href={climb.strava} target="_blank" rel="noopener noreferrer" title="View on Strava">
                          🏃
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
            {paginatedClimbs.map((climb) => (
              <div className="climb-mobile-card" key={climb.id}>
                <div className="climb-mobile-header">
                  <span className="climb-mobile-date">{formatDate(climb.date)}</span>
                  {climb.strava && (
                    <a href={climb.strava} target="_blank" rel="noopener noreferrer" title="View on Strava">🏃</a>
                  )}
                </div>
                <h3 className="climb-mobile-title">
                  {climb.slug ? (
                    <a href={`/blog/hike/${climb.slug}`}>{climb.title || 'Untitled'}</a>
                  ) : (
                    climb.title || 'Untitled'
                  )}
                </h3>
                <div className="climb-mobile-meta">
                  {climb.area && <span>{climb.area}{climb.state && `, ${climb.state}`}</span>}
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
        <div className="pagination" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '0.5rem', 
          marginTop: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <button 
            onClick={() => setCurrentPage(1)} 
            disabled={currentPage === 1}
            className="pagination-btn"
            title="First page"
          >
            ««
          </button>
          <button 
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
            .reduce((acc: (number | string)[], page, idx, arr) => {
              // Add ellipsis between non-consecutive pages
              if (idx > 0 && typeof arr[idx - 1] === 'number' && page - (arr[idx - 1] as number) > 1) {
                acc.push('...')
              }
              acc.push(page)
              return acc
            }, [])
            .map((item, idx) => (
              typeof item === 'string' ? (
                <span key={`ellipsis-${idx}`} style={{ color: 'var(--color-text-tertiary)' }}>...</span>
              ) : (
                <button
                  key={item}
                  onClick={() => setCurrentPage(item)}
                  className={`pagination-btn ${currentPage === item ? 'active' : ''}`}
                >
                  {item}
                </button>
              )
            ))
          }
          
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={currentPage === totalPages}
            className="pagination-btn"
            title="Next page"
          >
            »
          </button>
          <button 
            onClick={() => setCurrentPage(totalPages)} 
            disabled={currentPage === totalPages}
            className="pagination-btn"
            title="Last page"
          >
            »»
          </button>
        </div>
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
        .climb-mobile-title a:hover {
          color: var(--color-text-accent);
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
        .climb-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s ease;
        }
        .climb-thumb-link:hover .climb-thumb {
          transform: scale(1.05);
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
          transition: all 0.2s;
        }
        .pagination-btn:hover:not(:disabled) {
          border-color: var(--color-border-hover);
          background: var(--color-bg-secondary);
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
