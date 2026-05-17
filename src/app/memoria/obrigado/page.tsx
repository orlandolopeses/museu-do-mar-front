import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Memória enviada | Museu do Mar" };

export default function MemoriaObrigadoPage() {
  return (
    <div className="container-site flex min-h-[60vh] items-center justify-center py-20 px-4">
      <div className="mx-auto max-w-xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mar-verde/10">
            <CheckCircle2 className="h-8 w-8 text-mar-verde" />
          </div>
        </div>
        <h1 className="font-serif text-3xl font-bold text-mar-escuro">Memória recebida!</h1>
        <p className="mt-4 leading-relaxed text-mar-escuro/65">
          Obrigado pela contribuição. Nossa equipe vai revisar sua memória e, se aprovada, ela poderá integrar o acervo digital do Museu do Mar.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/acervo" className="btn-primary">
            Ver acervo <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/memoria" className="btn-secondary">
            Enviar outra memória
          </Link>
        </div>
      </div>
    </div>
  );
}
