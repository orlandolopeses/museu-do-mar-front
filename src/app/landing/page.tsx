import type { Metadata } from "next";
import LandingPageNew from "@/components/landing-new/LandingPage";

export const metadata: Metadata = {
  title: "Landing do Museu do Mar",
  description: "Nova landing publica do Ponto de Memoria Museu do Mar.",
};

export default function LandingPage() {
  return <LandingPageNew />;
}
