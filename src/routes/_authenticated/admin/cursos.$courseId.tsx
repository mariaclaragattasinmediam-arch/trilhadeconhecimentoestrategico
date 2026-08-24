import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { ContentStatus, Module } from "@/lib/api";
import {
  cmsKeys,
  createModule,
  deleteModule,
  duplicateModule,
  getCourse,
  listLessonsByModules,
  listModules,
  reorderModules,
  updateCourse,
  updateModule,
  type ModuleInput,
} from "@/lib/cms";
import { move, useDragSort } from "@/components/admin/sortable";
import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { StatusBadge, StatusSelect } from "@/components/admin/status";
import { ConfirmDelete } from "@/components/common/confirm-delete";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/page-parts";
import { WorkloadSummary } from "@/components/admin/workload-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

export const Route = createFileRoute("/_authenticated/admin/cursos/$courseId")({
  head: () => ({
    meta: [
      { title: "Editar curso — Trilha Ongoing" },
      { name: "description", content: "Edite dados do curso e organize seus módulos." },
      { property: "og:title", content: "Editar curso — Trilha Ongoing" },
      { property: "og:description", content: "Edição de curso e módulos na Trilha Ongoing." },
    ],
  }),
  component: AdminCurso,
});

const emptyModule: ModuleInput = { titulo: "", descricao: "", status: "rascunho" };

function ModuleDialog({
  open,
  onOpenChange,
  initial,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: ModuleInput;
  saving: boolean;
  onSubmit: (input: ModuleInput) => void;
}) {
  const [form, setForm] = useState<ModuleInput>(initial);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial.titulo ? "Editar módulo" : "Novo módulo"}</DialogTitle>
          <DialogDescription>Módulos agrupam as aulas do curso.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mod-titulo">Título</Label>
            <Input
              id="mod-titulo"
              value={form.titulo}
              maxLength={140}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mod-desc">Descrição</Label>
            <Textarea
              id="mod-desc"
              rows={3}
              maxLength={600}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mod-status">Status</Label>
            <StatusSelect
              id="mod-status"
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

