import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Route as RouteIcon } from "lucide-react";
import { api, computeProgress, qk } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/page-parts";
import { TrackCompletionCard } from "@/components/lesson/track-completion-card";

export const Route = createFileRoute("/_authenticated/minha-trilha")({
  head: () => ({
    meta: [
      { title: "Minha Trilha — Trilha Ongoing" },
      { name: "description", content: "Sua jornada completa de aprendizagem, módulo a módulo." },
      { property: "og:title", content: "Minha Trilha — Trilha Ongoing" },
      {
        property: "og:description",
        content: "Sua jornada completa de aprendizagem, módulo a módulo.",
      },
    ],
  }),
  component: MinhaTrilhaPage,
});

function MinhaTrilhaPage() {
  const { user } = useAuth();
  const courses = useQuery({ queryKey: qk.courses, queryFn: api.listCourses });
  const modules = useQuery({ queryKey: qk.allModules, queryFn: () => api.listModules() });
  const lessons = useQuery({ queryKey: qk.allLessons, queryFn: () => api.listLessons() });
  const progress = useQuery({
    queryKey: [...qk.progress, user?.id],
    queryFn: () => api.listProgress(user!.id),
    enabled: Boolean(user?.id),
  });

  const mods = modules.data ?? [];
  const allLessons = lessons.data ?? [];
  const prog = progress.data ?? [];
  const doneIds = new Set(prog.filter((p) => p.completed).map((p) => p.lesson_id));
  const geral = computeProgress(allLessons.map((l) => l.id), prog);

  return (
    <>
      <PageHeader
        title="Minha Trilha"
        description="Acompanhe passo a passo sua evolução na trilha de conhecimento."
      />

      <div className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {geral.completed} de {geral.total} aulas concluídas
          </p>
          <span className="font-display text-xl font-semibold text-primary">{geral.percent}%</span>
        </div>
        <Progress value={geral.percent} className="mt-3 h-2" />
      </div>

      <TrackCompletionCard courseId={courses.data?.[0]?.id} />

      {modules.isLoading ? (
        <LoadingRows />
      ) : mods.length === 0 ? (
        <EmptyState icon={RouteIcon} title="Nenhum módulo disponível" />
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-6">
          {mods.map((m) => {
            const ls = allLessons.filter((l) => l.module_id === m.id);
            const stats = computeProgress(ls.map((l) => l.id), prog);
            return (
              <li key={m.id} className="relative">
                <span
                  className={`absolute -left-[31px] top-5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background ${
                    stats.percent === 100 ? "bg-primary" : "bg-muted"
                  }`}
                >
                  {stats.percent === 100 ? (
                    <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                  ) : null}
                </span>
                <div className="surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Módulo {m.ordem}
                      </p>
                      <h2 className="text-sm font-semibold">{m.titulo}</h2>
                    </div>
                    <Badge variant={stats.percent === 100 ? "default" : "secondary"}>
                      {stats.percent}%
                    </Badge>
                  </div>
                  <Progress value={stats.percent} className="mt-3 h-1.5" />
                  <ul className="mt-4 space-y-1.5">
                    {ls.map((l) => (
                      <li key={l.id}>
                        <Link
                          to="/aula/$lessonId"
                          params={{ lessonId: l.id }}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
                        >
                          {doneIds.has(l.id) ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{l.titulo}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
