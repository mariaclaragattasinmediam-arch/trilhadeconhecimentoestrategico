import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common/page-parts";

export const Route = createFileRoute("/_authenticated/admin/aulas")({
  head: () => ({
    meta: [
      { title: "Admin · aulas — Trilha Ongoing" },
      { name: "description", content: "Área administrativa da Trilha de Conhecimento Ongoing." },
      { property: "og:title", content: "Admin · aulas — Trilha Ongoing" },
      { property: "og:description", content: "Área administrativa da Trilha Ongoing." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="aulas" description="Gerenciamento administrativo." />
      <EmptyState icon={Construction} title="Em construção" description="Esta área será habilitada na próxima etapa." />
    </>
  ),
});
