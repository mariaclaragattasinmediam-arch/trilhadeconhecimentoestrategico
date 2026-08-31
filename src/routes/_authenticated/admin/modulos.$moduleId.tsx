import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Library,
  Link2Off,
  Loader2,
  MoreHorizontal,
  Pencil,
  PlaySquare,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { ContentStatus, Lesson } from "@/lib/api";
import {
  cmsKeys,
  createLesson,
  duplicateLesson,
  getCourse,
  getModule,
  listBlockCounts,
  updateLesson,
  updateModule,
  type LessonInput,
} from "@/lib/cms";
import {
  attachLesson,
  deleteLessonPermanently,
  detachLesson,
  distinctCourses,
  lessonUsageMap,
  lessonsOfModule,
  reorderModuleLessons,
  reuseKeys,
  searchLessonLibrary,
} from "@/lib/reuse";
import { move, useDragSort } from "@/components/admin/sortable";
import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { StatusBadge, StatusSelect } from "@/components/admin/status";
import { ConfirmDelete } from "@/components/common/confirm-delete";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/page-parts";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/_authenticated/admin/modulos/$moduleId")({
  head: () => ({
    meta: [
      { title: "Editar módulo — Trilha Ongoing" },
      { name: "description", content: "Edite o módulo e organize a sequência de aulas." },
      { property: "og:title", content: "Editar módulo — Trilha Ongoing" },
      { property: "og:description", content: "Edição de módulo e aulas na Trilha Ongoing." },
    ],
  }),
  component: AdminModulo,
});

const emptyLesson: LessonInput = { titulo: "", descricao: "", status: "rascunho" };

function LessonDialog({
  open,
  onOpenChange,
  initial,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: LessonInput;
  saving: boolean;
  onSubmit: (input: LessonInput) => void;
}) {
  const [form, setForm] = useState<LessonInput>(initial);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial.titulo ? "Editar aula" : "Nova aula"}</DialogTitle>
          <DialogDescription>Depois adicione os blocos de conteúdo da aula.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="aula-titulo">Título</Label>
            <Input
              id="aula-titulo"
              value={form.titulo}
              maxLength={140}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aula-desc">Descrição</Label>
            <Textarea
              id="aula-desc"
              rows={3}
              maxLength={600}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aula-status">Status</Label>
            <StatusSelect
              id="aula-status"
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

