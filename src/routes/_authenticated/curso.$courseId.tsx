import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Layers, PlayCircle } from "lucide-react";
import { api, computeProgress, qk } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/page-parts";

export const Route = createFileRoute("/_authenticated/curso/$courseId")({
  head: () => ({
    meta: [
      { title: "Curso — Trilha Ongoing" },
      { name: "description", content: "Módulos e aulas do curso na plataforma Ongoing." },
      { property: "og:title", content: "Curso — Trilha Ongoing" },
      { property: "og:description", content: "Módulos e aulas do curso na plataforma Ongoing." },
    ],
  }),
  component: CursoPage,
});

function CursoPage() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();

  const course = useQuery({ queryKey: qk.course(courseId), queryFn: () => api.getCourse(courseId) });
  const modules = useQuery({
    queryKey: qk.modules(courseId),
    queryFn: () => api.listModules(courseId),
  });
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

  const geral = computeProgress(
    allLessons.filter((l) => mods.some((m) => m.id === l.module_id)).map((l) => l.id),
    prog,
  );

  return (
    <>
      <PageHeader
        title={course.data?.titulo ?? "Curso"}
        description={course.data?.descricao ?? undefined}
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

      {modules.isLoading ? (
        <LoadingRows />
      ) : mods.length === 0 ? (
        <EmptyState icon={Layers} title="Nenhum módulo neste curso" />
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {mods.map((m) => {
            const ls = allLessons.filter((l) => l.module_id === m.id);
            const stats = computeProgress(ls.map((l) => l.id), prog);
            return (
              <AccordionItem
                key={m.id}
                value={m.id}
                className="surface overflow-hidden border-none px-5"
              >
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex w-full items-center justify-between gap-4 pr-3">
                    <div className="min-w-0 text-left">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Módulo {m.ordem}
                      </p>
                      <p className="truncate text-sm font-semibold">{m.titulo}</p>
                    </div>
                    <Badge variant={stats.percent === 100 ? "default" : "secondary"}>
                      {stats.completed}/{stats.total}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <p className="mb-3 text-sm text-muted-foreground">{m.descricao}</p>
                  {ls.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma aula cadastrada ainda.</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-xl border border-border">
                      {ls.map((l) => (
                        <li key={l.id}>
                          <Link
                            to="/aula/$lessonId"
                            params={{ lessonId: l.id }}
                            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                          >
                            {doneIds.has(l.id) ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="min-w-0 flex-1 truncate text-sm">{l.titulo}</span>
                            <PlayCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </>
  );
}
