import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { formatCalendarDate } from '../lib/dates'

export interface LightboxPhoto {
  id: string
  src: string
  alt: string
  title?: string | null
  caption?: string | null
  area?: string | null
  state?: string | null
  date?: string | null
  camera?: string | null
  width?: number | null
  height?: number | null
}

// Used to size the frame when a photo has no stored dimensions.
const FALLBACK_RATIO = 3 / 2

function knownRatio(photo: LightboxPhoto) {
  return photo.width && photo.height ? photo.width / photo.height : null
}

type LoadState = 'loading' | 'loaded' | 'error'

// The frame is sized from the photo's aspect ratio before the image arrives,
// so a slow or failed load holds the final footprint instead of collapsing
// around the alt text and then jumping to full size.
function LightboxFrame({ photo }: { photo: LightboxPhoto }) {
  const [state, setState] = useState<LoadState>('loading')
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const ratio = naturalRatio ?? knownRatio(photo) ?? FALLBACK_RATIO

  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    const image = imageRef.current
    if (image?.complete && image.naturalWidth) {
      setNaturalRatio(image.naturalWidth / image.naturalHeight)
      setState('loaded')
    }
  }, [])

  return (
    <div
      className="lightbox-frame"
      data-state={state}
      style={{ '--lightbox-ratio': ratio } as CSSProperties}
    >
      {state === 'error' ? (
        <p className="lightbox-unavailable" role="img" aria-label={photo.alt}>
          Photo unavailable
        </p>
      ) : (
        <img
          ref={imageRef}
          className="lightbox-image"
          src={photo.src}
          alt={photo.alt}
          onLoad={event => {
            const image = event.currentTarget
            if (image.naturalWidth) setNaturalRatio(image.naturalWidth / image.naturalHeight)
            setState('loaded')
          }}
          onError={() => setState('error')}
        />
      )}
      {photo.title && <p className="lightbox-title">{photo.title}</p>}
    </div>
  )
}

const META_ICONS = { area: '📍', state: '🗺️', date: '📅', camera: '📷' } as const

function metaParts(photo: LightboxPhoto) {
  const date = photo.date
    ? formatCalendarDate(photo.date, { month: 'long', day: 'numeric', year: 'numeric' })
    : null
  return (
    [
      ['area', photo.area],
      ['state', photo.state],
      ['date', date],
      ['camera', photo.camera],
    ] as const
  ).filter((part): part is readonly [keyof typeof META_ICONS, string] => Boolean(part[1]))
}

const pad = (value: number) => String(value).padStart(2, '0')

const WHEEL_STEP_DISTANCE = 50
const WHEEL_GESTURE_GAP_MS = 180

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
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

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

  // Wheel and two-finger trackpad swipes step one photo per gesture. A gesture
  // ends after a short pause, so trackpad momentum can't skip several photos.
  const wheelGesture = useRef({ distance: 0, stepped: false, timer: 0 })
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const gesture = wheelGesture.current
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (photos.length < 2) return
      window.clearTimeout(gesture.timer)
      gesture.timer = window.setTimeout(() => {
        gesture.distance = 0
        gesture.stepped = false
      }, WHEEL_GESTURE_GAP_MS)
      if (gesture.stepped) return

      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      gesture.distance += delta * unit
      if (Math.abs(gesture.distance) < WHEEL_STEP_DISTANCE) return

      const direction = gesture.distance > 0 ? 1 : -1
      onIndexChange((index + direction + photos.length) % photos.length)
      gesture.distance = 0
      gesture.stepped = true
    }
    dialog.addEventListener('wheel', handleWheel, { passive: false })
    return () => dialog.removeEventListener('wheel', handleWheel)
  }, [index, onIndexChange, photos.length])

  useEffect(() => () => window.clearTimeout(wheelGesture.current.timer), [])

  useEffect(() => {
    const count = photos.length
    if (count < 2) return
    for (const neighbor of [photos[(index - 1 + count) % count], photos[(index + 1) % count]]) {
      const image = new Image()
      image.src = neighbor.src
    }
  }, [index, photos])

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
        <LightboxFrame key={photo.id} photo={photo} />
        <div className="lightbox-info">
          {photo.caption && photo.caption !== photo.title && <h3>{photo.caption}</h3>}
          <div className="lightbox-meta">
            {/* The icons mark each part, so wrapped lines never start with a stray separator. */}
            {metaParts(photo).map(([kind, value]) => (
              <span key={kind} className="meta-part">
                <span className="meta-icon" aria-hidden="true">
                  {META_ICONS[kind]}
                </span>{' '}
                {value}
              </span>
            ))}
          </div>
          <div className="lightbox-counter">
            {pad(index + 1)} / {pad(photos.length)}
          </div>
        </div>
      </div>
      <style>{LIGHTBOX_CSS}</style>
    </div>
  )
}

