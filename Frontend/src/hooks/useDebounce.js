import { useState, useEffect } from 'react'

/**
 * Debounce a value — returns the debounced copy after `delay` ms of inactivity.
 * @param {*} value
 * @param {number} [delay=300]
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
