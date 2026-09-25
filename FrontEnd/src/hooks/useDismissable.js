import { useEffect, useRef } from 'react'

/** Calls `onClose` when Escape is pressed, while `open` is true. */
export function useEscapeKey(open, onClose) {
  useEffect(() => {
    if (!open) return undefined
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])
}

/** Prevents the page behind a modal or drawer from scrolling. */
export function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [locked])
}

/** Calls `onClose` on a click outside the returned ref. */
export function useClickOutside(open, onClose) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) onClose?.()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])
  return ref
}

/**
 * Keeps Tab focus inside an open overlay and restores focus to whatever was
 * focused before it opened. Enough for a prototype — not a full focus trap.
 */
export function useFocusTrap(open) {
  const containerRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    previousFocus.current = document.activeElement

    const node = containerRef.current
    const focusables = () =>
      Array.from(
        node?.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => element.offsetParent !== null)

    // Focus the first sensible element once the overlay is on screen.
    const timer = window.setTimeout(() => {
      const items = focusables()
      const firstInput = items.find((item) => item.tagName !== 'BUTTON')
      ;(firstInput ?? items[0])?.focus()
    }, 30)

    function handleKeyDown(event) {
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    node?.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(timer)
      node?.removeEventListener('keydown', handleKeyDown)
      previousFocus.current?.focus?.()
    }
  }, [open])

  return containerRef
}
