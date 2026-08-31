import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

const INTERVALO_MS = 20_000;

/**
 * Mantém as telas do aluno sincronizadas com as liberações feitas pelo admin.
 * Revalida os dados quando a aba volta ao foco e periodicamente enquanto visível.
 */
export function AccessSync() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const revalidar = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void queryClient.invalidateQueries();
    };

    const onFocus = () => revalidar();
    const onVisibility = () => {
      if (document.visibilityState === "visible") revalidar();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(revalidar, INTERVALO_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [queryClient, user]);

  return null;
}
