"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";

const aboutLinks = [
  { href: "/sobre", label: "Sobre o Projeto" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/imprensa", label: "Imprensa" },
];

const acervoLinks = [
  { href: "/acervo", label: "Acervo Digital" },
  { href: "/acervo/laboratorio", label: "Laboratório", isHeader: true },
  { href: "/participar/gincanas/perocao", label: "Tesouros de Perocão", isSubItem: true },
  { href: "/participar/gincanas/anchieta", label: "O Enigma de Rerigtiba", isSubItem: true },
  { href: "/participar/gincanas/piuma", label: "O Mistério das Conchas", isSubItem: true },
];

const navLinks = [
  { href: "/acervo", label: "Acervo" },
  { href: "/agenda", label: "Agenda" },
  { href: "/blog", label: "Blog" },
  { href: "/forum", label: "Fórum" },
  { href: "/memoria", label: "Contribuir" },
  { href: "/busca", label: "Buscar" },
  { href: "/contato", label: "Contato" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-mar-areia/10 bg-mar-escuro/95 text-white shadow-md backdrop-blur">
      <div className="h-1 w-full bg-gradient-to-r from-mar-cobre via-mar-areia to-mar-azul_claro" />
      <div className="container-site">
        <div className="flex min-h-[4.75rem] items-center justify-between gap-4 py-3">
          <BrandMark withLink compact className="max-w-[15rem]" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <div className="group relative">
              <Link
                href="/sobre"
                className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-white/78 transition-colors hover:bg-white/5 hover:text-mar-areia"
              >
                <span>Sobre</span>
                <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
              </Link>

              <div className="invisible absolute left-0 top-full z-20 mt-2 w-56 translate-y-1 rounded-2xl border border-mar-areia/15 bg-mar-escuro/98 p-2 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                {aboutLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-mar-areia"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {navLinks.map((link) => {
              if (link.href === "/acervo") {
                return (
                  <div key={link.href} className="group relative">
                    <Link
                      href={link.href}
                      className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-white/78 transition-colors hover:bg-white/5 hover:text-mar-areia"
                    >
                      <span>{link.label}</span>
                      <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
                    </Link>

                    <div className="invisible absolute left-0 top-full z-20 mt-2 w-72 translate-y-1 rounded-2xl border border-mar-areia/15 bg-mar-escuro/98 p-2 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                      {acervoLinks.map((acervoLink) => (
                        <Link
                          key={acervoLink.href}
                          href={acervoLink.href}
                          className={`block rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 hover:text-mar-areia ${
                            "isHeader" in acervoLink ? "mt-2 border-t border-white/5 pt-3 text-mar-cobre uppercase tracking-widest text-[10px]" : 
                            "isSubItem" in acervoLink ? "pl-6 text-white/60 text-xs" : "text-white/80"
                          }`}
                        >
                          {acervoLink.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-white/78 transition-colors hover:bg-white/5 hover:text-mar-areia"
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile toggle */}
          <button
            className="rounded-md p-2 hover:bg-white/10 md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-mar-escuro">
          <div className="container-site flex flex-col gap-1 py-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <Link
                href="/sobre"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-mar-areia"
              >
                Sobre
              </Link>

              <div className="mt-1 border-l border-white/10 pl-3">
                {aboutLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-mar-areia"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <Link
                href="/acervo"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-mar-areia"
              >
                Acervo
              </Link>

              <div className="mt-1 border-l border-white/10 pl-3">
                {acervoLinks.map((acervoLink) => (
                  <Link
                    key={acervoLink.href}
                    href={acervoLink.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10 hover:text-mar-areia ${
                      "isHeader" in acervoLink ? "mt-3 border-t border-white/5 pt-3 text-mar-cobre uppercase tracking-widest text-[10px]" : 
                      "isSubItem" in acervoLink ? "pl-6 text-white/50 text-xs" : "text-white/70"
                    }`}
                  >
                    {acervoLink.label}
                  </Link>
                ))}
              </div>
            </div>

            {navLinks
              .filter((link) => link.href !== "/acervo")
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-mar-areia"
                >
                  {link.label}
                </Link>
              ))}
          </div>
        </div>
      )}
    </header>
  );
}
