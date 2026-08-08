import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layers, Search } from "lucide-react";
import type { ContentStatus } from "@/lib/api";
import { cmsKeys, listCoursesAdmin, listLessons, listModules } from "@/lib/cms";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/page-parts";
import { StatusBadge } from "@/components/admin/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/modulos")({
  head: () => ({
    meta: [
      { title: "Módulos — CMS Trilha Ongoing" },
      {
        name: "description",
        content: "Índice de todos os módulos da trilha, com status, curso de origem e acesso rápido ao editor.",
      },
      { property: "og:title", content: "Módulos — CMS Trilha Ongoing" },
      { property: "og:description", content: "Índice navegável dos módulos da Trilha Ongoing." },
    ],
  }),
  component: AdminModulos,
});

function AdminModulos() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<ContentStatus | "todos">("todos");

  const courses = useQuery({ queryKey: cmsKeys.courses, queryFn: listCoursesAdmin });
  const modules = useQuery({ queryKey: cmsKeys.allModules, queryFn: () => listModules() });
  const lessons = useQuery({ queryKey: cmsKeys.allLessons, queryFn: () => listLessons() });

  const cursoNome = useMemo(
    () => new Map((courses.data ?? []).map((c) => [c.id, c.titulo])),
    [courses.data],
  );

  const aulasPorModulo = useMemo(() => {
    const map = new Map<string, number>();
    (lessons.data ?? []).forEach((l) => map.set(l.module_id, (map.get(l.module_id) ?? 0) + 1));
    return map;
  }, [lessons.data]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (modules.data ?? []).filter((m) => {
      const okStatus = filtro === "todos" || m.status === filtro;
      const okBusca =
        !termo ||
        m.titulo.toLowerCase().includes(termo) ||
        (cursoNome.get(m.course_id) ?? "").toLowerCase().includes(termo);
      return okStatus && okBusca;
    });
  }, [modules.data, busca, filtro, cursoNome]);

  const carregando = modules.isLoading || courses.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Módulos"
        description="Todos os módulos da plataforma, agrupados por curso. Abra um módulo para reordenar suas aulas."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar módulo ou curso"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar módulo"
          />
        </div>
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as ContentStatus | "todos")}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="rascunho">Rascunhos</TabsTrigger>
            <TabsTrigger value="publicado">Publicados</TabsTrigger>
            <TabsTrigger value="arquivado">Arquivados</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {carregando ? (
        <LoadingRows />
      ) : lista.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhum módulo encontrado"
          description="Crie módulos dentro de um curso para vê-los aqui."
          action={
            <Button asChild variant="outline">
              <Link to="/admin/cursos">Ir para cursos</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {lista.map((m) => (
            <li
              key={m.id}
              className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/admin/modulos/$moduleId"
                    params={{ moduleId: m.id }}
                    className="font-medium hover:underline"
                  >
                    {m.titulo}
                  </Link>
                  <StatusBadge status={m.status} />
                </div>
                <p className="line-clamp-1 text-sm text-muted-foreground">{m.descricao || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  <Link
                    to="/admin/cursos/$courseId"
                    params={{ courseId: m.course_id }}
                    className="hover:underline"
                  >
                    {cursoNome.get(m.course_id) ?? "Curso"}
                  </Link>{" "}
                  · {aulasPorModulo.get(m.id) ?? 0} aula(s)
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link to="/admin/modulos/$moduleId" params={{ moduleId: m.id }}>
                  Gerenciar aulas
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
