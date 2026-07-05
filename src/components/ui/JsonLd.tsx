import { useEffect } from 'react'

/**
 * Injects a <script type="application/ld+json"> structured-data block into the
 * document head so search engines (Google) can show rich results — e.g. a
 * product's price and star rating directly in search listings.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data)
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = json
    document.head.appendChild(script)
    return () => {
      document.head.removeChild(script)
    }
  }, [json])
  return null
}
