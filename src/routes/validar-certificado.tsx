import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, GraduationCap, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { certificateKeys, formatDateBr, validateCertificate } from "@/lib/certificates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/validar-certificado")({
  validateSearch: (search: Record<string, unknown>) => ({
    codigo: typeof search["codigo"] === "string" ? (search["codigo"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Validar Certificado — InMediam" },
      {
        name: "description",
        content:
          "Verifique a autenticidade de um certificado da Trilha de Conhecimento Estratégico – Ongoing.",
      },
      { property: "og:title", content: "Validar Certificado — InMediam" },
      {
        property: "og:description",
        content: "Consulta pública de autenticidade de certificados InMediam.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ValidarCertificadoPage,
});

function ValidarCertificadoPage() {
  const { codigo } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [input, setInput] = useState(codigo);

  const consulta = useQuery({
    queryKey: certificateKeys.validate(codigo),
    queryFn: () => validateCertificate(codigo),
    enabled: codigo.trim().length > 0,
  });

  const valido = consulta.data && consulta.data.verification_status === "valido";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-display text-sm font-semibold">Trilha Ongoing · InMediam</span>
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <section className="surface space-y-4 p-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Validação de certificado</h1>
          <p className="text-sm text-muted-foreground">
            Informe o código impresso no certificado (ex.: INM-2026-000001) para conferir sua
            autenticidade.
          </p>
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({ search: { codigo: input.trim() } });
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="INM-2026-000001"
            className="font-mono"
          />
          <Button type="submit">
            <Search className="mr-2 h-4 w-4" /> Verificar
          </Button>
        </form>
      </section>

      {consulta.isFetching ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : codigo && consulta.isSuccess ? (
        valido ? (
          <section className="surface space-y-4 border-success/40 p-6">
            <div className="flex items-center gap-3 text-success">
              <ShieldCheck className="h-6 w-6" />
              <h2 className="font-display text-lg font-semibold">Certificado válido</h2>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Aluno" value={consulta.data!.student_name} />
              <Info label="Formação" value={consulta.data!.course_name} />
              <Info label="Carga horária" value={consulta.data!.workload_formatted} />
              <Info label="Conclusão" value={formatDateBr(consulta.data!.completion_date)} />
              <Info label="Emissão" value={formatDateBr(consulta.data!.issued_at)} />
              <Info label="Código" value={consulta.data!.certificate_code} mono />
            </dl>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Award className="h-3.5 w-3.5" /> Documento emitido pela InMediam · Trilha de
              Conhecimento Estratégico – Ongoing.
            </p>
          </section>
        ) : (
          <section className="surface flex items-start gap-3 border-destructive/40 p-6">
            <ShieldAlert className="h-6 w-6 shrink-0 text-destructive" />
            <div>
              <h2 className="font-display text-lg font-semibold">
                {consulta.data ? "Certificado revogado" : "Certificado não encontrado"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {consulta.data
                  ? "Este certificado foi revogado e não possui validade."
                  : "Nenhum certificado corresponde ao código informado. Confira e tente novamente."}
              </p>
            </div>
          </section>
        )
      ) : null}
    </main>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`font-medium ${mono ? "font-mono text-sm" : ""}`}>{value}</dd>
    </div>
  );
}
