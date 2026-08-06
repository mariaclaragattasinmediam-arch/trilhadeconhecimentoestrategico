import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, BarChart3, GraduationCap, Layers, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trilha de Conhecimento Estratégico – Ongoing" },
      {
        name: "description",
        content:
          "Plataforma corporativa de treinamento da Ongoing. Trilhas estruturadas, aulas multimídia e acompanhamento de progresso individual.",
      },
      { property: "og:title", content: "Trilha de Conhecimento Estratégico – Ongoing" },
      {
        property: "og:description",
        content: "Treinamento corporativo com trilhas, aulas multimídia e progresso individual.",
      },
    ],
  }),
  component: Index,
});

const destaques = [
  {
    icon: Layers,
    titulo: "Trilhas estruturadas",
    texto: "Cursos organizados em módulos e aulas com ordem definida pelo time de conteúdo.",
  },
  {
    icon: BarChart3,
    titulo: "Progresso individual",
    texto: "Cada colaborador acompanha a própria evolução por aula, módulo e curso.",
  },
  {
    icon: ShieldCheck,
    titulo: "Conteúdo centralizado",
    texto: "PDFs, vídeos, imagens e documentos em um repositório único e seguro.",
  },
];

function Index() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-display text-sm font-semibold">Trilha Ongoing</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 sm:pt-20">
          <div className="hero-gradient relative overflow-hidden rounded-4xl px-8 py-16 text-primary-foreground shadow-[var(--shadow-lift)] sm:px-14 sm:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
              Treinamento corporativo
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
              Trilha de Conhecimento Estratégico
              <span className="block text-accent">Ongoing</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-primary-foreground/80">
              Um único ambiente para estruturar o conhecimento do time, distribuir conteúdo e
              acompanhar a evolução de cada colaborador.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth">
                  Acessar plataforma <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-5 md:grid-cols-3">
            {destaques.map((d) => (
              <article key={d.titulo} className="surface p-6 transition-shadow hover:shadow-[var(--shadow-lift)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <d.icon className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-base font-semibold">{d.titulo}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{d.texto}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Ongoing — Trilha de Conhecimento Estratégico
      </footer>
    </div>
  );
}
