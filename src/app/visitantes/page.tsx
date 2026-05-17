import Link from "next/link";
import { MobileHero } from "@/components/landing/MobileHero";
import { LandingSection } from "@/components/landing/LandingSection";

export default function VisitantesPage() {
  return (
    <>
      <MobileHero />
      <LandingSection
        eyebrow="Portal"
        title="Visitantes"
        subtitle="Entrada publica para explorar acervo, agenda e historias do Museu do Mar."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/acervo" className="btn-secondary w-full justify-center">Explorar o acervo</Link>
          <Link href="/agenda" className="btn-secondary w-full justify-center">Ver agenda</Link>
          <Link href="/turma-do-mangue" className="btn-secondary w-full justify-center">Conhecer a Turma do Mangue</Link>
          <Link href="/participar" className="btn-primary w-full justify-center bg-mar-areia text-mar-escuro hover:bg-mar-areia/90">
            Quero participar
          </Link>
        </div>
      </LandingSection>
    </>
  );
}
