import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { api, computeProgress, qk } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingGrid, PageHeader } from "@/components/common/page-parts";

export const Route = createFileRoute("/_authenticated/cursos")({
  head: () => ({
    meta: [
      { title: "Cursos — Trilha Ongoing" },
      { name: "description", content: "Todos os cursos disponíveis na plataforma Ongoing." },
      { property: "og:title", content: "Cursos — Trilha Ongoing" },
      { property: "og:description", content: "Todos os cursos disponíveis na plataforma Ongoing." },
    ],
  }),
  component: CursosPage,
});

function CursosPage() {
  const { user } = useAuth();
  const [busca, setBusca] = useState("");

  const courses = useQuery({ queryKey: qk.courses, queryFn: api.listCourses });
  const modules = useQuery({ queryKey: qk.allModules, queryFn: () => api.listModules() });
  const lessons = useQuery({ queryKey: qk.allLessons, queryFn: () => api.listLessons() });
  const progress = useQuery({
    queryKey: [...qk.progress, user?.id],
    queryFn: () => api.listProgress(user!.id),
    enabled: Boolean(user?.id),
  });

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (courses.data ?? [])
      .filter(
        (c) =>
          !termo ||
          c.titulo.toLowerCase().includes(termo) ||
          c.descricao?.toLowerCase().includes(termo),
      )
      .map((c) => {
        const mods = (modules.data ?? []).filter((m) => m.course_id === c.id);
        const ls = (lessons.data ?? []).filter((l) => mods.some((m) => m.id === l.module_id));
        return {
          course: c,
          modulos: mods.length,
          ...computeProgress(ls.map((l) => l.id), progress.data ?? []),
        };
      });
  }, [busca, courses.data, modules.data, lessons.data, progress.data]);

  return (
    <>
      <PageHeader title="Cursos" description="Explore as trilhas disponíveis para o seu time." />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar curso..."
          className="pl-9"
        />
      </div>

      {courses.isLoading ? (
        <LoadingGrid count={3} />
      ) : lista.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nenhum curso encontrado" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map(({ course, modulos, percent, completed, total }) => (
            <article key={course.id} className="surface flex flex-col gap-4 p-5">
              <div>
                <h2 className="text-base font-semibold">{course.titulo}</h2>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                  {course.descricao}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {modulos} módulos · {total} aulas
              </p>
              <div className="space-y-1.5">
                <Progress value={percent} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {completed}/{total} concluídas · {percent}%
                </p>
              </div>
              <Button asChild size="sm" className="mt-auto w-full">
                <Link to="/curso/$courseId" params={{ courseId: course.id }}>
                  Acessar curso <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
