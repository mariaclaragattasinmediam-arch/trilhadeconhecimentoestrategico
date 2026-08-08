import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Blocks, Eye, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import type { BlockContent, BlockType, ContentStatus, LessonBlock } from "@/lib/api";
import {
  BLOCK_LABELS,
  cmsKeys,
  createBlock,
  deleteBlock,
  getCourse,
  getLesson,
  getModule,
  listBlocks,
  reorderBlocks,
  updateBlock,
  updateLesson,
} from "@/lib/cms";
import { move, useDragSort } from "@/components/admin/sortable";
import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { BlockCard } from "@/components/admin/block-editor";
import { StatusBadge, StatusSelect } from "@/components/admin/status";
import { BlockRenderer } from "@/components/lesson/block-renderer";
import { EmptyState, PageHeader } from "@/components/common/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/admin/aulas/$lessonId")({
  head: () => ({
    meta: [
      { title: "Editor de aula — Trilha Ongoing" },
      { name: "description", content: "Monte a aula com blocos de texto, mídia e destaques." },
      { property: "og:title", content: "Editor de aula — Trilha Ongoing" },
      { property: "og:description", content: "Editor visual de blocos da Trilha Ongoing." },
    ],
  }),
  component: AdminAulaEditor,
});

const tipos = Object.keys(BLOCK_LABELS) as BlockType[];

