import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/common/page-parts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  accessKeys,
  createGroup,
  listAllGroupCourses,
  listAllMemberships,
  listGroups,
  updateGroup,
} from "@/lib/access";

export const Route = createFileRoute("/_authenticated/admin/grupos/")({
  head: () => ({
    meta: [
      { title: "Grupos de acesso — Trilha InMediam" },
      {
        name: "description",
        content: "Crie grupos e defina quais cursos cada área da empresa pode acessar.",
      },
      { property: "og:title", content: "Grupos de acesso — Trilha InMediam" },
      { property: "og:description", content: "Gestão de grupos e permissões de cursos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GruposPage,
});

function GruposPage() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const grupos = useQuery({ queryKey: accessKeys.groups, queryFn: listGroups });
  const membros = useQuery({ queryKey: accessKeys.memberships, queryFn: listAllMemberships });
  const cursos = useQuery({ queryKey: ["access", "all-group-courses"], queryFn: listAllGroupCourses });

  const criar = useMutation({
    mutationFn: () => createGroup({ name: nome.trim(), descricao: descricao.trim() } as never),
    onSuccess: () => {
      setAberto(false);
      setNome("");
      setDescricao("");
      void qc.invalidateQueries({ queryKey: accessKeys.groups });
      toast.success("Grupo criado");
    },
    onError: (e: Error) => {
      toast.error("Não foi possível criar o grupo", { description: e.message });
    },
  });

  const alternar = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateGroup(id, { active }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessKeys.groups });
    },
    onError: (e: Error) => {
      toast.error("Não foi possível atualizar", { description: e.message });
    },
  });

  return (
    <>
      <PageHeader
        title="Grupos de acesso"
        description="Defina quais áreas da empresa acessam cada curso."
        action={
          <Dialog open={aberto} onOpenChange={setAberto}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Novo grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo grupo</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Nome do grupo (ex: Comercial)"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
                <Textarea
                  placeholder="Descrição (opcional)"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  disabled={!nome.trim() || criar.isPending}
                  onClick={() => {
                    criar.mutate();
                  }}
                >
                  Criar grupo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {grupos.isLoading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : (grupos.data ?? []).length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Users2}
            title="Nenhum grupo criado"
            description="Crie grupos como Comercial, Financeiro ou Liderança para controlar o acesso aos cursos."
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {(grupos.data ?? []).map((g) => {
            const qtdUsuarios = (membros.data ?? []).filter((m) => m.group_id === g.id).length;
            const qtdCursos = (cursos.data ?? []).filter((c) => c.group_id === g.id).length;
            return (
              <li
                key={g.id}
                className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{g.name}</p>
                    <Badge variant={g.active ? "default" : "secondary"}>
                      {g.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {g.description ? (
                    <p className="truncate text-sm text-muted-foreground">{g.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {qtdUsuarios} usuário(s) · {qtdCursos} curso(s)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={g.active}
                      onCheckedChange={(v) => {
                        alternar.mutate({ id: g.id, active: v });
                      }}
                      aria-label="Ativar grupo"
                    />
                    <span className="text-xs text-muted-foreground">Ativo</span>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/admin/grupos/$groupId" params={{ groupId: g.id }}>
                      <Settings2 className="mr-2 h-4 w-4" /> Gerenciar
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