function AdminCurso() {
  const { courseId } = Route.useParams();
  const queryClient = useQueryClient();
  const [ordem, setOrdem] = useState<Module[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Module | null>(null);
  const [dados, setDados] = useState({ titulo: "", descricao: "", status: "rascunho" as ContentStatus });

  const course = useQuery({ queryKey: cmsKeys.course(courseId), queryFn: () => getCourse(courseId) });
  const modules = useQuery({
    queryKey: cmsKeys.modules(courseId),
    queryFn: () => listModules(courseId),
  });
  const moduleIds = useMemo(() => (modules.data ?? []).map((m) => m.id), [modules.data]);
  const lessons = useQuery({
    queryKey: [...cmsKeys.allLessons, courseId],
    queryFn: () => listLessonsByModules(moduleIds),
    enabled: moduleIds.length > 0,
  });

  useEffect(() => {
    if (modules.data) setOrdem(modules.data);
  }, [modules.data]);

  useEffect(() => {
    if (course.data)
      setDados({
        titulo: course.data.titulo,
        descricao: course.data.descricao,
        status: course.data.status,
      });
  }, [course.data]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["cms"] });
    void queryClient.invalidateQueries({ queryKey: ["courses"] });
    void queryClient.invalidateQueries({ queryKey: ["modules"] });
  };

  const salvarCurso = useMutation({
    mutationFn: () => updateCourse(courseId, dados),
    onSuccess: () => {
      toast.success("Curso atualizado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const salvarModulo = useMutation({
    mutationFn: (input: ModuleInput) =>
      editando ? updateModule(editando.id, input) : createModule(courseId, input),
    onSuccess: () => {
      toast.success(editando ? "Módulo atualizado." : "Módulo criado.");
      setDialogOpen(false);
      setEditando(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicar = useMutation({
    mutationFn: (id: string) => duplicateModule(id),
    onSuccess: () => {
      toast.success("Módulo duplicado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: deleteModule,
    onSuccess: () => {
      toast.success("Módulo excluído.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reordenar = useMutation({
    mutationFn: reorderModules,
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const aplicarOrdem = (from: number, to: number) => {
    if (to < 0 || to >= ordem.length) return;
    const next = move(ordem, from, to);
    setOrdem(next);
    reordenar.mutate(next.map((m) => m.id));
  };

  const { getItemProps } = useDragSort(aplicarOrdem);

  const contarAulas = (moduleId: string) =>
    (lessons.data ?? []).filter((l) => l.module_id === moduleId).length;

  if (course.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!course.data) {
    return (
      <EmptyState
        icon={Layers}
        title="Curso não encontrado"
        description="O curso pode ter sido excluído."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/cursos">Voltar</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumbs items={[{ label: "Cursos", to: "/admin/cursos" }, { label: course.data.titulo }]} />

      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to="/admin/cursos">
          <ArrowLeft className="h-4 w-4" /> Cursos
        </Link>
      </Button>

      <PageHeader title={course.data.titulo} description="Dados do curso e organização de módulos." />

      <WorkloadSummary courseId={courseId} />


      <section className="surface space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-titulo">Título</Label>
            <Input
              id="c-titulo"
              value={dados.titulo}
              maxLength={140}
              onChange={(e) => setDados({ ...dados, titulo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-status">Status</Label>
            <StatusSelect
              id="c-status"
              value={dados.status}
              onChange={(status) => setDados({ ...dados, status })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-desc">Descrição</Label>
          <Textarea
            id="c-desc"
            rows={3}
            maxLength={600}
            value={dados.descricao}
            onChange={(e) => setDados({ ...dados, descricao: e.target.value })}
          />
        </div>
        <Button
          onClick={() => salvarCurso.mutate()}
          disabled={salvarCurso.isPending || dados.titulo.trim().length < 3}
        >
          {salvarCurso.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar alterações
        </Button>
      </section>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Módulos</h2>
          <p className="text-sm text-muted-foreground">
            Arraste os cartões ou use as setas para reordenar.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditando(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Novo módulo
        </Button>
      </div>

      {modules.isLoading ? (
        <LoadingRows />
      ) : ordem.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhum módulo ainda"
          description="Crie o primeiro módulo deste curso."
        />
      ) : (
        <ul className="space-y-3">
          {ordem.map((m, index) => {
            const dragProps = getItemProps(index);
            return (
              <li
                key={m.id}
                {...dragProps}
                className={`surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${dragProps.className}`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <GripVertical className="mt-1 h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/admin/modulos/$moduleId"
                        params={{ moduleId: m.id }}
                        className="font-medium hover:underline"
                      >
                        {index + 1}. {m.titulo}
                      </Link>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{m.descricao || "—"}</p>
                    <p className="text-xs text-muted-foreground">{contarAulas(m.id)} aula(s)</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Mover para cima"
                    disabled={index === 0}
                    onClick={() => aplicarOrdem(index, index - 1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Mover para baixo"
                    disabled={index === ordem.length - 1}
                    onClick={() => aplicarOrdem(index, index + 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/admin/modulos/$moduleId" params={{ moduleId: m.id }}>
                      Aulas
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
                          setEditando(m);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicar.mutate(m.id)}>
                        <Copy className="h-4 w-4" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <ConfirmDelete
                        title={`Excluir "${m.titulo}"?`}
                        description="As aulas e blocos deste módulo também serão excluídos."
                        onConfirm={() => excluir.mutate(m.id)}
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
            );
          })}
        </ul>
      )}

      <ModuleDialog
        key={`${editando?.id ?? "novo"}-${String(dialogOpen)}`}
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditando(null);
        }}
        initial={
          editando
            ? { titulo: editando.titulo, descricao: editando.descricao, status: editando.status }
            : emptyModule
        }
        saving={salvarModulo.isPending}
        onSubmit={(input) => salvarModulo.mutate(input)}
      />
    </div>
  );
}
