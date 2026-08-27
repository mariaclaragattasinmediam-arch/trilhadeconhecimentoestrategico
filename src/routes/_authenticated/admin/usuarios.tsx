import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, ShieldCheck, Shield, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/common/page-parts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  accessKeys,
  listAllDirectCourses,
  listAllGroupCourses,
  listAllMemberships,
  listGroups,
  setUserDirectCourses,
  setUserGroups,
} from "@/lib/access";
import { listCoursesAdmin } from "@/lib/cms";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários e acessos — Trilha InMediam" },
      {
        name: "description",
        content: "Gerencie administradores, grupos e cursos liberados para cada colaborador.",
      },
      { property: "og:title", content: "Usuários e acessos — Trilha InMediam" },
      { property: "og:description", content: "Grupos, acessos diretos e permissões da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsuariosPage,
});

interface Row {
  id: string;
  nome: string;
  email: string;
  isAdmin: boolean;
}

function UsuariosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Row | null>(null);

  const usuarios = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: async (): Promise<Row[]> => {
      const [{ data: profiles, error }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from("profiles").select("id, nome, email").order("nome"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      if (rolesError) throw rolesError;
      const admins = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
      return (profiles ?? []).map((p) => ({
        id: p.id,
        nome: p.nome || p.email,
        email: p.email,
        isAdmin: admins.has(p.id),
      }));
    },
  });

  const grupos = useQuery({ queryKey: accessKeys.groups, queryFn: listGroups });
  const membros = useQuery({ queryKey: accessKeys.memberships, queryFn: listAllMemberships });
  const diretos = useQuery({ queryKey: accessKeys.directCourses, queryFn: listAllDirectCourses });
  const gruposCursos = useQuery({
    queryKey: ["access", "all-group-courses"],
    queryFn: listAllGroupCourses,
  });
  const cursos = useQuery({ queryKey: ["cms", "courses"], queryFn: listCoursesAdmin });

  const alterar = useMutation({
    mutationFn: async ({ id, tornarAdmin }: { id: string; tornarAdmin: boolean }) => {
      if (tornarAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", id)
          .eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["admin-usuarios"] });
      toast.success(vars.tornarAdmin ? "Administrador adicionado" : "Acesso administrativo removido");
    },
    onError: (e: Error) => {
      toast.error("Não foi possível alterar o perfil", { description: e.message });
    },
  });

  const termo = busca.trim().toLowerCase();
  const lista = (usuarios.data ?? []).filter(
    (u) => !termo || u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo),
  );
  const totalAdmins = (usuarios.data ?? []).filter((u) => u.isAdmin).length;

  function gruposDoUsuario(userId: string) {
    const ids = (membros.data ?? []).filter((m) => m.user_id === userId).map((m) => m.group_id);
    return (grupos.data ?? []).filter((g) => ids.includes(g.id));
  }

  function cursosDoUsuario(userId: string) {
    const ids = new Set<string>();
    const gruposIds = (membros.data ?? [])
      .filter((m) => m.user_id === userId)
      .map((m) => m.group_id);
    (gruposCursos.data ?? [])
      .filter((gc) => gruposIds.includes(gc.group_id))
      .forEach((gc) => ids.add(gc.course_id));
    (diretos.data ?? [])
      .filter((d) => d.user_id === userId)
      .forEach((d) => ids.add(d.course_id));
    (cursos.data ?? [])
      .filter((c) => (c as { visibility?: string }).visibility === "publico")
      .forEach((c) => ids.add(c.id));
    return ids.size;
  }

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Perfis, grupos e cursos liberados para cada colaborador."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Badge variant="secondary">{totalAdmins} administrador(es)</Badge>
      </div>

      {usuarios.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário encontrado"
          description="Os usuários aparecem aqui depois do primeiro acesso à plataforma."
        />
      ) : (
        <ul className="space-y-3">
          {lista.map((u) => {
            const ehVoce = u.id === user?.id;
            const gs = gruposDoUsuario(u.id);
            return (
              <li key={u.id} className="surface flex flex-col gap-3 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {u.nome}{" "}
                      {ehVoce ? <span className="text-muted-foreground">(você)</span> : null}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={u.isAdmin ? "default" : "secondary"}>
                      {u.isAdmin ? (
                        <>
                          <ShieldCheck className="mr-1 h-3 w-3" /> Administrador
                        </>
                      ) : (
                        <>
                          <Shield className="mr-1 h-3 w-3" /> Aluno
                        </>
                      )}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditando(u);
                      }}
                    >
                      <KeyRound className="mr-2 h-4 w-4" /> Gerenciar acessos
                    </Button>
                    <Button
                      size="sm"
                      variant={u.isAdmin ? "outline" : "default"}
                      disabled={alterar.isPending || (ehVoce && u.isAdmin)}
                      onClick={() => {
                        alterar.mutate({ id: u.id, tornarAdmin: !u.isAdmin });
                      }}
                    >
                      {u.isAdmin ? "Remover admin" : "Tornar admin"}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {gs.length === 0 ? (
                    <span>Sem grupos</span>
                  ) : (
                    gs.map((g) => (
                      <Badge key={g.id} variant="secondary">
                        {g.name}
                      </Badge>
                    ))
                  )}
                  <span>· {cursosDoUsuario(u.id)} curso(s) disponíveis</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <GerenciarAcessosDialog
        usuario={editando}
        onClose={() => {
          setEditando(null);
        }}
      />
    </>
  );
}

function GerenciarAcessosDialog({
  usuario,
  onClose,
}: {
  usuario: Row | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const grupos = useQuery({ queryKey: accessKeys.groups, queryFn: listGroups });
  const cursos = useQuery({ queryKey: ["cms", "courses"], queryFn: listCoursesAdmin });
  const membros = useQuery({ queryKey: accessKeys.memberships, queryFn: listAllMemberships });
  const diretos = useQuery({ queryKey: accessKeys.directCourses, queryFn: listAllDirectCourses });

  const [gruposSel, setGruposSel] = useState<string[]>([]);
  const [cursosSel, setCursosSel] = useState<string[]>([]);

  useEffect(() => {
    if (!usuario) return;
    setGruposSel(
      (membros.data ?? []).filter((m) => m.user_id === usuario.id).map((m) => m.group_id),
    );
    setCursosSel(
      (diretos.data ?? []).filter((d) => d.user_id === usuario.id).map((d) => d.course_id),
    );
  }, [usuario, membros.data, diretos.data]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!usuario) return;
      await setUserGroups(usuario.id, gruposSel);
      await setUserDirectCourses(usuario.id, cursosSel);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessKeys.memberships });
      void qc.invalidateQueries({ queryKey: accessKeys.directCourses });
      toast.success("Acessos atualizados");
      onClose();
    },
    onError: (e: Error) => toast.error("Erro ao salvar acessos", { description: e.message }),
  });

  return (
    <Dialog
      open={Boolean(usuario)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar acessos</DialogTitle>
          <DialogDescription>{usuario?.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Grupos</h3>
            {(grupos.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum grupo criado ainda.</p>
            ) : (
              (grupos.data ?? []).map((g) => (
                <label key={g.id} className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={gruposSel.includes(g.id)}
                    onCheckedChange={(v) => {
                      setGruposSel((prev) =>
                        v ? [...prev, g.id] : prev.filter((id) => id !== g.id),
                      );
                    }}
                  />
                  {g.name}
                </label>
              ))
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Acessos diretos a cursos</h3>
            {(cursos.data ?? []).map((c) => (
              <label key={c.id} className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={cursosSel.includes(c.id)}
                  onCheckedChange={(v) => {
                    setCursosSel((prev) =>
                      v ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                    );
                  }}
                />
                <span className="min-w-0 truncate">{c.titulo}</span>
              </label>
            ))}
          </section>
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              salvar.mutate();
            }}
            disabled={salvar.isPending}
          >
            Salvar acessos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
