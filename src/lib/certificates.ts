import { supabase } from "@/integrations/supabase/client";

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  certificate_code: string;
  student_name: string;
  course_name: string;
  workload_minutes: number;
  workload_formatted: string;
  final_score: number;
  completion_date: string;
  issued_at: string;
  pdf_path: string | null;
  verification_status: string;
}

export interface CertificateValidation {
  certificate_code: string;
  student_name: string;
  course_name: string;
  workload_minutes: number;
  workload_formatted: string;
  completion_date: string;
  issued_at: string;
  verification_status: string;
}

export const certificateKeys = {
  mine: ["certificates", "mine"] as const,
  all: ["certificates", "all"] as const,
  validate: (code: string) => ["certificates", "validate", code] as const,
};

export async function listMyCertificates(userId: string): Promise<Certificate[]> {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Certificate[];
}

export async function listAllCertificates(): Promise<Certificate[]> {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .order("issued_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Certificate[];
}

/** Consulta pública de autenticidade (usada pelo QR Code do certificado). */
export async function validateCertificate(code: string): Promise<CertificateValidation | null> {
  const { data, error } = await supabase.rpc("validate_certificate", { _code: code.trim() });
  if (error) throw new Error(error.message);
  return ((data as CertificateValidation[])?.[0] ?? null) as CertificateValidation | null;
}

export function formatDateBr(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  return d.toLocaleDateString("pt-BR");
}
