import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileStack, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteFileRecord, fileKeys, listAllFiles } from "@/lib/files";
import { formatSize } from "@/lib/uploads";
import { getSignedUrl } from "@/lib/storage";
import { ConfirmDelete } from "@/components/common/confirm-delete";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/arquivos")({
  head: () => ({
    meta: [
      { title: "Admin · Arquivos — Trilha Ongoing" },
      {
        name: "description",
        content: "Gerencie os arquivos enviados para as aulas da Trilha Ongoing.",
      },
      { property: "og:title", content: "Admin · Arquivos — Trilha Ongoing" },
      { property: "og:description", content: "Gerenciamento de arquivos da Trilha Ongoing." },
    ],
  }),
  component: AdminArquivos,
});

function AdminArquivos() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const arquivos = useQuery({ queryKey: fileKeys.all, queryFn: listAllFiles });

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const rows = arquivos.data ?? [];
    if (!termo) return rows;
    return rows.filter((f) => f.nome.toLowerCase().includes(termo));
  }, [arquivos.data, busca]);

  const excluir = useMutation({
    mutationFn: (file: { id: string; path: string | null }) => deleteFileRecord(file),
    onSuccess: () => {
      toast.success("Arquivo excluído com sucesso.");
      void queryClient.invalidateQueries({ queryKey: ["cms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const abrir = async (path: string | null) => {
    if (!path) return;
    try {
      const url = await getSignedUrl(path);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o arquivo.");
    }
  };

  const total = (arquivos.data ?? []).reduce((acc, f) => acc + (f.tamanho ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Arquivos"
        description={`Arquivos enviados nas aulas · ${formatSize(total)} armazenados.`}
      />
      <Input
        placeholder="Buscar por nome do arquivo…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="max-w-sm"
      />
      {arquivos.isLoading ? (
        <LoadingRows />
      ) : lista.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="Nenhum arquivo encontrado"
          description="Os arquivos aparecem aqui assim que forem enviados nos blocos das aulas."
        />
      ) : (
        <div className="surface divide-y divide-border">
          {lista.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{f.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {(f.mime_type || f.tipo || "arquivo")} · {formatSize(f.tamanho)} · {f.path}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => void abrir(f.path)}>
                  Abrir
                </Button>
                <ConfirmDelete
                  title="Excluir este arquivo?"
                  description="Essa ação removerá o arquivo permanentemente."
                  onConfirm={() => excluir.mutate({ id: f.id, path: f.path })}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    aria-label="Excluir arquivo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </ConfirmDelete>
              </div>
            </div>
          ))}
        </div>
      )}
      {excluir.isPending ? <Skeleton className="h-1 w-full" /> : null}
    </div>
  );
}
