import { useState, useCallback, useEffect } from 'react'
import { formatCalendarDate, parseCalendarDate } from '../lib/dates'
import { getCanonicalPhotos } from '../lib/photos-client'

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
  apiOrigin?: string
}

export default function PhotoGallery({ photos: initialPhotos, apiOrigin }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [isLoading, setIsLoading] = useState(initialPhotos.length === 0 && Boolean(apiOrigin))
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [filter, setFilter] = useState('')
  const [visibleCount, setVisibleCount] = useState(60)

  useEffect(() => {
    if (initialPhotos.length > 0 || !apiOrigin) return

    let active = true
    getCanonicalPhotos(apiOrigin, { limit: 500, ttlMs: 0 })
      .then(canonicalPhotos => {
        if (active) setPhotos(canonicalPhotos)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [apiOrigin, initialPhotos.length])

  const filteredPhotos = filter
    ? photos.filter(p => {
        const query = filter.toLowerCase().trim()
        if (!query) return true

        // Search caption and location
        const captionMatch = p.caption?.toLowerCase().includes(query)
        const areaMatch = p.area?.toLowerCase().includes(query)
        const stateMatch = p.state?.toLowerCase().includes(query)

        // Search tags
        const tagsMatch = p.tags?.toLowerCase().includes(query)

        // Search year (e.g., "2023")
        const yearMatch = p.date?.startsWith(query)

        // Search month name (e.g., "january", "march")
        const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december']
        const monthIndex = monthNames.findIndex(m => m.startsWith(query))
        const monthMatch = monthIndex >= 0 && p.date
          ? parseCalendarDate(p.date).getMonth() === monthIndex
          : false

        return captionMatch || areaMatch || stateMatch || tagsMatch || yearMatch || monthMatch
      })
    : photos

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)

  const goNext = useCallback(() => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % filteredPhotos.length)
    }
  }, [lightboxIndex, filteredPhotos.length])

  const goPrev = useCallback(() => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + filteredPhotos.length) % filteredPhotos.length)
    }
  }, [lightboxIndex, filteredPhotos.length])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return

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
  }, [lightboxIndex, goNext, goPrev])

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [lightboxIndex])

  useEffect(() => {
    if (lightboxIndex === null || filteredPhotos.length < 2) return

    const adjacent = [
      filteredPhotos[(lightboxIndex - 1 + filteredPhotos.length) % filteredPhotos.length],
      filteredPhotos[(lightboxIndex + 1) % filteredPhotos.length],
    ]
    adjacent.forEach(photo => {
      const image = new Image()
      image.src = getImageUrl(photo, 'full')
    })
  }, [lightboxIndex, filteredPhotos])

  const currentPhoto = lightboxIndex !== null ? filteredPhotos[lightboxIndex] : null
  const visiblePhotos = filteredPhotos.slice(0, visibleCount)

  useEffect(() => setVisibleCount(60), [filter])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return formatCalendarDate(dateStr, { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Determine if photo is tall (original design reference)
  const isTall = (photo: Photo) => {
    if (!photo.width || !photo.height) return false
    return photo.height / photo.width > 1.208
  }

  // Get best available image URL via photos-api
  const getImageUrl = (photo: Photo, size: 'thumb' | 'full' = 'thumb') => {
    const id = photo.short_id || photo.id
    if (size === 'thumb') {
      return `/img/${id}?w=800`
    }
    return `/img/${id}`
  }

  return (
    <>
      {/* Search */}
      <div className="gallery-tools">
        <input
          type="text"
          placeholder="Search by caption, location, year, month, or tags..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <p aria-live="polite">
          {isLoading
            ? 'Loading photos…'
            : `Showing ${Math.min(visibleCount, filteredPhotos.length)} of ${filteredPhotos.length} photos`}
        </p>
      </div>

      {/* Gallery Grid */}
      <div className="photo-grid">
        {visiblePhotos.map((photo, index) => (
          <div
            key={photo.id}
            className={`photo-item ${isTall(photo) ? 'photo-item-tall' : ''}`}
            onClick={() => openLightbox(index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && openLightbox(index)}
            style={photo.accent_color ? { backgroundColor: photo.accent_color } : undefined}
          >
            <img
              src={getImageUrl(photo, 'thumb')}
              alt={photo.caption || photo.title || 'Photo'}
              loading="lazy"
              onError={(e) => {
                // If image fails to load, hide it to show the background/accent color
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            {(photo.caption || photo.title) && (
              <div className="photo-overlay">
                <strong>{photo.title || photo.caption}</strong>
                {photo.area && <span>{photo.area}{photo.state && `, ${photo.state}`}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {visibleCount < filteredPhotos.length && (
        <div className="load-more-wrap">
          <button className="load-more" onClick={() => setVisibleCount(count => count + 60)}>
            Load more photos
          </button>
        </div>
      )}

      {/* Lightbox */}
      {currentPhoto && (
        <div className="lightbox" onClick={closeLightbox}>
          <button
            className="lightbox-close"
            onClick={closeLightbox}
            aria-label="Close lightbox"
          >
            &times;
          </button>

          <button
            className="lightbox-nav lightbox-prev"
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            aria-label="Previous photo"
          >
            &#8249;
          </button>

          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
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
                {currentPhoto.date && (currentPhoto.area || currentPhoto.state) && <span className="meta-sep">·</span>}
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
                {String(lightboxIndex! + 1).padStart(2, '0')} / {String(filteredPhotos.length).padStart(2, '0')}
              </div>
            </div>
          </div>

          <button
            className="lightbox-nav lightbox-next"
            onClick={(e) => { e.stopPropagation(); goNext() }}
            aria-label="Next photo"
          >
            &#8250;
          </button>
        </div>
      )}

      <style>{`
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.25rem;
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

        .photo-item {
          position: relative;
          aspect-ratio: 4 / 3;
          grid-column: span 1;
          min-width: 0;
          overflow: hidden;
          border-radius: var(--border-radius-lg);
          cursor: pointer;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          transition: transform 0.4s cubic-bezier(.22,1,.36,1), border-color 0.3s ease;
        }

        .photo-item:hover { transform: translateY(-4px); border-color: var(--color-border-hover); }

        .photo-item-tall {
          aspect-ratio: 3 / 4;
          grid-row: span 2;
        }

        .photo-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.7s cubic-bezier(.22,1,.36,1);
        }

        .photo-item:hover img {
          transform: scale(1.05);
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

        .photo-item:hover .photo-overlay {
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

          .photo-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }
          .photo-item,
          .photo-item:first-child { grid-column: span 1; grid-row: span 1; }
          .photo-item-tall { grid-row: span 2; }
          .gallery-tools { align-items: flex-start; flex-direction: column; }
        }
      `}</style>
    </>
  )
}
