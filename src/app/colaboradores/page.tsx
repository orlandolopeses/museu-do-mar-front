import Link from "next/link";
import { LandingSection } from "@/components/landing/LandingSection";

export default function ColaboradoresPage() {
  return (
    <LandingSection
      eyebrow="Portal"
      title="Colaboradores"
      subtitle="Bastidores do Museu do Mar: comunicacao, producao, registro e tecnologia."
    >
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-mar-escuro/70">
          Se voce quer colaborar, comece escolhendo um perfil de participacao e a equipe te encaminha para uma frente.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/participar?portal=colaboradores" className="btn-primary w-full justify-center bg-mar-areia text-mar-escuro hover:bg-mar-areia/90">
            Ver perfis e trilhas
          </Link>
          <Link href="/" className="btn-secondary w-full justify-center">Voltar para a Home</Link>
        </div>
      </div>
    </LandingSection>
  );
}
