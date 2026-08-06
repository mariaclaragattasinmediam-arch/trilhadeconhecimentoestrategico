import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common/page-parts";

export const Route = createFileRoute("/_authenticated/admin/aulas/$lessonId")({
  head: () => ({
    meta: [
      { title: "Editor de aula — Trilha Ongoing" },
      { name: "description", content: "Editor de blocos de conteúdo da aula." },
      { property: "og:title", content: "Editor de aula — Trilha Ongoing" },
      { property: "og:description", content: "Editor de blocos de conteúdo da aula." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Editor de conteúdo" description="Adicione e reordene blocos da aula." />
      <EmptyState icon={Construction} title="Em construção" description="O editor de blocos será habilitado na próxima etapa." />
    </>
  ),
});
