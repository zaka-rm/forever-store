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
      decoding="async"
      draggable={false}
      className={`h-full w-full object-cover ${className}`}
    />
  )
}
