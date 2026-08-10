import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import {
  buildStoragePath,
  formatSize,
  rulesFor,
  uploadToStorage,
  validateFile,
  type FileKind,
  type LessonContext,
  type UploadResult,
} from "@/lib/uploads";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface FileUploaderProps {
  kind: FileKind;
  extensions?: string[];
  context: LessonContext;
  multiple?: boolean;
  disabled?: boolean;
  onUploaded: (file: UploadResult) => void | Promise<void>;
  onError?: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
}

type Status = "idle" | "uploading" | "success" | "error";

export function FileUploader({
  kind,
  extensions,
  context,
  multiple = false,
  disabled,
  onUploaded,
  onError,
  onBusyChange,
}: FileUploaderProps) {
  const rules = rulesFor(kind, extensions);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [atual, setAtual] = useState<{ nome: string; tamanho: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (files: File[]) => {
    const lista = multiple ? files : files.slice(0, 1);
    onBusyChange?.(true);
    for (const file of lista) {
      const invalido = validateFile(file, rules);
      setAtual({ nome: file.name, tamanho: file.size });
      if (invalido) {
        setStatus("error");
        setErro(invalido);
        onError?.(invalido);
        continue;
      }
      setStatus("uploading");
      setProgress(0);
      setErro(null);
      try {
        const path = buildStoragePath(context, file.name);
        const result = await uploadToStorage(file, path, {
          onProgress: setProgress,
          registerAbort: (abort) => {
            abortRef.current = abort;
          },
        });
        await onUploaded(result);
        setStatus("success");
        setProgress(100);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Não foi possível enviar o arquivo.";
        setStatus("error");
        setErro(message);
        onError?.(message);
      } finally {
        abortRef.current = null;
      }
    }
    onBusyChange?.(false);
  };

  const label =
    kind === "video"
      ? "Enviando vídeo"
      : kind === "imagem"
        ? "Enviando imagem"
        : "Enviando arquivo";

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          const files = Array.from(e.dataTransfer.files);
          if (files.length) void enviar(files);
        }}
        className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={rules.accept}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) void enviar(files);
            e.target.value = "";
          }}
        />
        <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Arraste um arquivo ou clique para selecionar</p>
        <p className="text-xs text-muted-foreground">
          {(rules.extensions ?? []).join(", ").toUpperCase()} · até {formatSize(rules.maxSize)}
        </p>
      </div>

      {status === "uploading" && atual ? (
        <div className="space-y-1.5 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              <span className="truncate">
                {label}… {progress}%
              </span>
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => abortRef.current?.()}
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
          </div>
          <Progress value={progress} className="h-1.5" />
          <p className="truncate text-xs text-muted-foreground">
            {atual.nome} · {formatSize(atual.tamanho)}
          </p>
        </div>
      ) : null}

      {status === "error" && erro ? <p className="text-xs text-destructive">{erro}</p> : null}
      {status === "success" ? (
        <p className="text-xs text-muted-foreground">Arquivo enviado com sucesso.</p>
      ) : null}
    </div>
  );
}
