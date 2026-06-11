import React, { useEffect, useState } from 'react'

export default function AIStreamText({ text, isStreaming, speed = 25 }) {
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text)
      return
    }

    // Split text into small chunks/tokens to simulate high-fidelity SSE stream
    setDisplayedText('')
    const tokens = text.split(/(\s+)/)
    let index = 0
    
    const interval = setInterval(() => {
      if (index < tokens.length) {
        setDisplayedText((prev) => prev + tokens[index])
        index++
      } else {
        clearInterval(interval)
      }
    }, speed)

    return () => clearInterval(interval)
  }, [text, isStreaming, speed])

  return (
    <div className="relative font-serif text-[13.5px] sm:text-[14.5px] leading-relaxed text-[var(--text)] whitespace-pre-wrap select-text">
      {displayedText}
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-[var(--accent)] animate-pulse align-middle" />
      )}
    </div>
  )
}