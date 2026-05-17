import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  preload: false,
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-serif",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://museudomares.duckdns.org"),
  applicationName: "Museu do Mar",
  title: {
    default: "Museu do Mar | Ponto de Memória",
    template: "%s | Museu do Mar",
  },
  description:
    "Ponto de Memória Museu do Mar — preservando a memória cultural e histórica da Aldeia de Perocão e das comunidades pesqueiras do litoral capixaba.",
  keywords: [
    "Museu do Mar",
    "Perocão",
    "Guarapari",
    "Espírito Santo",
    "patrimônio cultural",
    "memória",
    "pesca artesanal",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://museudomares.duckdns.org",
    siteName: "Museu do Mar",
  },
  twitter: {
    card: "summary_large_image",
    title: "Museu do Mar",
    description:
      "Memória viva das culturas do mar a partir da Aldeia de Perocão, em Guarapari/ES.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${merriweather.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
