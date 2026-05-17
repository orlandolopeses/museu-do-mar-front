"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { PUBLIC_FORM_STARTED_FIELD_NAME, PUBLIC_HONEYPOT_FIELD_NAME } from "@/lib/public-submission";

export function ContatoForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [formStartedAt, setFormStartedAt] = useState(() => Date.now());

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setStatus("sent");
        form.reset();
        setFormStartedAt(Date.now());
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-mar-verde/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="w-6 h-6 text-mar-verde" />
        </div>
        <h3 className="font-serif font-bold text-mar-escuro mb-2">Mensagem enviada!</h3>
        <p className="text-mar-escuro/60 text-sm">Obrigado. Responderemos em breve.</p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm text-mar-azul hover:underline"
        >
          Enviar outra mensagem
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name={PUBLIC_FORM_STARTED_FIELD_NAME} value={String(formStartedAt)} />
      <div className="hidden" aria-hidden="true">
        <label htmlFor={PUBLIC_HONEYPOT_FIELD_NAME}>Website</label>
        <input id={PUBLIC_HONEYPOT_FIELD_NAME} name={PUBLIC_HONEYPOT_FIELD_NAME} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-mar-escuro mb-1.5" htmlFor="nome">
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            className="w-full rounded-lg border border-mar-areia/50 bg-white px-4 py-2.5 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
            placeholder="Seu nome completo"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-mar-escuro mb-1.5" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-mar-areia/50 bg-white px-4 py-2.5 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
            placeholder="seu@email.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-mar-escuro mb-1.5" htmlFor="assunto">
          Assunto
        </label>
        <input
          id="assunto"
          name="assunto"
          type="text"
          required
          className="w-full rounded-lg border border-mar-areia/50 bg-white px-4 py-2.5 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
          placeholder="Assunto da mensagem"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-mar-escuro mb-1.5" htmlFor="mensagem">
          Mensagem
        </label>
        <textarea
          id="mensagem"
          name="mensagem"
          required
          rows={5}
          className="w-full resize-none rounded-lg border border-mar-areia/50 bg-white px-4 py-2.5 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
          placeholder="Escreva sua mensagem..."
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600">
          Erro ao enviar mensagem. Tente novamente ou envie por e-mail.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
        {status === "sending" ? "Enviando..." : "Enviar Mensagem"}
      </button>
    </form>
  );
}
