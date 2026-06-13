/**
 * useSSE — generic Server-Sent Events hook.
 *
 * Opens an EventSource on `url` and calls `onMessage` for each event.
 * Automatically closes the connection on unmount or when `url` changes.
 *
 * @param {string|null} url         — SSE endpoint URL (null = disabled)
 * @param {(data: any) => void} onMessage  — called with parsed JSON data per event
 * @param {(err: Event) => void} [onError] — called on connection error
 */

import { useEffect, useRef } from 'react'

export function useSSE(url, onMessage, onError) {
  const esRef = useRef(null)

  useEffect(() => {
    if (!url) return

    const es = new EventSource(url)
    esRef.current = es

    es.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data)
        onMessage(parsed)
      } catch {
        onMessage(evt.data)
      }
    }

    es.onerror = (err) => {
      if (onError) onError(err)
      es.close()
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Manually close the stream */
  function close() {
    esRef.current?.close()
    esRef.current = null
  }

  return { close }
}
