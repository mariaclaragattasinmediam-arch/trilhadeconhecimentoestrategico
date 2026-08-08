import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search } from "lucide-react";
import type { ContentStatus } from "@/lib/api";
import { cmsKeys, listCoursesAdmin, listLessons, listModules } from "@/lib/cms";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/page-parts";
import { StatusBadge } from "@/components/admin/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/aulas")({
  head: () => ({
    meta: [
      { title: "Aulas — CMS Trilha Ongoing" },
      {
        name: "description",
        content: "Índice de todas as aulas da trilha, com status, módulo, curso e acesso ao editor de blocos.",
      },
      { property: "og:title", content: "Aulas — CMS Trilha Ongoing" },
      { property: "og:description", content: "Índice navegável das aulas da Trilha Ongoing." },
    ],
  }),
  component: AdminAulas,
});

function AdminAulas() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<ContentStatus | "todos">("todos");

  const courses = useQuery({ queryKey: cmsKeys.courses, queryFn: listCoursesAdmin });
  const modules = useQuery({ queryKey: cmsKeys.allModules, queryFn: () => listModules() });
  const lessons = useQuery({ queryKey: cmsKeys.allLessons, queryFn: () => listLessons() });

  const cursoNome = useMemo(
    () => new Map((courses.data ?? []).map((c) => [c.id, c.titulo])),
    [courses.data],
  );
  const moduloPorId = useMemo(
    () => new Map((modules.data ?? []).map((m) => [m.id, m])),
    [modules.data],
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (lessons.data ?? []).filter((l) => {
      const mod = moduloPorId.get(l.module_id);
      const okStatus = filtro === "todos" || l.status === filtro;
      const okBusca =
        !termo ||
        l.titulo.toLowerCase().includes(termo) ||
        (mod?.titulo ?? "").toLowerCase().includes(termo);
      return okStatus && okBusca;
    });
  }, [lessons.data, busca, filtro, moduloPorId]);

  const carregando = lessons.isLoading || modules.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aulas"
        description="Todas as aulas da plataforma. Abra uma aula para editar seus blocos de conteúdo."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar aula ou módulo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar aula"
          />
        </div>
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as ContentStatus | "todos")}>
          <TabsList>
            <TabsTrigger value="todos">Todas</TabsTrigger>
            <TabsTrigger value="rascunho">Rascunhos</TabsTrigger>
            <TabsTrigger value="publicado">Publicadas</TabsTrigger>
            <TabsTrigger value="arquivado">Arquivadas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {carregando ? (
        <LoadingRows />
      ) : lista.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma aula encontrada"
          description="Crie aulas dentro de um módulo para vê-las aqui."
          action={
            <Button asChild variant="outline">
              <Link to="/admin/modulos">Ir para módulos</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {lista.map((l) => {
            const mod = moduloPorId.get(l.module_id);
            return (
              <li
                key={l.id}
                className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/admin/aulas/$lessonId"
                      params={{ lessonId: l.id }}
                      className="font-medium hover:underline"
                    >
                      {l.titulo}
                    </Link>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="line-clamp-1 text-sm text-muted-foreground">{l.descricao || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {mod ? (
                      <>
                        <Link
                          to="/admin/modulos/$moduleId"
                          params={{ moduleId: mod.id }}
                          className="hover:underline"
                        >
                          {mod.titulo}
                        </Link>{" "}
                        · {cursoNome.get(mod.course_id) ?? "Curso"}
                      </>
                    ) : (
                      "Módulo removido"
                    )}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link to="/admin/aulas/$lessonId" params={{ lessonId: l.id }}>
                    Editar blocos
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
