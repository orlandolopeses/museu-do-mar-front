import Link from "next/link";

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
  withLink?: boolean;
  tone?: "light" | "dark";
};

function BrandSignature({ compact = false, className = "", tone = "light" }: Omit<BrandMarkProps, "withLink">) {
  const isLight = tone === "light";

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div
        className={[
          "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border",
          isLight ? "border-mar-areia/40 bg-white/5" : "border-mar-areia/35 bg-mar-creme/80",
        ].join(" ")}
      >
        <svg
          viewBox="0 0 64 64"
          aria-hidden="true"
          className={["h-8 w-8", isLight ? "text-mar-areia" : "text-mar-cobre"].join(" ")}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="2.2" opacity="0.18" />
          <path d="M13 39C18 35.5 22.5 34 27 34C32 34 36 36.5 40.5 36.5C45 36.5 49 34.5 53 32" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M13 46C18.5 42.7 23 41.5 27.4 41.5C31.8 41.5 35.6 43.6 40 43.6C44.3 43.6 48.2 41.8 52.5 39.8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity="0.82" />
          <path d="M18 27.5C22 25.2 25.2 24.2 28.5 24.2C32 24.2 34.7 25.6 37.9 25.6C41 25.6 44 24.4 47.2 22.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.72" />
          <path d="M32 15V28" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.76" />
          <circle cx="32" cy="13.5" r="2.8" fill="currentColor" opacity="0.92" />
        </svg>
      </div>

      <div className="min-w-0">
        <div className={["font-serif text-lg font-bold leading-none sm:text-xl", isLight ? "text-white" : "text-mar-escuro"].join(" ")}>
          Museu do Mar
        </div>
        {!compact && (
          <div
            className={[
              "mt-1 text-[0.68rem] uppercase tracking-[0.24em] sm:text-[0.72rem]",
              isLight ? "text-mar-areia/90" : "text-mar-cobre/90",
            ].join(" ")}
          >
            Memória viva das culturas do mar
          </div>
        )}
      </div>
    </div>
  );
}

export function BrandMark({ compact = false, className = "", withLink = false, tone = "light" }: BrandMarkProps) {
  if (withLink) {
    return (
      <Link href="/" className="group block" aria-label="Ir para a página inicial do Museu do Mar">
        <BrandSignature
          compact={compact}
          tone={tone}
          className={`${className} transition-opacity group-hover:opacity-90`.trim()}
        />
      </Link>
    );
  }

  return <BrandSignature compact={compact} className={className} tone={tone} />;
}