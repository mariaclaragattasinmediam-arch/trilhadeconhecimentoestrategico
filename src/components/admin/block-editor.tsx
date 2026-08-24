import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { BlockContent, BlockMeta, BlockType, LessonBlock } from "@/lib/api";
import { BLOCK_LABELS } from "@/lib/cms";
import { purgeFilesForBlocks, registerFile } from "@/lib/files";
import { formatSize, type FileKind, type LessonContext, type UploadResult } from "@/lib/uploads";
import { blockDurationSeconds, formatDuration, formatWorkloadShort } from "@/lib/workload";
import { FileUploader } from "@/components/admin/file-uploader";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { BlockRenderer } from "@/components/lesson/block-renderer";
import { ConfirmDelete } from "@/components/common/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UploadFieldProps {
  block: LessonBlock;
  content: BlockContent;
  kind: FileKind;
  extensions?: string[];
  context: LessonContext;
  allowUrl?: boolean;
  onChange: (patch: BlockContent) => void;
  onMeta?: (patch: BlockMeta) => void;
  onBusyChange?: (busy: boolean) => void;
}

function UploadField({
  block,
  content,
  kind,
  extensions,
  context,
  allowUrl = true,
  onChange,
  onMeta,
  onBusyChange,
}: UploadFieldProps) {
  const handleUploaded = async (up: UploadResult) => {
    await registerFile(block.id, up);
    // remove versões anteriores do bloco (banco + storage) para evitar órfãos
    await purgeFilesForBlocks([block.id], up.path);
    onChange({
      ...content,
      path: up.path,
      nome: up.nome,
      mime: up.mime,
      tamanho: up.tamanho,
      url: "",
    });
    if (up.durationSeconds) onMeta?.({ duration_seconds: up.durationSeconds });
    toast.success(content.path ? "Arquivo substituído com sucesso." : "Arquivo enviado com sucesso.");
  };

  const excluir = async () => {
    try {
      await purgeFilesForBlocks([block.id]);
      onChange({ ...content, path: "", nome: "", mime: "", tamanho: 0 });
      onMeta?.({ duration_seconds: null });
      toast.success("Arquivo excluído com sucesso.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir o arquivo.");
    }
  };

  return (
    <div className="space-y-3">
      {content.path ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{content.nome || content.path}</p>
            <p className="text-xs text-muted-foreground">
              {content.mime || "arquivo"} · {formatSize(content.tamanho)}
            </p>
          </div>
          <ConfirmDelete
            title="Excluir este arquivo?"
            description="Essa ação removerá o arquivo permanentemente."
            onConfirm={() => void excluir()}
          >
            <Button type="button" size="sm" variant="ghost" className="text-destructive">
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          </ConfirmDelete>
        </div>
      ) : null}

      <FileUploader
        kind={kind}
        {...(extensions ? { extensions } : {})}
        context={context}
        onUploaded={handleUploaded}
        onError={(m) => toast.error(m)}
        {...(onBusyChange ? { onBusyChange } : {})}
      />

      {allowUrl ? (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Ou informe uma URL pública</Label>
          <Input
            value={content.url ?? ""}
            placeholder="https://…"
            onChange={(e) => onChange({ ...content, url: e.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}

function Fields({
  block,
  content,
  context,
  onChange,
  onMeta,
  onBusyChange,
}: {
  block: LessonBlock;
  content: BlockContent;
  context: LessonContext;
  onChange: (patch: BlockContent) => void;
  onMeta?: (patch: BlockMeta) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  switch (block.tipo) {
    case "titulo":
    case "subtitulo":
      return (
        <Input
          value={content.texto ?? ""}
          placeholder={block.tipo === "titulo" ? "Título da seção" : "Subtítulo"}
          onChange={(e) => onChange({ ...content, texto: e.target.value })}
        />
      );
    case "texto":
      return (
        <RichTextEditor
          value={content.html ?? content.texto ?? ""}
          onChange={(html) => onChange({ ...content, html })}
        />
      );
    case "lista":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              id={`ord-${block.id}`}
              checked={Boolean(content.ordenada)}
              onCheckedChange={(v) => onChange({ ...content, ordenada: v })}
            />
            <Label htmlFor={`ord-${block.id}`} className="text-sm font-normal">
              Lista numerada
            </Label>
          </div>
          <div className="space-y-2">
            {(content.itens ?? [""]).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={item}
                  placeholder={`Item ${i + 1}`}
                  onChange={(e) => {
                    const itens = [...(content.itens ?? [""])];
                    itens[i] = e.target.value;
                    onChange({ ...content, itens });
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remover item"
                  onClick={() => {
                    const itens = (content.itens ?? []).filter((_, idx) => idx !== i);
                    onChange({ ...content, itens });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange({ ...content, itens: [...(content.itens ?? []), ""] })}
          >
            <Plus className="h-4 w-4" /> Adicionar item
          </Button>
        </div>
      );
    case "citacao":
      return (
        <div className="space-y-2">
          <Textarea
            value={content.texto ?? ""}
            placeholder="Texto da citação"
            rows={3}
            onChange={(e) => onChange({ ...content, texto: e.target.value })}
          />
          <Input
            value={content.autor ?? ""}
            placeholder="Autor (opcional)"
            onChange={(e) => onChange({ ...content, autor: e.target.value })}
          />
        </div>
      );
    case "destaque":
      return (
        <div className="space-y-2">
          <Select
            value={content.variante ?? "dica"}
            onValueChange={(v) => onChange({ ...content, variante: v as NonNullable<BlockContent["variante"]> })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estilo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Informação</SelectItem>
              <SelectItem value="dica">Dica</SelectItem>
              <SelectItem value="atencao">Atenção</SelectItem>
              <SelectItem value="importante">Importante</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={content.titulo ?? ""}
            placeholder="Título do destaque (opcional)"
            onChange={(e) => onChange({ ...content, titulo: e.target.value })}
          />
          <Textarea
            value={content.texto ?? ""}
            placeholder="Conteúdo do destaque"
            rows={3}
            onChange={(e) => onChange({ ...content, texto: e.target.value })}
          />
        </div>
      );
    case "youtube":
      return (
        <div className="space-y-2">
          <Input
            value={content.url ?? ""}
            placeholder="https://www.youtube.com/watch?v=…"
            onChange={(e) => onChange({ ...content, url: e.target.value })}
          />
          <Input
            value={content.nome ?? ""}
            placeholder="Título do vídeo (opcional)"
            onChange={(e) => onChange({ ...content, nome: e.target.value })}
          />
        </div>
      );
    case "link":
      return (
        <div className="space-y-2">
          <Input
            value={content.url ?? ""}
            placeholder="https://…"
            onChange={(e) => onChange({ ...content, url: e.target.value })}
          />
          <Input
            value={content.rotulo ?? ""}
            placeholder="Rótulo do link"
            onChange={(e) => onChange({ ...content, rotulo: e.target.value })}
          />
          <Input
            value={content.descricao ?? ""}
            placeholder="Descrição (opcional)"
            onChange={(e) => onChange({ ...content, descricao: e.target.value })}
          />
        </div>
      );
    case "imagem":
      return (
        <div className="space-y-3">
          <UploadField
            block={block}
            content={content}
            kind="imagem"
            context={context}
            onChange={onChange}
            {...(onBusyChange ? { onBusyChange } : {})}
          />
          <Input
            value={content.legenda ?? ""}
            placeholder="Legenda (opcional)"
            onChange={(e) => onChange({ ...content, legenda: e.target.value })}
          />
        </div>
      );
    case "pdf":
      return (
        <div className="space-y-3">
          <UploadField
            block={block}
            content={content}
            kind="documento"
            extensions={["pdf"]}
            context={context}
            onChange={onChange}
            {...(onBusyChange ? { onBusyChange } : {})}
          />
          <Input
            value={content.nome ?? ""}
            placeholder="Nome exibido (opcional)"
            onChange={(e) => onChange({ ...content, nome: e.target.value })}
          />
        </div>
      );
    case "documento":
      return (
        <div className="space-y-3">
          <UploadField
            block={block}
            content={content}
            kind="documento"
            extensions={["docx", "pptx", "xlsx", "pdf"]}
            context={context}
            allowUrl={false}
            onChange={onChange}
            {...(onBusyChange ? { onBusyChange } : {})}
          />
          <Input
            value={content.descricao ?? ""}
            placeholder="Descrição (opcional)"
            onChange={(e) => onChange({ ...content, descricao: e.target.value })}
          />
        </div>
      );
    case "video": {
      const fonte = content.fonte ?? (content.url && !content.path ? "externo" : "upload");
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Origem do vídeo</Label>
            <Select
              value={fonte}
              onValueChange={(v) => onChange({ ...content, fonte: v as "upload" | "externo" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upload">Upload de vídeo (MP4)</SelectItem>
                <SelectItem value="externo">Vídeo externo (URL)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {fonte === "upload" ? (
            <UploadField
              block={block}
              content={content}
              kind="video"
              context={context}
              allowUrl={false}
              onChange={onChange}
              {...(onMeta ? { onMeta } : {})}
              {...(onBusyChange ? { onBusyChange } : {})}
            />
          ) : (
            <Input
              value={content.url ?? ""}
              placeholder="https://…/video.mp4"
              onChange={(e) => onChange({ ...content, url: e.target.value })}
            />
          )}
          <Input
            value={content.poster ?? ""}
            placeholder="URL do poster (opcional)"
            onChange={(e) => onChange({ ...content, poster: e.target.value })}
          />
          <Input
            value={content.nome ?? ""}
            placeholder="Nome exibido (opcional)"
            onChange={(e) => onChange({ ...content, nome: e.target.value })}
          />
        </div>
      );
    }
    default:
      return null;
  }
}

function WorkloadFields({
  block,
  onMetaChange,
}: {
  block: LessonBlock;
  onMetaChange: (meta: BlockMeta) => void;
}) {
  const conta = block.count_for_workload !== false;
  const real = block.duration_seconds ?? 0;
  const estimadoMin = Math.round((block.estimated_duration_seconds ?? 0) / 60);
  const [minutos, setMinutos] = useState(estimadoMin ? String(estimadoMin) : "");

  useEffect(() => {
    setMinutos(estimadoMin ? String(estimadoMin) : "");
  }, [estimadoMin]);

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-dashed border-border p-3">
      <div className="flex items-center gap-2">
        <Switch
          id={`wl-${block.id}`}
          checked={conta}
          onCheckedChange={(v) => onMetaChange({ count_for_workload: v })}
        />
        <Label htmlFor={`wl-${block.id}`} className="text-sm font-normal">
          Participa da carga horária
        </Label>
      </div>

      {real > 0 ? (
        <p className="text-xs text-muted-foreground">
          Duração detectada automaticamente: <strong>{formatDuration(real)}</strong> — não é
          possível editar manualmente a duração real do vídeo.
        </p>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor={`est-${block.id}`} className="text-xs text-muted-foreground">
            Tempo estimado (minutos)
          </Label>
          <Input
            id={`est-${block.id}`}
            type="number"
            min={0}
            max={600}
            className="max-w-40"
            value={minutos}
            disabled={!conta}
            onChange={(e) => setMinutos(e.target.value)}
            onBlur={() => {
              const value = Math.max(0, Math.min(600, Number(minutos) || 0));
              onMetaChange({ estimated_duration_seconds: value * 60 });
            }}
          />
          {block.tipo === "youtube" ? (
            <p className="text-xs text-muted-foreground">
              Duração não identificada automaticamente — informe o tempo estimado.
            </p>
          ) : null}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Carga horária deste bloco: <strong>{formatWorkloadShort(blockDurationSeconds(block))}</strong>
      </p>
    </div>
  );
}

interface BlockCardProps {
  block: LessonBlock;
  index: number;
  total: number;
  context: LessonContext;
  dragProps: Record<string, unknown>;
  onChange: (conteudo: BlockContent) => void;
  onMetaChange: (meta: BlockMeta) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBusyChange?: (busy: boolean) => void;
}

export function BlockCard({
  block,
  index,
  total,
  context,
  dragProps,
  onChange,
  onMetaChange,
  onMove,
  onDuplicate,
  onDelete,
  onBusyChange,
}: BlockCardProps) {
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const content = (block.conteudo ?? {}) as BlockContent;

  const marcarBusy = (v: boolean) => {
    setBusy(v);
    onBusyChange?.(v);
  };

  return (
    <li {...dragProps} className={`surface p-4 ${(dragProps['className'] as string) ?? ""}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {index + 1}. {BLOCK_LABELS[block.tipo]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? "Editar" : "Pré-visualizar"}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Mover para cima"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Mover para baixo"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Duplicar bloco" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
          </Button>
          <ConfirmDelete
            title="Excluir este bloco?"
            description="Os arquivos vinculados a ele também serão removidos permanentemente."
            onConfirm={onDelete}
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Excluir bloco"
              className="text-destructive"
              disabled={busy}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </ConfirmDelete>
        </div>
      </div>
      {busy ? (
        <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <X className="hidden h-3 w-3" aria-hidden />
          Upload em andamento — aguarde para concluir a edição do bloco.
        </p>
      ) : null}
      {preview ? (
        <div className="rounded-xl border border-dashed border-border p-4">
          <BlockRenderer block={{ ...block, conteudo: content }} />
        </div>
      ) : (
        <>
          <Fields
            block={block}
            content={content}
            context={context}
            onChange={onChange}
            onMeta={onMetaChange}
            onBusyChange={marcarBusy}
          />
          <WorkloadFields block={block} onMetaChange={onMetaChange} />
        </>
      )}
    </li>
  );
}
