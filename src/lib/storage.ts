import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "materiais";

export const ACCEPT_ALL = ".pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.mp4";

export function formatBytes(bytes?: number | null) {
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

export function slugifyFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  const clean = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${clean || "arquivo"}-${Date.now()}${ext.toLowerCase()}`;
}

export interface UploadedFile {
  path: string;
  nome: string;
  tipo: string;
  tamanho: number;
}

export async function uploadFile(file: File, folder = "geral"): Promise<UploadedFile> {
  const path = `${folder}/${slugifyFileName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { path, nome: file.name, tipo: file.type || "application/octet-stream", tamanho: file.size };
}

export async function getSignedUrl(path: string, expiresIn = 60 * 60 * 24) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function removeFile(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

export function youtubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    let id = "";
    if (parsed.hostname.includes("youtu.be")) id = parsed.pathname.slice(1);
    else if (parsed.pathname.startsWith("/embed/")) id = parsed.pathname.split("/")[2] ?? "";
    else id = parsed.searchParams.get("v") ?? "";
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}
