import { useEffect, useRef } from 'react'
import { formatCalendarDate } from '../lib/dates'

export interface LightboxPhoto {
  id: string
  src: string
  alt: string
  title?: string | null
  area?: string | null
  state?: string | null
  date?: string | null
  camera?: string | null
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  opener?: HTMLElement | null
}

export default function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  opener,
}: PhotoLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const touchStartX = useRef<number | null>(null)
  const photo = photos[index]

  useEffect(() => {
    closeRef.current?.focus()
    return () => opener?.focus()
  }, [opener])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowRight' && photos.length > 1) {
        event.preventDefault()
        onIndexChange((index + 1) % photos.length)
      } else if (event.key === 'ArrowLeft' && photos.length > 1) {
        event.preventDefault()
        onIndexChange((index - 1 + photos.length) % photos.length)
      } else if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button')
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [index, onClose, onIndexChange, photos.length])

  if (!photo) return null

  const move = (direction: -1 | 1) => {
    onIndexChange((index + direction + photos.length) % photos.length)
  }

  return (
    <div
      className="lightbox"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onTouchStart={event => {
        touchStartX.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={event => {
        if (touchStartX.current === null || photos.length < 2) return
        const distance = event.changedTouches[0]?.clientX - touchStartX.current
        if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1)
        touchStartX.current = null
      }}
    >
      <button
        type="button"
        className="lightbox-backdrop"
        onClick={onClose}
        aria-label="Close photo viewer"
      />
      <button
        type="button"
        ref={closeRef}
        className="lightbox-close"
        onClick={onClose}
        aria-label="Close photo viewer"
      >
        &times;
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="lightbox-nav lightbox-prev"
            onClick={() => move(-1)}
            aria-label="Previous photo"
          >
            &#8249;
          </button>
          <button
            type="button"
            className="lightbox-nav lightbox-next"
            onClick={() => move(1)}
            aria-label="Next photo"
          >
            &#8250;
          </button>
        </>
      )}

      <div className="lightbox-content">
        <img key={photo.id} className="lightbox-image" src={photo.src} alt={photo.alt} />
        <div className="lightbox-info">
          {(photo.title || photo.alt) && <h3>{photo.title || photo.alt}</h3>}
          <div className="lightbox-meta">
            {photo.area && (
              <span>
                {photo.area}
                {photo.state && `, ${photo.state}`}
              </span>
            )}
            {photo.date && (
              <span>
                {formatCalendarDate(photo.date, { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {photo.camera && <span>{photo.camera}</span>}
          </div>
          {photos.length > 1 && (
            <div className="lightbox-counter">
              {index + 1} / {photos.length}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