// Scoped under .lightbox so the global button and hover rules can't repaint the
// backdrop or controls.
const LIGHTBOX_CSS = `
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    background: rgba(0, 0, 0, 0.95);
    overscroll-behavior: contain;
  }

  .lightbox .lightbox-backdrop,
  .lightbox .lightbox-backdrop:hover {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    background: transparent;
    border: 0;
    border-radius: 0;
    cursor: zoom-out;
  }

  .lightbox .lightbox-close,
  .lightbox .lightbox-nav {
    position: absolute;
    z-index: 1001;
    min-width: 44px;
    min-height: 44px;
    color: white;
    border: 0;
    line-height: 1;
    transition: background-color 150ms ease, color 150ms ease;
  }

  .lightbox .lightbox-close {
    top: calc(env(safe-area-inset-top) + 0.75rem);
    right: calc(env(safe-area-inset-right) + 0.75rem);
    padding: 0.5rem;
    font-size: 2.5rem;
    background: none;
  }

  .lightbox .lightbox-nav {
    top: 50%;
    padding: 1rem 1.5rem;
    font-size: 3rem;
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-50%);
  }

  .lightbox .lightbox-prev { left: calc(env(safe-area-inset-left) + 1rem); }
  .lightbox .lightbox-next { right: calc(env(safe-area-inset-right) + 1rem); }

  @media (hover: hover) and (pointer: fine) {
    .lightbox .lightbox-close:hover { color: var(--tab); background: none; }
    .lightbox .lightbox-nav:hover { background: rgba(255, 255, 255, 0.2); }
  }

  .lightbox .lightbox-nav:active { background: rgba(255, 255, 255, 0.25); }

  .lightbox-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 90vw;
    max-height: 90vh;
  }

  .lightbox-frame {
    --lightbox-max-width: 90vw;
    --lightbox-max-height: 75vh;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: min(var(--lightbox-max-width), var(--lightbox-max-height) * var(--lightbox-ratio));
    aspect-ratio: var(--lightbox-ratio);
    overflow: hidden;
    background: rgba(255, 255, 255, 0.04);
    animation: lightbox-reveal 320ms cubic-bezier(0.23, 1, 0.32, 1) both;
  }

  .lightbox-frame[data-state='loading'] {
    animation:
      lightbox-reveal 320ms cubic-bezier(0.23, 1, 0.32, 1) both,
      lightbox-pending 1.6s ease-in-out 400ms infinite;
  }

  .lightbox-frame[data-state='loaded'] { background: none; }

  .lightbox-frame .lightbox-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    opacity: 0;
    transition: opacity 200ms ease;
  }

  .lightbox-frame[data-state='loaded'] .lightbox-image { opacity: 1; }

  .lightbox-unavailable {
    margin: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.8rem;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.55);
  }

  @keyframes lightbox-pending {
    50% { background-color: rgba(255, 255, 255, 0.08); }
  }

  /* Sits on the photo itself, so a scrim keeps it legible over bright skies and snow. */
  .lightbox-title {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    margin: 0;
    padding: 3rem 1.25rem 1rem;
    font-family: var(--font-serif);
    font-size: clamp(1rem, 0.85rem + 0.8vw, 1.5rem);
    font-style: italic;
    font-weight: 400;
    line-height: 1.25;
    color: #fff;
    text-align: left;
    text-wrap: balance;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    background: linear-gradient(to top, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.25) 55%, transparent);
    pointer-events: none;
  }

  @keyframes lightbox-reveal {
    from { opacity: 0; transform: scale(0.985); }
    to { opacity: 1; transform: scale(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .lightbox-frame,
    .lightbox-frame[data-state='loading'] { animation: none; }
    .lightbox-frame .lightbox-image { transition: none; }
  }

  .lightbox-info {
    max-width: 600px;
    margin-top: 1rem;
    color: white;
    text-align: center;
  }

  .lightbox-info h3 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    font-weight: 500;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  .lightbox-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.25rem 1.25rem;
    margin-top: 0.5rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.9);
  }

  .lightbox-meta .meta-part {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .lightbox-meta .meta-icon { opacity: 0.6; }

  .lightbox-counter {
    margin-top: 0.75rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 768px) {
    .lightbox .lightbox-nav { padding: 0.75rem 1rem; font-size: 2rem; }
    .lightbox .lightbox-prev { left: calc(env(safe-area-inset-left) + 0.5rem); }
    .lightbox .lightbox-next { right: calc(env(safe-area-inset-right) + 0.5rem); }
    .lightbox-content { max-width: calc(100vw - 5rem); }
    .lightbox-frame { --lightbox-max-width: calc(100vw - 5rem); }
    .lightbox-title { padding: 2.25rem 0.75rem 0.65rem; }
  }
`
