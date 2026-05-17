type RemoteImageProps = {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

export function RemoteImage({ src, alt, className, loading = "lazy" }: RemoteImageProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading={loading} />;
}