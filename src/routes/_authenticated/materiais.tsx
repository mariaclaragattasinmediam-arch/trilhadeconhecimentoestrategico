import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileStack } from "lucide-react";
import { api, qk } from "@/lib/api";
import { formatBytes, getSignedUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/page-parts";

export const Route = createFileRoute("/_authenticated/materiais")({
  head: () => ({
    meta: [
      { title: "Materiais — Trilha Ongoing" },
      { name: "description", content: "Materiais de apoio das aulas: PDFs, vídeos e documentos." },
      { property: "og:title", content: "Materiais — Trilha Ongoing" },
      { property: "og:description", content: "Materiais de apoio das aulas da trilha Ongoing." },
    ],
  }),
  component: MateriaisPage,
});

function MateriaisPage() {
  const files = useQuery({ queryKey: qk.files, queryFn: api.listFiles });

  const abrir = async (path: string | null) => {
    if (!path) return;
    const url = await getSignedUrl(path);
    window.open(url, "_blank", "noopener");
  };

  return (
    <>
      <PageHeader title="Materiais" description="Baixe os arquivos de apoio das aulas." />
      {files.isLoading ? (
        <LoadingRows />
      ) : (files.data ?? []).length === 0 ? (
        <EmptyState icon={FileStack} title="Nenhum material disponível" />
      ) : (
        <div className="surface divide-y divide-border">
          {files.data!.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{f.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {f.tipo} · {formatBytes(f.tamanho)}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void abrir(f.path)}>
                <Download className="h-4 w-4" /> Abrir
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
