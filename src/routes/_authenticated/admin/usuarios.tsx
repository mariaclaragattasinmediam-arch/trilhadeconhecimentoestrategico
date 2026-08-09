import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, ShieldCheck, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/common/page-parts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários e administradores — Trilha Ongoing" },
      { name: "description", content: "Gerencie quem tem acesso administrativo à Trilha de Conhecimento Ongoing." },
      { property: "og:title", content: "Usuários e administradores — Trilha Ongoing" },
      { property: "og:description", content: "Gerencie quem tem acesso administrativo à plataforma." },
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

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Defina quem tem acesso administrativo à plataforma."
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
            return (
              <li
                key={u.id}
                className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {u.nome} {ehVoce ? <span className="text-muted-foreground">(você)</span> : null}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
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
                    variant={u.isAdmin ? "outline" : "default"}
                    disabled={alterar.isPending || (ehVoce && u.isAdmin)}
                    onClick={() => {
                      alterar.mutate({ id: u.id, tornarAdmin: !u.isAdmin });
                    }}
                  >
                    {u.isAdmin ? "Remover admin" : "Tornar admin"}
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
