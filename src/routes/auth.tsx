import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Trilha Ongoing" },
      {
        name: "description",
        content: "Acesse a plataforma de treinamento corporativo Trilha de Conhecimento Estratégico.",
      },
      { property: "og:title", content: "Entrar — Trilha Ongoing" },
      {
        property: "og:description",
        content: "Acesse a plataforma de treinamento corporativo da Ongoing.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(false);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [novaSenha, setNovaSenha] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && session && !recovery) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, recovery, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    toast.success("Bem-vindo de volta!");
    void navigate({ to: "/dashboard", replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível criar a conta", { description: error.message });
      return;
    }
    toast.success("Conta criada", { description: "Verifique seu e-mail para confirmar o acesso." });
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setBusy(false);
    if (error) {
      toast.error("Erro ao enviar e-mail", { description: error.message });
      return;
    }
    toast.success("E-mail enviado", { description: "Confira sua caixa de entrada para redefinir a senha." });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setBusy(false);
    if (error) {
      toast.error("Erro ao atualizar senha", { description: error.message });
      return;
    }
    setRecovery(false);
    toast.success("Senha atualizada com sucesso");
    void navigate({ to: "/dashboard", replace: true });
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Erro ao entrar com Google");
      return;
    }
    if (result.redirected) return;
    setBusy(false);
    void navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hero-gradient hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/15">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-display text-sm font-semibold">Trilha Ongoing</span>
        </Link>
        <div className="max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            Conhecimento estratégico, organizado em uma trilha só.
          </h2>
          <p className="mt-4 text-sm text-primary-foreground/75">
            Acesse módulos, aulas e materiais e acompanhe sua evolução em tempo real.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} Ongoing</p>
      </div>

      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-md">
          {recovery ? (
            <div className="surface p-8">
              <h1 className="text-xl font-semibold">Definir nova senha</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha uma nova senha para sua conta.
              </p>
              <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nova-senha">Nova senha</Label>
                  <Input
                    id="nova-senha"
                    type="password"
                    required
                    minLength={6}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar senha
                </Button>
              </form>
            </div>
          ) : (
            <div className="surface p-8">
              <h1 className="font-display text-2xl font-semibold">Acessar plataforma</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Entre com sua conta corporativa para continuar.
              </p>

              <Tabs defaultValue="login" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar conta</TabsTrigger>
                  <TabsTrigger value="reset">Recuperar</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-6 space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="voce@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senha">Senha</Label>
                      <Input
                        id="senha"
                        type="password"
                        required
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Entrar
                    </Button>
                  </form>

                  <div className="relative py-1 text-center">
                    <span className="relative z-10 bg-card px-3 text-xs uppercase tracking-wide text-muted-foreground">
                      ou
                    </span>
                    <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogle}
                    disabled={busy}
                  >
                    Continuar com Google
                  </Button>
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome completo</Label>
                      <Input
                        id="nome"
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-signup">E-mail</Label>
                      <Input
                        id="email-signup"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senha-signup">Senha</Label>
                      <Input
                        id="senha-signup"
                        type="password"
                        required
                        minLength={6}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Criar conta
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="reset" className="mt-6">
                  <form onSubmit={handleReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-reset">E-mail cadastrado</Label>
                      <Input
                        id="email-reset"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Enviar link de
                      recuperação
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
