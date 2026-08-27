import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, Trash2, UserPlus, Users2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/page-parts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  accessKeys,
  addGroupMember,
  deleteGroup,
  getGroup,
  listGroupCourseIds,
  listGroupMembers,
  removeGroupMember,
  setGroupCourses,
  updateGroup,
} from "@/lib/access";
import { listCoursesAdmin } from "@/lib/cms";

export const Route = createFileRoute("/_authenticated/admin/grupos/$groupId")({
  head: () => ({
    meta: [
      { title: "Configurar grupo — Trilha InMediam" },
      {
        name: "description",
        content: "Configure os cursos liberados e os usuários que pertencem a este grupo.",
      },
      { property: "og:title", content: "Configurar grupo — Trilha InMediam" },
      { property: "og:description", content: "Cursos e usuários do grupo de acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GrupoDetalhePage,
});

function GrupoDetalhePage() {
  const { groupId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const grupo = useQuery({ queryKey: accessKeys.group(groupId), queryFn: () => getGroup(groupId) });
  const cursos = useQuery({ queryKey: ["cms", "courses"], queryFn: listCoursesAdmin });
  const cursosDoGrupo = useQuery({
    queryKey: accessKeys.groupCourses(groupId),
    queryFn: () => listGroupCourseIds(groupId),
  });
  const membros = useQuery({
    queryKey: accessKeys.groupMembers(groupId),
    queryFn: () => listGroupMembers(groupId),
  });
  const perfis = useQuery({
    queryKey: ["admin-usuarios-simples"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nome, email").order("nome");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [buscaUsuario, setBuscaUsuario] = useState("");

  useEffect(() => {
    if (grupo.data) {
      setNome(grupo.data.name);
      setDescricao(grupo.data.description);
    }
  }, [grupo.data]);

  useEffect(() => {
    if (cursosDoGrupo.data) setSelecionados(cursosDoGrupo.data);
  }, [cursosDoGrupo.data]);

  const salvarDados = useMutation({
    mutationFn: () => updateGroup(groupId, { name: nome.trim(), description: descricao.trim() }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessKeys.group(groupId) });
      void qc.invalidateQueries({ queryKey: accessKeys.groups });
      toast.success("Grupo atualizado");
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const salvarCursos = useMutation({
    mutationFn: () => setGroupCourses(groupId, selecionados),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessKeys.groupCourses(groupId) });
      toast.success("Cursos do grupo atualizados");
    },
    onError: (e: Error) => toast.error("Erro ao salvar cursos", { description: e.message }),
  });

  const adicionar = useMutation({
    mutationFn: (userId: string) => addGroupMember(groupId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessKeys.groupMembers(groupId) });
      void qc.invalidateQueries({ queryKey: accessKeys.memberships });
      toast.success("Usuário adicionado ao grupo");
    },
    onError: (e: Error) => toast.error("Erro ao adicionar", { description: e.message }),
  });

  const remover = useMutation({
    mutationFn: (userId: string) => removeGroupMember(groupId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessKeys.groupMembers(groupId) });
      void qc.invalidateQueries({ queryKey: accessKeys.memberships });
      toast.success("Usuário removido do grupo");
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: () => deleteGroup(groupId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessKeys.groups });
      toast.success("Grupo excluído");
      void navigate({ to: "/admin/grupos" });
    },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  const membrosIds = useMemo(
    () => new Set((membros.data ?? []).map((m) => m.userId)),
    [membros.data],
  );
  const termo = buscaUsuario.trim().toLowerCase();
  const disponiveis = (perfis.data ?? []).filter(
    (p) =>
      !membrosIds.has(p.id) &&
      termo.length > 0 &&
      ((p.nome ?? "").toLowerCase().includes(termo) || p.email.toLowerCase().includes(termo)),
  );

  if (grupo.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={grupo.data?.name ?? "Grupo"}
        description="Cursos liberados e usuários que pertencem a este grupo."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/grupos">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do grupo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" />
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={grupo.data?.active ?? true}
                onCheckedChange={(v) => {
                  updateGroup(groupId, { active: v })
                    .then(() => qc.invalidateQueries({ queryKey: accessKeys.group(groupId) }))
                    .catch((e: Error) => toast.error(e.message));
                }}
              />
              Grupo ativo
            </label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => {
                  if (confirm("Excluir este grupo? Os acessos concedidos por ele serão perdidos."))
                    excluir.mutate();
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir grupo
              </Button>
              <Button
                onClick={() => {
                  salvarDados.mutate();
                }}
                disabled={salvarDados.isPending}
              >
                Salvar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cursos disponíveis para este grupo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(cursos.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum curso cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {(cursos.data ?? []).map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Checkbox
                    id={`curso-${c.id}`}
                    checked={selecionados.includes(c.id)}
                    onCheckedChange={(v) => {
                      setSelecionados((prev) =>
                        v ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                      );
                    }}
                  />
                  <label htmlFor={`curso-${c.id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                    <span className="block truncate font-medium">{c.titulo}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.modulos} módulos · {c.aulas} aulas
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <Button
            onClick={() => {
              salvarCursos.mutate();
            }}
            disabled={salvarCursos.isPending}
          >
            Salvar alterações
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar usuário por nome ou e-mail para adicionar"
              value={buscaUsuario}
              onChange={(e) => setBuscaUsuario(e.target.value)}
            />
          </div>

          {disponiveis.length > 0 ? (
            <ul className="space-y-2 rounded-xl border p-2">
              {disponiveis.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-2 py-1 text-sm">
                  <span className="min-w-0 truncate">
                    {p.nome || p.email}
                    <span className="ml-2 text-muted-foreground">{p.email}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      adicionar.mutate(p.id);
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" /> Adicionar
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          {(membros.data ?? []).length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users2 className="h-4 w-4" /> Nenhum usuário neste grupo ainda.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {(membros.data ?? []).map((m) => (
                <li key={m.userId} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{m.nome}</span>
                    <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      remover.mutate(m.userId);
                    }}
                  >
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
