import { supabase } from "@/integrations/supabase/client";
import { BUCKET } from "@/lib/storage";

export type FileKind = "imagem" | "documento" | "video";

interface KindSpec {
  label: string;
  extensions: string[];
  mimes: string[];
  maxSize: number;
  accept: string;
}

const MB = 1024 * 1024;

export const FILE_KINDS: Record<FileKind, KindSpec> = {
  imagem: {
    label: "Imagem",
    extensions: ["png", "jpg", "jpeg", "webp"],
    mimes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
    maxSize: 10 * MB,
    accept: ".png,.jpg,.jpeg,.webp",
  },
  documento: {
    label: "Documento",
    extensions: ["pdf", "docx", "pptx", "xlsx"],
    mimes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    maxSize: 30 * MB,
    accept: ".pdf,.docx,.pptx,.xlsx",
  },
  video: {
    label: "Vídeo",
    extensions: ["mp4"],
    mimes: ["video/mp4"],
    maxSize: 500 * MB,
    accept: ".mp4",
  },
};

/** Extensões específicas por bloco (subconjunto de um kind). */
export interface UploadRules {
  kind: FileKind;
  extensions?: string[];
  maxSize?: number;
  accept?: string;
}

export function rulesFor(kind: FileKind, extensions?: string[]): UploadRules {
  const spec = FILE_KINDS[kind];
  const exts = extensions ?? spec.extensions;
  return {
    kind,
    extensions: exts,
    maxSize: spec.maxSize,
    accept: exts.map((e) => `.${e}`).join(","),
  };
}

export function fileExtension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function formatSize(bytes?: number | null) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

/** Nome seguro para o Storage, preservando a extensão original. */
export function safeStorageName(name: string) {
  const ext = fileExtension(name);
  const base = ext ? name.slice(0, name.length - ext.length - 1) : name;
  const clean = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());
  return `${clean || "arquivo"}-${uuid}${ext ? `.${ext}` : ""}`;
}

export interface LessonContext {
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
}

export function buildStoragePath(ctx: LessonContext, fileName: string) {
  const parts = [
    "courses",
    ctx.courseId || "sem-curso",
    "modules",
    ctx.moduleId || "sem-modulo",
    "lessons",
    ctx.lessonId || "sem-aula",
    safeStorageName(fileName),
  ];
  return parts.join("/");
}

/** Validação de extensão, MIME type, tamanho e nome antes do upload. */
export function validateFile(file: File, rules: UploadRules): string | null {
  const spec = FILE_KINDS[rules.kind];
  const exts = rules.extensions ?? spec.extensions;
  const max = rules.maxSize ?? spec.maxSize;

  if (!file.name || file.name.trim().length === 0) return "Nome de arquivo inválido.";
  const ext = fileExtension(file.name);
  if (!ext || !exts.includes(ext)) {
    return `Tipo de arquivo não permitido. Formatos aceitos: ${exts.join(", ").toUpperCase()}.`;
  }
  if (file.type && !spec.mimes.includes(file.type.toLowerCase())) {
    return "Tipo de arquivo não permitido (conteúdo incompatível com a extensão).";
  }
  if (file.size === 0) return "O arquivo está vazio.";
  if (file.size > max) {
    return `Este arquivo excede o limite permitido de ${formatSize(max)}.`;
  }
  return null;
}

export interface UploadResult {
  path: string;
  nome: string;
  mime: string;
  tamanho: number;
  /** Duração real detectada (apenas vídeos). */
  durationSeconds?: number;
}

interface UploadOptions {
  onProgress?: (percent: number) => void;
  registerAbort?: (abort: () => void) => void;
}

/**
 * Lê a duração real de um vídeo local antes do upload, usando o elemento
 * <video> do navegador. Retorna null quando não for possível detectar.
 */
export function probeVideoDuration(file: File): Promise<number | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const finish = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timeout = setTimeout(() => finish(null), 15000);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const d = video.duration;
      finish(Number.isFinite(d) && d > 0 ? Math.round(d) : null);
    };
    video.onerror = () => {
      clearTimeout(timeout);
      finish(null);
    };
    video.src = url;
  });
}

/**
 * Upload direto ao Storage via XHR para termos progresso real e cancelamento.
 * Usa a sessão do usuário — as políticas do bucket continuam valendo.
 */
export async function uploadToStorage(
  file: File,
  path: string,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente para enviar arquivos.");

  const baseUrl = import.meta.env['VITE_SUPABASE_URL'] as string;
  const apiKey = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string;
  const endpoint = `${baseUrl}/storage/v1/object/${BUCKET}/${path}`;
  const mime = file.type || "application/octet-stream";

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", apiKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "3600");
    xhr.setRequestHeader("content-type", mime);

    options.registerAbort?.(() => xhr.abort());

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) options.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onabort = () => reject(new Error("Upload cancelado."));
    xhr.onerror = () => reject(new Error("Falha de rede durante o upload."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let message = "Não foi possível enviar o arquivo.";
      try {
        const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        message = parsed.message || parsed.error || message;
      } catch {
        /* resposta sem json */
      }
      reject(new Error(message));
    };
    xhr.send(file);
  });

  const result: UploadResult = { path, nome: file.name, mime, tamanho: file.size };
  if (mime.startsWith("video/")) {
    const duration = await probeVideoDuration(file);
    if (duration) result.durationSeconds = duration;
  }
  return result;
}

export async function removeFromStorage(paths: string[]) {
  const clean = paths.filter(Boolean);
  if (clean.length === 0) return;
  await supabase.storage.from(BUCKET).remove(clean);
}
