import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { formatCalendarDate } from '../lib/dates'
import { getCollectionPage } from '../lib/photos-client'

interface Photo {
  id: string
  title?: string | null
  short_id?: string | null
  url: string
  caption: string | null
  date: string | null
  area: string | null
  state: string | null
  camera?: string | null
  width: number | null
  height: number | null
  blurhash?: string | null
  accent_color?: string | null
  tags?: string | null
  r2_key?: string | null
}

interface PhotoGalleryProps {
  photos: Photo[]
  total?: number
  apiOrigin?: string
  collection?: string
}

const PAGE_SIZE = 60

function getImageUrl(photo: Photo, size: 'thumb' | 'full' = 'thumb') {
  const id = photo.short_id || photo.id
  return size === 'thumb' ? `/img/${id}/?w=800` : `/img/${id}/`
}

const GRID_MIN_WIDTHS = [64, 96, 160, 260, 420]
const GRID_GAPS = ['1px', '2px', '0.35rem', '0.65rem', '1rem']
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export default function PhotoGallery({
  photos: initialPhotos,
  total: initialTotal = initialPhotos.length,
  apiOrigin,
  collection = 'portfolio',
}: PhotoGalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [total, setTotal] = useState(initialTotal)
  const [isLoading, setIsLoading] = useState(initialPhotos.length === 0 && Boolean(apiOrigin))
  const [loadError, setLoadError] = useState(false)
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; index: number } | null>(null)
  const [filter, setFilter] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [gridZoom, setGridZoom] = useState(2)
  const gridZoomRef = useRef(gridZoom)
  const pinchStartDistance = useRef<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const previousRects = useRef(new Map<string, DOMRect>())
  const activeAnimations = useRef(new Set<Animation>())
  const requestRef = useRef<AbortController | null>(null)
  const hasInitialPage = useRef(initialPhotos.length > 0)

  const fetchPage = useCallback(
    async (query: string, offset: number) => {
      if (!apiOrigin) return
      requestRef.current?.abort()
      const controller = new AbortController()
      requestRef.current = controller
      setIsLoading(true)
      setLoadError(false)
      try {
        const page = await getCollectionPage(apiOrigin, collection, {
          limit: PAGE_SIZE,
          offset,
          query,
          signal: controller.signal,
        })
        setPhotos(current => {
          if (offset === 0) return page.photos
          const seen = new Set(current.map(photo => photo.id))
          return [...current, ...page.photos.filter(photo => !seen.has(photo.id))]
        })
        setTotal(page.total)
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(true)
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null
          setIsLoading(false)
        }
      }
    },
    [apiOrigin, collection],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setActiveQuery(filter.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [filter])

  useEffect(() => {
    if (!activeQuery && hasInitialPage.current) {
      hasInitialPage.current = false
      return
    }
    hasInitialPage.current = false
    fetchPage(activeQuery, 0)
  }, [activeQuery, fetchPage])

  useEffect(() => () => requestRef.current?.abort(), [])

  const filteredPhotos = photos

  const openLightbox = (index: number) => {
    setLightbox({ photos: filteredPhotos, index })
  }
  const closeLightbox = useCallback(() => setLightbox(null), [])

  const goNext = useCallback(() => {
    setLightbox(current =>
      current ? { ...current, index: (current.index + 1) % current.photos.length } : null,
    )
  }, [])

  const goPrev = useCallback(() => {
    setLightbox(current =>
      current
        ? {
            ...current,
            index: (current.index - 1 + current.photos.length) % current.photos.length,
          }
        : null,
    )
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightbox === null) return

      switch (e.key) {
        case 'Escape':
          closeLightbox()
          break
        case 'ArrowRight':
          goNext()
          break
        case 'ArrowLeft':
          goPrev()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightbox, goNext, goPrev, closeLightbox])

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (lightbox !== null) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [lightbox])

  useEffect(() => {
    if (!lightbox || lightbox.photos.length < 2) return

    const count = lightbox.photos.length
    for (const photo of [
      lightbox.photos[(lightbox.index - 1 + count) % count],
      lightbox.photos[(lightbox.index + 1) % count],
    ]) {
      const image = new Image()
      image.src = getImageUrl(photo, 'full')
    }
  }, [lightbox])

  const currentPhoto = lightbox ? lightbox.photos[lightbox.index] : null
  const visiblePhotos = filteredPhotos
  const gridMinWidth = GRID_MIN_WIDTHS[gridZoom]
  const gridGap = GRID_GAPS[gridZoom]

  const captureVisibleTiles = () => {
    const tiles = gridRef.current?.querySelectorAll<HTMLElement>('[data-photo-id]')
    if (!tiles) return

    const visible = new Map<string, DOMRect>()
    for (const tile of tiles) {
      if (visible.size >= 12) break
      for (const animation of tile.getAnimations()) animation.cancel()
      const rect = tile.getBoundingClientRect()
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        visible.set(tile.dataset.photoId ?? '', rect)
      }
    }
    previousRects.current = visible
  }

  const changeGridZoom = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(GRID_MIN_WIDTHS.length - 1, gridZoomRef.current + direction))
    if (next === gridZoomRef.current) return
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) captureVisibleTiles()
    gridZoomRef.current = next
    setGridZoom(next)
  }

  useIsomorphicLayoutEffect(() => {
    if (previousRects.current.size === 0) return
    const tiles = gridRef.current?.querySelectorAll<HTMLElement>('[data-photo-id]')
    if (!tiles) return

    for (const tile of tiles) {
      const previous = previousRects.current.get(tile.dataset.photoId ?? '')
      if (!previous) continue
      for (const animation of tile.getAnimations()) animation.cancel()
      const current = tile.getBoundingClientRect()
      if (current.bottom <= 0 || current.top >= window.innerHeight) continue

      const animation = tile.animate(
        [
          {
            transform: `translate(${previous.left - current.left}px, ${previous.top - current.top}px) scale(${previous.width / current.width}, ${previous.height / current.height})`,
            transformOrigin: 'top left',
          },
          { transform: 'none', transformOrigin: 'top left' },
        ],
        { duration: 180, easing: 'cubic-bezier(.2, .8, .2, 1)' },
      )
      activeAnimations.current.add(animation)
      animation.finished.then(
        () => activeAnimations.current.delete(animation),
        () => activeAnimations.current.delete(animation),
      )
    }
    previousRects.current.clear()
  }, [gridZoom])

  useEffect(
    () => () => {
      for (const animation of activeAnimations.current) animation.cancel()
      activeAnimations.current.clear()
    },
    [],
  )

  const getTouchDistance = (touches: ArrayLike<{ clientX: number; clientY: number }>) => {
    const first = touches[0]
    const second = touches[1]
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return formatCalendarDate(dateStr, { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <>
      {/* Search */}
      <div className="gallery-tools">
        <input
          type="text"
          placeholder="Search by caption, location, year, month, or tags..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div className="gallery-status">
          <p aria-live="polite">
            {isLoading && photos.length === 0
              ? 'Loading photos…'
              : `Showing ${photos.length} of ${total} photos`}
          </p>
          <fieldset className="gallery-zoom">
            <legend className="sr-only">Gallery size</legend>
            <button
              type="button"
              onClick={() => changeGridZoom(-1)}
              disabled={gridZoom === 0}
              aria-label="Show more photos"
              title="Show more photos"
            >
              −
            </button>
            <span aria-live="polite">
              <span className="sr-only">Gallery size </span>
              {gridZoom + 1}
            </span>
            <button
              type="button"
              onClick={() => changeGridZoom(1)}
              disabled={gridZoom === GRID_MIN_WIDTHS.length - 1}
              aria-label="Show larger photos"
              title="Show larger photos"
            >
              +
            </button>
          </fieldset>
        </div>
      </div>

      {/* Gallery Grid */}
      <div
        ref={gridRef}
        className="photo-grid"
        data-grid-zoom={gridZoom}
        style={
          { '--photo-min-width': `${gridMinWidth}px`, '--photo-gap': gridGap } as CSSProperties
        }
        onTouchStart={event => {
          if (event.touches.length === 2)
            pinchStartDistance.current = getTouchDistance(event.touches)
        }}
        onTouchMove={event => {
          if (event.touches.length !== 2 || pinchStartDistance.current === null) return
          const distance = getTouchDistance(event.touches)
          if (Math.abs(distance - pinchStartDistance.current) < 35) return
          changeGridZoom(distance > pinchStartDistance.current ? 1 : -1)
          pinchStartDistance.current = distance
        }}
        onTouchEnd={() => {
          pinchStartDistance.current = null
        }}
      >
        {visiblePhotos.map((photo, index) => (
          <button
            type="button"
            key={photo.id}
            className="photo-item"
            data-photo-id={photo.id}
            onClick={() => openLightbox(index)}
            aria-label={`View photo: ${photo.caption || photo.title || 'Mountain photo'}`}
            style={photo.accent_color ? { backgroundColor: photo.accent_color } : undefined}
          >
            <img
              src={getImageUrl(photo, 'thumb')}
              alt=""
              loading="lazy"
              width={photo.width ?? 800}
              height={photo.height ?? 600}
              onError={e => {
                // If image fails to load, hide it to show the background/accent color
                e.currentTarget.style.display = 'none'
              }}
            />
            {(photo.caption || photo.title) && (
              <div className="photo-overlay">
                <strong>{photo.title || photo.caption}</strong>
                {photo.area && (
                  <span>
                    {photo.area}
                    {photo.state && `, ${photo.state}`}
                  </span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {!isLoading && photos.length === 0 && !loadError && (
        <p className="gallery-empty">No photos match that search.</p>
      )}

      {(photos.length < total || loadError) && (
        <div className="load-more-wrap">
          <button
            type="button"
            className="load-more"
            disabled={isLoading}
            onClick={() => fetchPage(activeQuery, loadError && photos.length === 0 ? 0 : photos.length)}
          >
            {isLoading ? 'Loading…' : loadError ? 'Try again' : 'Load more photos'}
          </button>
        </div>
      )}

      {/* Lightbox */}
      {currentPhoto && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
          <div className="lightbox-backdrop" aria-hidden="true" />
          <button
            type="button"
            className="lightbox-close"
            onClick={closeLightbox}
            aria-label="Close lightbox"
          >
            &times;
          </button>

          <button
            type="button"
            className="lightbox-nav lightbox-prev"
            onClick={e => {
              e.stopPropagation()
              goPrev()
            }}
            aria-label="Previous photo"
          >
            &#8249;
          </button>

          <div className="lightbox-content">
            <img
              key={currentPhoto.id}
              className="lightbox-image"
              src={getImageUrl(currentPhoto, 'full')}
              alt={currentPhoto.caption || 'Photo'}
            />
            <div className="lightbox-info">
              {currentPhoto.caption && <h3>{currentPhoto.caption}</h3>}
              <div className="lightbox-meta">
                {currentPhoto.area && (
                  <span>
                    <span style={{ opacity: 0.6 }}>📍</span> {currentPhoto.area}
                  </span>
                )}
                {currentPhoto.state && currentPhoto.area && <span className="meta-sep">·</span>}
                {currentPhoto.state && (
                  <span>
                    <span style={{ opacity: 0.6 }}>🗺️</span> {currentPhoto.state}
                  </span>
                )}
                {currentPhoto.date && (currentPhoto.area || currentPhoto.state) && (
                  <span className="meta-sep">·</span>
                )}
                {currentPhoto.date && (
                  <span>
                    <span style={{ opacity: 0.6 }}>📅</span> {formatDate(currentPhoto.date)}
                  </span>
                )}
                {currentPhoto.camera && currentPhoto.date && <span className="meta-sep">·</span>}
                {currentPhoto.camera && (
                  <span>
                    <span style={{ opacity: 0.6 }}>📷</span> {currentPhoto.camera}
                  </span>
                )}
              </div>
              <div className="lightbox-counter">
                {String((lightbox?.index ?? 0) + 1).padStart(2, '0')} /{' '}
                {String(lightbox?.photos.length ?? 0).padStart(2, '0')}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="lightbox-nav lightbox-next"
            onClick={e => {
              e.stopPropagation()
              goNext()
            }}
            aria-label="Next photo"
          >
            &#8250;
          </button>
        </div>
      )}

      <style>{`
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(var(--photo-min-width), 1fr));
          gap: var(--photo-gap);
        }

        .photo-grid[data-grid-zoom='2'],
        .photo-grid[data-grid-zoom='3'],
        .photo-grid[data-grid-zoom='4'] {
          display: block;
          columns: var(--photo-min-width);
          column-gap: var(--photo-gap);
        }

        .gallery-tools {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--color-border);
        }

        .gallery-tools input { width: min(420px, 100%); border-radius: 999px; }
        .gallery-tools p { margin: 0; color: var(--color-text-tertiary); font-size: 0.8rem; }

        .gallery-status {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .gallery-zoom {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          margin: 0;
          padding: 0.2rem;
          border: 1px solid var(--color-border);
          border-radius: 999px;
        }

        .gallery-zoom button {
          display: grid;
          place-items: center;
          width: 1.6rem;
          height: 1.6rem;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: var(--color-text-primary);
          font-size: 1.1rem;
          line-height: 1;
        }

        .gallery-zoom button:hover:not(:disabled) { background: var(--color-bg-secondary); }
        .gallery-zoom button:disabled { opacity: 0.3; cursor: not-allowed; }
        .gallery-zoom span { min-width: 1rem; text-align: center; color: var(--color-text-tertiary); font-size: 0.75rem; }

        .photo-item {
          position: relative;
          aspect-ratio: 1;
          grid-column: span 1;
          min-width: 0;
          overflow: hidden;
          border-radius: var(--border-radius-lg);
          cursor: pointer;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          display: block;
          padding: 0;
          color: inherit;
          text-align: left;
          transition: none;
        }

        .photo-item:hover img { filter: brightness(1.06); }

        .photo-grid[data-grid-zoom='3'] .photo-item,
        .photo-grid[data-grid-zoom='4'] .photo-item,
        .photo-grid[data-grid-zoom='2'] .photo-item {
          display: block;
          width: 100%;
          aspect-ratio: auto;
          break-inside: avoid;
          margin-bottom: var(--photo-gap);
        }

        .photo-grid[data-grid-zoom='2'] .photo-item img,
        .photo-grid[data-grid-zoom='3'] .photo-item img,
        .photo-grid[data-grid-zoom='4'] .photo-item img { height: auto; }

        .photo-grid[data-grid-zoom='0'] .photo-item,
        .photo-grid[data-grid-zoom='1'] .photo-item {
          border: 0;
          border-radius: 0;
        }

        .photo-grid[data-grid-zoom='0'] .photo-overlay,
        .photo-grid[data-grid-zoom='1'] .photo-overlay { display: none; }

        .photo-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 1.5rem;
          background: linear-gradient(transparent 25%, rgba(0,0,0,0.88));
          color: white;
          font-size: 0.8rem;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .photo-overlay strong { display: block; font-family: var(--font-serif); font-size: 1.35rem; font-weight: 400; }
        .photo-overlay span { display: block; margin-top: 0.25rem; color: rgba(255,255,255,0.65); }

        .load-more-wrap { display: flex; justify-content: center; padding-top: 3rem; }
        .load-more { border-radius: 999px; padding: 0.8rem 1.5rem; }
        .load-more:disabled { cursor: progress; opacity: 0.7; }
        .gallery-empty { padding: 3rem 0; color: var(--color-text-tertiary); text-align: center; }

        .photo-item:hover .photo-overlay,
        .photo-item:focus-visible .photo-overlay {
          opacity: 1;
        }

        /* Lightbox */
        .lightbox {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          color: white;
          font-size: 2.5rem;
          cursor: pointer;
          padding: 0.5rem;
          line-height: 1;
          z-index: 1001;
        }

        .lightbox-close:hover {
          color: var(--color-accent);
        }

        .lightbox-backdrop {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
        }

        .lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          font-size: 3rem;
          cursor: pointer;
          padding: 1rem 1.5rem;
          z-index: 1001;
          transition: background 0.2s;
        }

        .lightbox-nav:hover {
          background: rgba(255,255,255,0.2);
        }

        .lightbox-prev {
          left: 1rem;
        }

        .lightbox-next {
          right: 1rem;
        }

        .lightbox-content {
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .lightbox-content img {
          max-width: 100%;
          max-height: 75vh;
          object-fit: contain;
        }

        .lightbox-image {
          animation: lightbox-reveal 320ms cubic-bezier(.22,1,.36,1) both;
        }

        @keyframes lightbox-reveal {
          from { opacity: 0; transform: scale(0.985); }
          to { opacity: 1; transform: scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lightbox-image { animation: none; }
        }

        .lightbox-info {
          color: white;
          text-align: center;
          margin-top: 1rem;
          max-width: 600px;
        }

        .lightbox-info h3 {
          margin: 0 0 0.5rem;
          font-size: 1.25rem;
          color: #ffffff;
          font-weight: 500;
          text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        }

        .lightbox-meta {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          align-items: center;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.9);
          flex-wrap: wrap;
          margin-top: 0.5rem;
        }

        .lightbox-meta span {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }

        .lightbox-meta .meta-sep {
          color: rgba(255,255,255,0.4);
          font-weight: 300;
        }

        .lightbox-counter {
          margin-top: 0.75rem;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.5);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          letter-spacing: 0.05em;
        }

        @media (max-width: 768px) {
          .lightbox-nav {
            font-size: 2rem;
            padding: 0.75rem 1rem;
          }

          .lightbox-prev {
            left: 0.5rem;
          }

          .lightbox-next {
            right: 0.5rem;
          }

          .photo-grid { gap: var(--photo-gap); }
          .photo-item,
          .photo-item:first-child { grid-column: span 1; grid-row: span 1; }
          .gallery-tools { align-items: flex-start; flex-direction: column; }
          .gallery-status { width: 100%; justify-content: space-between; }
        }
      `}</style>
    </>
  )
}
