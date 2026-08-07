import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Copy,
  FolderKanban,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { ContentStatus } from "@/lib/api";
import {
  cmsKeys,
  createCourse,
  deleteCourse,
  duplicateCourse,
  listCoursesAdmin,
  updateCourse,
  type CourseInput,
  type CourseWithCounts,
} from "@/lib/cms";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/page-parts";
import { ConfirmDelete } from "@/components/common/confirm-delete";
import { StatusBadge, StatusSelect } from "@/components/admin/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/cursos")({
  head: () => ({
    meta: [
      { title: "Gerenciar cursos — Trilha Ongoing" },
      {
        name: "description",
        content: "Crie, edite, duplique e publique cursos da Trilha de Conhecimento Estratégico.",
      },
      { property: "og:title", content: "Gerenciar cursos — Trilha Ongoing" },
      { property: "og:description", content: "CMS de cursos da Trilha Ongoing." },
    ],
  }),
  component: AdminCursos,
});

const empty: CourseInput = { titulo: "", descricao: "", status: "rascunho", capa_url: null };

function CourseDialog({
  open,
  onOpenChange,
  initial,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: CourseInput;
  saving: boolean;
  onSubmit: (input: CourseInput) => void;
}) {
  const [form, setForm] = useState<CourseInput>(initial);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setForm(initial);
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial.titulo ? "Editar curso" : "Novo curso"}</DialogTitle>
          <DialogDescription>Defina as informações principais do curso.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="curso-titulo">Título</Label>
            <Input
              id="curso-titulo"
              value={form.titulo}
              maxLength={140}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="curso-desc">Descrição</Label>
            <Textarea
              id="curso-desc"
              rows={3}
              maxLength={600}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="curso-capa">URL da capa (opcional)</Label>
            <Input
              id="curso-capa"
              value={form.capa_url ?? ""}
              onChange={(e) => setForm({ ...form, capa_url: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="curso-status">Status</Label>
            <StatusSelect
              id="curso-status"
              value={form.status}
              onChange={(status) => setForm({ ...form, status })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={saving || form.titulo.trim().length < 3}
            onClick={() => onSubmit({ ...form, titulo: form.titulo.trim() })}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminCursos() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<ContentStatus | "todos">("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<CourseWithCounts | null>(null);

  const courses = useQuery({ queryKey: cmsKeys.courses, queryFn: listCoursesAdmin });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["cms"] });
    void queryClient.invalidateQueries({ queryKey: ["courses"] });
  };

  const salvar = useMutation({
    mutationFn: async (input: CourseInput) =>
      editando ? updateCourse(editando.id, input) : createCourse(input),
    onSuccess: () => {
      toast.success(editando ? "Curso atualizado." : "Curso criado.");
      setDialogOpen(false);
      setEditando(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicar = useMutation({
    mutationFn: duplicateCourse,
    onSuccess: () => {
      toast.success("Curso duplicado como rascunho.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mudarStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) =>
      updateCourse(id, { status }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      toast.success("Curso excluído.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (courses.data ?? []).filter((c) => {
      const okStatus = filtro === "todos" || c.status === filtro;
      const okBusca = !termo || c.titulo.toLowerCase().includes(termo);
      return okStatus && okBusca;
    });
  }, [courses.data, busca, filtro]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cursos"
        description="Gerencie a hierarquia de conteúdo: curso → módulos → aulas → blocos."
        action={
          <Button
            onClick={() => {
              setEditando(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo curso
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar curso"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar curso"
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

      {courses.isLoading ? (
        <LoadingRows />
      ) : lista.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum curso encontrado"
          description="Crie o primeiro curso para começar a montar a trilha."
        />
      ) : (
        <ul className="space-y-3">
          {lista.map((c) => (
            <li
              key={c.id}
              className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/admin/cursos/$courseId"
                    params={{ courseId: c.id }}
                    className="font-medium hover:underline"
                  >
                    {c.titulo}
                  </Link>
                  <StatusBadge status={c.status} />
                </div>
                <p className="line-clamp-1 text-sm text-muted-foreground">{c.descricao || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {c.modulos} módulo(s) · {c.aulas} aula(s)
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/cursos/$courseId" params={{ courseId: c.id }}>
                    <Pencil className="h-4 w-4" /> Gerenciar
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label="Mais ações">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditando(c);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicar.mutate(c.id)}>
                      <Copy className="h-4 w-4" /> Duplicar
                    </DropdownMenuItem>
                    {c.status !== "publicado" ? (
                      <DropdownMenuItem
                        onClick={() => mudarStatus.mutate({ id: c.id, status: "publicado" })}
                      >
                        <FolderKanban className="h-4 w-4" /> Publicar
                      </DropdownMenuItem>
                    ) : null}
                    {c.status !== "arquivado" ? (
                      <DropdownMenuItem
                        onClick={() => mudarStatus.mutate({ id: c.id, status: "arquivado" })}
                      >
                        <Archive className="h-4 w-4" /> Arquivar
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <ConfirmDelete
                      title={`Excluir "${c.titulo}"?`}
                      description="Todos os módulos, aulas e blocos deste curso serão excluídos."
                      onConfirm={() => excluir.mutate(c.id)}
                    >
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2 className="h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </ConfirmDelete>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CourseDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditando(null);
        }}
        initial={
          editando
            ? {
                titulo: editando.titulo,
                descricao: editando.descricao,
                status: editando.status,
                capa_url: editando.capa_url,
              }
            : empty
        }
        saving={salvar.isPending}
        onSubmit={(input) => salvar.mutate(input)}
      />
    </div>
  );
}
