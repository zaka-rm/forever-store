interface ProductImageProps {
  src: string
  alt: string
  className?: string
  eager?: boolean
}

export function ProductImage({ src, alt, className = '', eager = false }: ProductImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      // The hero image is the LCP element — tell the browser to fetch it first.
      // Lowercase attribute so React 18 passes it straight through to the DOM.
      {...(eager ? { fetchpriority: 'high' } : {})}
      decoding="async"
      draggable={false}
      className={`h-full w-full object-cover ${className}`}
    />
  )
}
