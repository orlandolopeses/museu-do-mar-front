import type { ReactNode } from "react";

export function LandingSection({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: {
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={className ?? "py-10 md:py-14"}>
      <div className="container-site">
        <div className="rounded-3xl border border-mar-areia/35 bg-white/90 p-5 shadow-[0_18px_40px_rgba(6,35,63,0.08)] md:p-8">
          {eyebrow ? (
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-mar-cobre">{eyebrow}</div>
          ) : null}
          <h2 className="font-serif text-2xl font-bold text-mar-escuro md:text-3xl">{title}</h2>
          {subtitle ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-mar-escuro/70 md:text-base">{subtitle}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </section>
  );
}
