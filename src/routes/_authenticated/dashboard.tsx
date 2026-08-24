import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileStack,
  Layers,
  PlaySquare,
  Users,
} from "lucide-react";
import { api, computeProgress, qk } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingGrid, PageHeader } from "@/components/common/page-parts";
import { TrackCompletionCard } from "@/components/lesson/track-completion-card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Trilha Ongoing" },
      { name: "description", content: "Acompanhe seu progresso na trilha de conhecimento." },
      { property: "og:title", content: "Dashboard — Trilha Ongoing" },
      { property: "og:description", content: "Acompanhe seu progresso na trilha de conhecimento." },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DashboardPage() {
  const { profile, user, isAdmin } = useAuth();

  const modules = useQuery({ queryKey: qk.allModules, queryFn: () => api.listModules() });
  const lessons = useQuery({ queryKey: qk.allLessons, queryFn: () => api.listLessons() });
  const courses = useQuery({ queryKey: qk.courses, queryFn: api.listCourses });
  const progress = useQuery({
    queryKey: [...qk.progress, user?.id],
    queryFn: () => api.listProgress(user!.id),
    enabled: Boolean(user?.id),
  });
  const files = useQuery({ queryKey: qk.files, queryFn: api.listFiles, enabled: isAdmin });
  const profiles = useQuery({
    queryKey: qk.profiles,
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.from("profiles").select("id");
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const loading = modules.isLoading || lessons.isLoading || courses.isLoading;
  const allLessons = lessons.data ?? [];
  const allModules = modules.data ?? [];
  const prog = progress.data ?? [];

  const geral = computeProgress(
    allLessons.map((l) => l.id),
    prog,
  );

  const moduleStats = allModules.map((m) => {
    const ls = allLessons.filter((l) => l.module_id === m.id);
    return { module: m, ...computeProgress(ls.map((l) => l.id), prog) };
  });

  const modulosConcluidos = moduleStats.filter((m) => m.total > 0 && m.percent === 100).length;
  const proximo = moduleStats.find((m) => m.percent < 100);

  const recentes = [...prog]
    .sort((a, b) => (a.last_accessed_at < b.last_accessed_at ? 1 : -1))
    .slice(0, 5)
    .map((p) => ({ progresso: p, lesson: allLessons.find((l) => l.id === p.lesson_id) }))
    .filter((r) => r.lesson);

  const saudacao = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  return (
    <>
      <PageHeader
        title={`${saudacao}, ${profile?.nome?.split(" ")[0] || "colaborador"}!`}
        description={
          isAdmin
            ? "Visão geral do conteúdo publicado na plataforma."
            : "Continue de onde parou na sua trilha de conhecimento."
        }
      />

      {!isAdmin ? <TrackCompletionCard courseId={courses.data?.[0]?.id} /> : null}

      {isAdmin ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={BookOpen} label="Cursos" value={courses.data?.length ?? 0} />
          <StatCard icon={Layers} label="Módulos" value={allModules.length} />
          <StatCard icon={PlaySquare} label="Aulas" value={allLessons.length} />
          <StatCard icon={FileStack} label="Arquivos" value={files.data?.length ?? 0} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={CheckCircle2}
            label="Progresso geral"
            value={`${geral.percent}%`}
            hint={`${geral.completed} de ${geral.total} aulas`}
          />
          <StatCard
            icon={Layers}
            label="Módulos concluídos"
            value={`${modulosConcluidos}/${allModules.length}`}
          />
          <StatCard icon={PlaySquare} label="Aulas concluídas" value={geral.completed} />
          <StatCard
            icon={Clock}
            label="Próximo módulo"
            value={proximo ? `#${proximo.module.ordem}` : "—"}
            hint={proximo?.module.titulo ?? "Trilha concluída"}
          />
        </div>
      )}

      {isAdmin ? (
        <div className="surface flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium">{profiles.data?.length ?? 0} usuários cadastrados</p>
              <p className="text-sm text-muted-foreground">Gerencie conteúdo e acessos.</p>
            </div>
          </div>
          <Button asChild>
            <Link to="/admin/cursos">
              Gerenciar cursos <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">Progresso da trilha</p>
              <p className="text-sm text-muted-foreground">
                {geral.completed} de {geral.total} aulas concluídas
              </p>
            </div>
            <span className="font-display text-2xl font-semibold text-primary">
              {geral.percent}%
            </span>
          </div>
          <Progress value={geral.percent} className="mt-4 h-2" />
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Módulos</h2>
        {loading ? (
          <LoadingGrid />
        ) : moduleStats.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Nenhum módulo publicado"
            description="Assim que o time de conteúdo publicar módulos, eles aparecerão aqui."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {moduleStats.map(({ module, percent, completed, total }) => (
              <article
                key={module.id}
                className="surface flex flex-col gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Módulo {module.ordem}
                    </p>
                    <h3 className="mt-1 truncate text-base font-semibold">{module.titulo}</h3>
                  </div>
                  <Badge
                    variant={percent === 100 ? "default" : percent > 0 ? "secondary" : "outline"}
                  >
                    {percent === 100 ? "Concluído" : percent > 0 ? "Em andamento" : "Não iniciado"}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{module.descricao}</p>
                <div className="space-y-1.5">
                  <Progress value={percent} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {completed}/{total} aulas · {percent}%
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="mt-auto w-full">
                  <Link to="/curso/$courseId" params={{ courseId: module.course_id }}>
                    Continuar <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>

      {!isAdmin && recentes.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Últimos conteúdos acessados</h2>
          <div className="surface divide-y divide-border">
            {recentes.map(({ progresso, lesson }) => (
              <Link
                key={progresso.id}
                to="/aula/$lessonId"
                params={{ lessonId: progresso.lesson_id }}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{lesson?.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(progresso.last_accessed_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {progresso.completed ? (
                  <Badge variant="secondary" className="shrink-0">
                    Concluída
                  </Badge>
                ) : (
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
