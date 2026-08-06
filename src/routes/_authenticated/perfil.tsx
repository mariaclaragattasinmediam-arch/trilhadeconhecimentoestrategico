import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-parts";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Trilha Ongoing" },
      { name: "description", content: "Gerencie seus dados de acesso na plataforma Ongoing." },
      { property: "og:title", content: "Perfil — Trilha Ongoing" },
      { property: "og:description", content: "Gerencie seus dados de acesso na plataforma." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { profile, isAdmin, refresh } = useAuth();
  const [nome, setNome] = useState(profile?.nome ?? "");
  const [busy, setBusy] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ nome }).eq("id", profile.id);
    setBusy(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    await refresh();
    toast.success("Perfil atualizado");
  };

  return (
    <>
      <PageHeader title="Perfil" description="Seus dados na plataforma." />
      <form onSubmit={salvar} className="surface max-w-lg space-y-4 p-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{isAdmin ? "Administrador" : "Aluno"}</Badge>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" value={profile?.email ?? ""} disabled />
        </div>
        <Button type="submit" disabled={busy}>
          Salvar alterações
        </Button>
      </form>
    </>
  );
}