function AdminAulaEditor() {
  const { lessonId } = Route.useParams();
  const queryClient = useQueryClient();
  const [ordem, setOrdem] = useState<LessonBlock[]>([]);
  const [preview, setPreview] = useState(false);
  const [dados, setDados] = useState<{ titulo: string; descricao: string; status: ContentStatus }>({
    titulo: "",
    descricao: "",
    status: "rascunho",
  });

  const lesson = useQuery({ queryKey: cmsKeys.lesson(lessonId), queryFn: () => getLesson(lessonId) });
  const blocks = useQuery({ queryKey: cmsKeys.blocks(lessonId), queryFn: () => listBlocks(lessonId) });

  const moduleId = lesson.data?.module_id;
  const modulo = useQuery({
    queryKey: cmsKeys.module(moduleId ?? "none"),
    queryFn: () => getModule(moduleId as string),
    enabled: Boolean(moduleId),
  });
  const courseId = modulo.data?.course_id;
  const course = useQuery({
    queryKey: cmsKeys.course(courseId ?? "none"),
    queryFn: () => getCourse(courseId as string),
    enabled: Boolean(courseId),
  });

  useEffect(() => {
    if (blocks.data) setOrdem(blocks.data);
  }, [blocks.data]);

  useEffect(() => {
    if (lesson.data) {
      setDados({
        titulo: lesson.data.titulo,
        descricao: lesson.data.descricao,
        status: lesson.data.status,
      });
    }
  }, [lesson.data]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["cms"] });
  };

  const salvarAula = useMutation({
    mutationFn: () => updateLesson(lessonId, dados),
    onSuccess: () => {
      toast.success("Aula salva.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adicionar = useMutation({
    mutationFn: (tipo: BlockType) => createBlock(lessonId, tipo, {}),
    onSuccess: () => {
      toast.success("Bloco adicionado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const salvarBloco = useMutation({
    mutationFn: ({ id, conteudo }: { id: string; conteudo: BlockContent }) =>
      updateBlock(id, conteudo),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicarBloco = useMutation({
    mutationFn: (block: LessonBlock) =>
      createBlock(lessonId, block.tipo, (block.conteudo ?? {}) as BlockContent),
    onSuccess: () => {
      toast.success("Bloco duplicado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirBloco = useMutation({
    mutationFn: deleteBlock,
    onSuccess: () => {
      toast.success("Bloco excluído.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reordenar = useMutation({
    mutationFn: reorderBlocks,
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const publicar = useMutation({
    mutationFn: (status: ContentStatus) => updateLesson(lessonId, { status }),
    onSuccess: (_d, status) => {
      setDados((prev) => ({ ...prev, status }));
      toast.success(status === "publicado" ? "Aula publicada." : "Status atualizado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const aplicarOrdem = (from: number, to: number) => {
    if (to < 0 || to >= ordem.length) return;
    const next = move(ordem, from, to);
    setOrdem(next);
    reordenar.mutate(next.map((b) => b.id));
  };

  const { getItemProps } = useDragSort(aplicarOrdem);

  const alterarConteudo = (id: string, conteudo: BlockContent) => {
    setOrdem((prev) => prev.map((b) => (b.id === id ? { ...b, conteudo } : b)));
  };

  if (lesson.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!lesson.data) {
    return (
      <EmptyState
        icon={Blocks}
        title="Aula não encontrada"
        description="A aula pode ter sido excluída."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/cursos">Voltar aos cursos</Link>
          </Button>
        }
      />
    );
  }

  if (preview) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setPreview(false)}>
            <Pencil className="h-4 w-4" /> Voltar para edição
          </Button>
          <StatusBadge status={dados.status} />
        </div>
        <article className="surface space-y-6 p-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{dados.titulo}</h1>
            {dados.descricao ? (
              <p className="text-sm text-muted-foreground">{dados.descricao}</p>
            ) : null}
          </header>
          {ordem.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta aula ainda não possui conteúdo.</p>
          ) : (
            <div className="space-y-6">
              {ordem.map((b) => (
                <BlockRenderer key={b.id} block={b} />
              ))}
            </div>
          )}
        </article>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumbs
        items={[
          { label: "Cursos", to: "/admin/cursos" },
          ...(courseId
            ? [
                {
                  label: course.data?.titulo ?? "Curso",
                  to: "/admin/cursos/$courseId",
                  params: { courseId },
                },
              ]
            : []),
          {
            label: modulo.data?.titulo ?? "Módulo",
            to: "/admin/modulos/$moduleId",
            params: { moduleId: lesson.data.module_id },
          },
          { label: lesson.data.titulo },
        ]}
      />

      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to="/admin/modulos/$moduleId" params={{ moduleId: lesson.data.module_id }}>
          <ArrowLeft className="h-4 w-4" /> Voltar ao módulo
        </Link>
      </Button>

      <PageHeader
        title={lesson.data.titulo}
        description="Edite os dados da aula e monte o conteúdo em blocos."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setPreview(true)}>
              <Eye className="h-4 w-4" /> Visualizar aula
            </Button>
            {dados.status !== "publicado" ? (
              <Button variant="outline" onClick={() => publicar.mutate("publicado")}>
                Publicar
              </Button>
            ) : (
              <Button variant="outline" onClick={() => publicar.mutate("rascunho")}>
                Despublicar
              </Button>
            )}
          </div>
        }
      />

      <section className="surface space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="a-titulo">Título</Label>
            <Input
              id="a-titulo"
              value={dados.titulo}
              maxLength={140}
              onChange={(e) => setDados({ ...dados, titulo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aula-status-editor">Status</Label>
            <StatusSelect
              id="aula-status-editor"
              value={dados.status}
              onChange={(status) => setDados({ ...dados, status })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-desc">Descrição</Label>
          <Textarea
            id="a-desc"
            rows={3}
            maxLength={600}
            value={dados.descricao}
            onChange={(e) => setDados({ ...dados, descricao: e.target.value })}
          />
        </div>
        <Button
          onClick={() => salvarAula.mutate()}
          disabled={salvarAula.isPending || dados.titulo.trim().length < 3}
        >
          {salvarAula.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar alterações
        </Button>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Blocos de conteúdo</h2>
          <p className="text-sm text-muted-foreground">
            Arraste os cartões ou use as setas para reordenar. As alterações são salvas
            automaticamente.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={adicionar.isPending}>
              {adicionar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar bloco
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
            {tipos.map((t) => (
              <DropdownMenuItem key={t} onClick={() => adicionar.mutate(t)}>
                {BLOCK_LABELS[t]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {blocks.isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : ordem.length === 0 ? (
        <EmptyState
          icon={Blocks}
          title="Aula sem blocos"
          description='Use "Adicionar bloco" para montar o conteúdo desta aula.'
        />
      ) : (
        <ul className="space-y-3">
          {ordem.map((b, index) => (
            <BlockCard
              key={b.id}
              block={b}
              index={index}
              total={ordem.length}
              dragProps={getItemProps(index) as unknown as Record<string, unknown>}
              onChange={(conteudo) => {
                alterarConteudo(b.id, conteudo);
                salvarBloco.mutate({ id: b.id, conteudo });
              }}
              onMove={(dir) => aplicarOrdem(index, index + dir)}
              onDuplicate={() => duplicarBloco.mutate(b)}
              onDelete={() => excluirBloco.mutate(b.id)}
            />
          ))}
        </ul>
      )}

      {salvarBloco.isPending ? (
        <p className="text-xs text-muted-foreground">Salvando alterações…</p>
      ) : null}
    </div>
  );
}
