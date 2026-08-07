import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { BlockContent, BlockType, LessonBlock } from "@/lib/api";
import { BLOCK_LABELS } from "@/lib/cms";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/storage";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { BlockRenderer } from "@/components/lesson/block-renderer";
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

const accepts: Partial<Record<BlockType, string>> = {
  imagem: ".png,.jpg,.jpeg",
  pdf: ".pdf",
  video: ".mp4",
};

function UploadField({
  block,
  content,
  onChange,
}: {
  block: LessonBlock;
  content: BlockContent;
  onChange: (patch: BlockContent) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (file: File) => {
    setBusy(true);
    try {
      const up = await uploadFile(file, block.tipo);
      onChange({ ...content, path: up.path, nome: up.nome, url: "" });
      await supabase.from("files").insert({
        lesson_block_id: block.id,
        nome: up.nome,
        url: up.path,
        path: up.path,
        tipo: up.tipo,
        tamanho: up.tamanho,
      });
      toast.success("Arquivo enviado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accepts[block.tipo] ?? undefined}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handle(file);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Enviar arquivo
        </Button>
        {content.path ? (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {content.nome || content.path}
            <button
              type="button"
              aria-label="Remover arquivo"
              className="rounded-full p-0.5 hover:bg-muted"
              onClick={() => onChange({ ...content, path: "", nome: "" })}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Ou informe uma URL pública</Label>
        <Input
          value={content.url ?? ""}
          placeholder="https://…"
          onChange={(e) => onChange({ ...content, url: e.target.value })}
        />
      </div>
    </div>
  );
}

function Fields({
  block,
  content,
  onChange,
}: {
  block: LessonBlock;
  content: BlockContent;
  onChange: (patch: BlockContent) => void;
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
          <UploadField block={block} content={content} onChange={onChange} />
          <Input
            value={content.legenda ?? ""}
            placeholder="Legenda (opcional)"
            onChange={(e) => onChange({ ...content, legenda: e.target.value })}
          />
        </div>
      );
    case "pdf":
    case "video":
      return (
        <div className="space-y-3">
          <UploadField block={block} content={content} onChange={onChange} />
          <Input
            value={content.nome ?? ""}
            placeholder="Nome exibido (opcional)"
            onChange={(e) => onChange({ ...content, nome: e.target.value })}
          />
        </div>
      );
    default:
      return null;
  }
}

interface BlockCardProps {
  block: LessonBlock;
  index: number;
  total: number;
  dragProps: Record<string, unknown>;
  onChange: (conteudo: BlockContent) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function BlockCard({
  block,
  index,
  total,
  dragProps,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: BlockCardProps) {
  const [preview, setPreview] = useState(false);
  const content = (block.conteudo ?? {}) as BlockContent;

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
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Excluir bloco"
            className="text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {preview ? (
        <div className="rounded-xl border border-dashed border-border p-4">
          <BlockRenderer block={{ ...block, conteudo: content }} />
        </div>
      ) : (
        <Fields block={block} content={content} onChange={onChange} />
      )}
    </li>
  );
}