function AdminModulo() {
  const { moduleId } = Route.useParams();
  const queryClient = useQueryClient();
  const [ordem, setOrdem] = useState<Lesson[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bibliotecaOpen, setBibliotecaOpen] = useState(false);
  const [buscaBiblioteca, setBuscaBiblioteca] = useState("");
  const [editando, setEditando] = useState<Lesson | null>(null);
  const [dados, setDados] = useState({
    titulo: "",
    descricao: "",
    status: "rascunho" as ContentStatus,
  });

  const modulo = useQuery({ queryKey: cmsKeys.module(moduleId), queryFn: () => getModule(moduleId) });
  const courseId = modulo.data?.course_id;
  const course = useQuery({
    queryKey: cmsKeys.course(courseId ?? "none"),
    queryFn: () => getCourse(courseId as string),
    enabled: Boolean(courseId),
  });

  const lessons = useQuery({
    queryKey: reuseKeys.links(moduleId),
    queryFn: () => lessonsOfModule(moduleId),
  });
  const usos = useQuery({ queryKey: reuseKeys.usageAll, queryFn: lessonUsageMap });
  const biblioteca = useQuery({
    queryKey: [...reuseKeys.library, buscaBiblioteca],
    queryFn: () => searchLessonLibrary(buscaBiblioteca),
    enabled: bibliotecaOpen,
  });
  const blocos = useQuery({
    queryKey: ["cms", "block-counts", moduleId, (lessons.data ?? []).length],
    queryFn: () => listBlockCounts((lessons.data ?? []).map((l) => l.id)),
    enabled: Boolean(lessons.data),
  });

  useEffect(() => {
    if (lessons.data) setOrdem(lessons.data);
  }, [lessons.data]);

  useEffect(() => {
    if (modulo.data)
      setDados({
        titulo: modulo.data.titulo,
        descricao: modulo.data.descricao,
        status: modulo.data.status,
      });
  }, [modulo.data]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["cms"] });
    void queryClient.invalidateQueries({ queryKey: ["reuse"] });
    void queryClient.invalidateQueries({ queryKey: ["lessons"] });
    void queryClient.invalidateQueries({ queryKey: ["module-lessons"] });
    void queryClient.invalidateQueries({ queryKey: ["modules"] });
  };

  const salvarModulo = useMutation({
    mutationFn: () => updateModule(moduleId, dados),
    onSuccess: () => {
      toast.success("Módulo atualizado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const salvarAula = useMutation({
    mutationFn: (input: LessonInput) =>
      editando ? updateLesson(editando.id, input) : createLesson(moduleId, input),
    onSuccess: () => {
      toast.success(editando ? "Conteúdo atualizado." : "Conteúdo criado.");
      setDialogOpen(false);
      setEditando(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicar = useMutation({
    mutationFn: (id: string) => duplicateLesson(id),
    onSuccess: () => {
      toast.success("Conteúdo duplicado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const vincular = useMutation({
    mutationFn: (lessonId: string) => attachLesson(moduleId, lessonId),
    onSuccess: () => {
      toast.success("Conteúdo adicionado ao módulo.");
      setBibliotecaOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const desvincular = useMutation({
    mutationFn: (lessonId: string) => detachLesson(moduleId, lessonId),
    onSuccess: () => {
      toast.success("Conteúdo removido deste módulo (segue disponível na biblioteca).");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: deleteLessonPermanently,
    onSuccess: () => {
      toast.success("Conteúdo excluído definitivamente.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reordenar = useMutation({
    mutationFn: (ids: string[]) => reorderModuleLessons(moduleId, ids),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const aplicarOrdem = (from: number, to: number) => {
    if (to < 0 || to >= ordem.length) return;
    const next = move(ordem, from, to);
    setOrdem(next);
    reordenar.mutate(next.map((l) => l.id));
  };

  const { getItemProps } = useDragSort(aplicarOrdem);

  if (modulo.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!modulo.data) {
    return (
      <EmptyState
        icon={PlaySquare}
        title="Módulo não encontrado"
        description="O módulo pode ter sido excluído."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/cursos">Voltar aos cursos</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumbs
        items={[
          { label: "Cursos", to: "/admin/cursos" },
          {
            label: course.data?.titulo ?? "Curso",
            to: "/admin/cursos/$courseId",
            params: { courseId: modulo.data.course_id },
          },
          { label: modulo.data.titulo },
        ]}
      />
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">

        <Link to="/admin/cursos/$courseId" params={{ courseId: modulo.data.course_id }}>
          <ArrowLeft className="h-4 w-4" /> Voltar ao curso
        </Link>
      </Button>

      <PageHeader title={modulo.data.titulo} description="Dados do módulo e organização das aulas." />

      <section className="surface space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="m-titulo">Título</Label>
            <Input
              id="m-titulo"
              value={dados.titulo}
              maxLength={140}
              onChange={(e) => setDados({ ...dados, titulo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-status">Status</Label>
            <StatusSelect
              id="m-status"
              value={dados.status}
              onChange={(status) => setDados({ ...dados, status })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-desc">Descrição</Label>
          <Textarea
            id="m-desc"
            rows={3}
            maxLength={600}
            value={dados.descricao}
            onChange={(e) => setDados({ ...dados, descricao: e.target.value })}
          />
        </div>
        <Button
          onClick={() => salvarModulo.mutate()}
          disabled={salvarModulo.isPending || dados.titulo.trim().length < 3}
        >
          {salvarModulo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar alterações
        </Button>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Conteúdos</h2>
          <p className="text-sm text-muted-foreground">
            Arraste ou use as setas para reordenar. Conteúdos podem ser reutilizados em outros
            cursos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setBuscaBiblioteca("");
              setBibliotecaOpen(true);
            }}
          >
            <Library className="h-4 w-4" /> Adicionar conteúdo existente
          </Button>
          <Button
            onClick={() => {
              setEditando(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo conteúdo
          </Button>
        </div>
      </div>

      {lessons.isLoading ? (
        <LoadingRows />
      ) : ordem.length === 0 ? (
        <EmptyState
          icon={PlaySquare}
          title="Nenhum conteúdo ainda"
          description="Crie um novo conteúdo ou adicione um já existente da biblioteca."
        />
      ) : (
        <ul className="space-y-3">
          {ordem.map((l, index) => {
            const dragProps = getItemProps(index);
            const cursosDoConteudo = distinctCourses(usos.data?.get(l.id));
            return (
              <li
                key={l.id}
                {...dragProps}
                className={`surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${dragProps.className}`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <GripVertical className="mt-1 h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/admin/aulas/$lessonId"
                        params={{ lessonId: l.id }}
                        className="font-medium hover:underline"
                      >
                        {index + 1}. {l.titulo}
                      </Link>
                      <StatusBadge status={l.status} />
                      {cursosDoConteudo.length > 1 ? (
                        <Badge variant="secondary">
                          Usado em {cursosDoConteudo.length} cursos
                        </Badge>
                      ) : null}
                    </div>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{l.descricao || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {blocos.data?.get(l.id) ?? 0} bloco(s)
                      {cursosDoConteudo.length > 1
                        ? ` · ${cursosDoConteudo.map((c) => c.courseTitulo).join(", ")}`
                        : ""}
                    </p>
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
                    <Link to="/admin/aulas/$lessonId" params={{ lessonId: l.id }}>
                      <Pencil className="h-4 w-4" /> Editor
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
                          setEditando(l);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" /> Editar dados
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicar.mutate(l.id)}>
                        <Copy className="h-4 w-4" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => desvincular.mutate(l.id)}>
                        <Link2Off className="h-4 w-4" /> Remover deste módulo
                      </DropdownMenuItem>
                      <ConfirmDelete
                        title={`Excluir "${l.titulo}" definitivamente?`}
                        description="O conteúdo e seus blocos serão excluídos de toda a plataforma. Só é possível quando ele não está em nenhum módulo."
                        onConfirm={() => excluir.mutate(l.id)}
                      >
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="h-4 w-4" /> Excluir definitivamente
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

      <LessonDialog
        key={`${editando?.id ?? "novo"}-${String(dialogOpen)}`}
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditando(null);
        }}
        initial={
          editando
            ? { titulo: editando.titulo, descricao: editando.descricao, status: editando.status }
            : emptyLesson
        }
        saving={salvarAula.isPending}
        onSubmit={(input) => salvarAula.mutate(input)}
      />
    </div>
  );
}
