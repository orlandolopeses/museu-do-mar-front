"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Chrome, Compass, Eye, EyeOff } from "lucide-react";

type LoginFormProps = {
  googleEnabled?: boolean;
  portal?: string | null;
};

export function LoginForm({ googleEnabled = false, portal = null }: LoginFormProps) {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const portalContext = {
    implementacao: {
      label: "Trilha da implementacao",
      helper: "Organize o bastidor e coordene as frentes que colocam a gincana em movimento.",
    },
    participantes: {
      label: "Trilha dos participantes",
      helper: "Entre na jornada de desafios, missoes e descobertas com a turma do mangue.",
    },
    apoiadores: {
      label: "Trilha dos apoiadores",
      helper: "Acompanhe impacto, fortalezca a rede local e sustente a memoria coletiva.",
    },
  } as const;
  const contextualPortal = portal ? portalContext[portal as keyof typeof portalContext] : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("E-mail ou senha incorretos.");
    } else {
      const nextPath = portal ? `/app?portal=${portal}` : "/app";
      router.push(nextPath);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    const callbackUrl = portal ? `/app?portal=${portal}` : "/app";
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="space-y-4">
      {contextualPortal && (
        <div data-portal={portal ?? "participantes"} className="login-portal-card rounded-xl border border-mar-areia/40 bg-mar-creme/60 p-3 text-mar-escuro/70">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-mar-cobre">
            <Compass className="h-3.5 w-3.5" />
            {contextualPortal.label}
          </div>
          <p className="text-xs leading-relaxed">{contextualPortal.helper}</p>
        </div>
      )}

      {googleEnabled && (
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-mar-areia/40 bg-white px-4 py-2.5 text-sm font-medium text-mar-escuro transition-colors hover:bg-mar-creme disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Chrome className="h-4 w-4" />
          {googleLoading ? "Redirecionando..." : "Entrar com Google"}
        </button>
      )}

      {googleEnabled && (
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-mar-areia/25" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs uppercase tracking-[0.18em] text-mar-escuro/35">ou</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-mar-escuro mb-1.5" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-mar-escuro mb-1.5" htmlFor="password">
            Senha
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPwd ? "text" : "password"}
              required
              autoComplete="current-password"
              className="w-full px-4 py-2.5 pr-10 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mar-escuro/40 hover:text-mar-escuro"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary justify-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Entrando..." : "Entrar com credenciais"}
        </button>
      </form>
    </div>
  );
}
