import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Blocks, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { BlockContent, BlockType, LessonBlock } from "@/lib/api";
import {
  BLOCK_LABELS,
  cmsKeys,
  createBlock,
  deleteBlock,
  getLesson,
  listBlocks,
  reorderBlocks,
  updateBlock,
  updateLesson,
} from "@/lib/cms";
import { move, useDragSort } from "@/components/admin/sortable";
import { BlockCard } from "@/components/admin/block-editor";
import { StatusSelect } from "@/components/admin/status";
import { EmptyState, PageHeader } from "@/components/common/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

  const lesson = useQuery({ queryKey: cmsKeys.lesson(lessonId), queryFn: () => getLesson(lessonId) });
  const blocks = useQuery({ queryKey: cmsKeys.blocks(lessonId), queryFn: () => listBlocks(lessonId) });

  useEffect(() => {
    if (blocks.data) setOrdem(blocks.data);
  }, [blocks.data]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["cms"] });
    void queryClient.invalidateQueries({ queryKey: ["blocks"] });
  };

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

  const statusAula = useMutation({
    mutationFn: (status: "rascunho" | "publicado" | "arquivado") => updateLesson(lessonId, { status }),
    onSuccess: () => {
      toast.success("Status da aula atualizado.");
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

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to="/admin/modulos/$moduleId" params={{ moduleId: lesson.data.module_id }}>
          <ArrowLeft className="h-4 w-4" /> Voltar ao módulo
        </Link>
      </Button>

      <PageHeader
        title={lesson.data.titulo}
        description="Adicione, edite, reordene, duplique e remova blocos de conteúdo."
        action={
          <Button asChild variant="outline">
            <Link to="/aula/$lessonId" params={{ lessonId }}>
              Ver como aluno
            </Link>
          </Button>
        }
      />

      <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full space-y-1.5 sm:max-w-xs">
          <Label htmlFor="aula-status-editor">Status da aula</Label>
          <StatusSelect
            id="aula-status-editor"
            value={lesson.data.status}
            onChange={(status) => statusAula.mutate(status)}
          />
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
