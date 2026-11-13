import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getCollectionPage } from '../lib/photos-client'
import PhotoLightbox, { type LightboxPhoto } from './PhotoLightbox'

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
  return size === 'thumb' ? `/img/${id}?w=800` : `/img/${id}`
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
  const [lightboxOpener, setLightboxOpener] = useState<HTMLElement | null>(null)
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
      } catch (_error) {
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

  const openLightbox = (index: number, opener: HTMLElement) => {
    setLightbox({ photos: filteredPhotos, index })
    setLightboxOpener(opener)
  }

  // Deep links such as /photos?photo=<id> (used by the homepage frames) open that photo once it is on the page.
  const deepLinkHandled = useRef(false)
  useEffect(() => {
    if (deepLinkHandled.current || photos.length === 0) return
    const target = new URLSearchParams(window.location.search).get('photo')
    deepLinkHandled.current = true
    if (!target) return
    const index = photos.findIndex(photo => photo.id === target)
    const opener = gridRef.current?.querySelector<HTMLElement>(
      `[data-photo-id="${CSS.escape(target)}"]`,
    )
    if (index < 0 || !opener) return
    opener.scrollIntoView({ block: 'center' })
    setLightbox({ photos, index })
    setLightboxOpener(opener)
  }, [photos])

  const closeLightbox = useCallback(() => {
    setLightbox(null)
    setLightboxOpener(null)
  }, [])

  const lightboxSourcePhotos = lightbox?.photos
  const lightboxPhotos = useMemo(
    () =>
      (lightboxSourcePhotos ?? []).map<LightboxPhoto>(photo => ({
        id: photo.id,
        src: getImageUrl(photo, 'full'),
        alt: photo.caption || 'Photo',
        caption: photo.caption,
        area: photo.area,
        state: photo.state,
        date: photo.date,
        camera: photo.camera,
      })),
    [lightboxSourcePhotos],
  )

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
        {filter && (
          <button type="button" className="clear-search" onClick={() => setFilter('')}>
            Clear search
          </button>
        )}
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
            <span aria-live="polite">{gridZoom + 1}</span>
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
            onClick={event => openLightbox(index, event.currentTarget)}
            aria-label={`View photo: ${photo.caption || photo.title || 'Mountain photo'}`}
            style={photo.accent_color ? { backgroundColor: photo.accent_color } : undefined}
          >
            <img
              src={getImageUrl(photo, 'thumb')}
              alt={[
                photo.caption || photo.title,
                [photo.area, photo.state].filter(Boolean).join(', '),
              ]
                .filter(Boolean)
                .join(', ')}
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
            onClick={() =>
              fetchPage(activeQuery, loadError && photos.length === 0 ? 0 : photos.length)
            }
          >
            {isLoading ? 'Loading…' : loadError ? 'Try again' : 'Load more photos'}
          </button>
        </div>
      )}

      {lightbox && (
        <PhotoLightbox
          photos={lightboxPhotos}
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
        .clear-search { min-height: 40px; padding-inline: 0.75rem; font-size: 0.875rem; }
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

        .photo-item:focus-visible .photo-overlay {
          opacity: 1;
        }

        @media (hover: hover) and (pointer: fine) {
          .photo-item:hover img { filter: brightness(1.06); }
          .photo-item:hover .photo-overlay { opacity: 1; }
        }

        @media (max-width: 768px) {
          .photo-grid { gap: var(--photo-gap); }
          .photo-item,
          .photo-item:first-child { grid-column: span 1; grid-row: span 1; }
          .gallery-tools { align-items: flex-start; flex-direction: column; }
          .gallery-status { width: 100%; justify-content: space-between; }
        }
      `,
        }}
      />
    </>
  )
}
