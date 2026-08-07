import DOMPurify from "dompurify";
import { Download, ExternalLink, FileText, ImageOff, Loader2 } from "lucide-react";
import type { BlockContent, LessonBlock } from "@/lib/api";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { youtubeEmbedUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";

const destaqueStyles: Record<string, string> = {
  info: "border-primary/40 bg-primary/10",
  atencao: "border-destructive/40 bg-destructive/10",
  dica: "border-accent/40 bg-accent/10",
  importante: "border-foreground/30 bg-muted",
};

function SafeHtml({ html, className }: { html: string; className?: string }) {
  const clean = typeof window === "undefined" ? "" : DOMPurify.sanitize(html);
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}


function SignedImage({ content }: { content: BlockContent }) {
  const { data, isLoading, isError } = useSignedUrl(content.path);
  if (isLoading)
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl bg-muted">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  if (isError || !data)
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-2xl bg-muted text-muted-foreground">
        <ImageOff className="h-5 w-5" />
        <span className="text-sm">Imagem indisponível</span>
      </div>
    );
  return (
    <figure className="space-y-2">
      <img
        src={data}
        alt={content.legenda || content.nome || "Imagem da aula"}
        loading="lazy"
        className="w-full rounded-2xl border border-border object-cover shadow-[var(--shadow-soft)]"
      />
      {content.legenda ? (
        <figcaption className="text-center text-xs text-muted-foreground">
          {content.legenda}
        </figcaption>
      ) : null}
    </figure>
  );
}

function SignedPdf({ content }: { content: BlockContent }) {
  const { data, isLoading } = useSignedUrl(content.path);
  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-primary" />
          {content.nome || "Documento PDF"}
        </div>
        {data ? (
          <Button asChild size="sm" variant="outline">
            <a href={data} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" /> Baixar
            </a>
          </Button>
        ) : null}
      </div>
      {isLoading ? (
        <div className="flex h-72 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <iframe title={content.nome || "PDF"} src={data} className="h-[560px] w-full" />
      ) : (
        <p className="p-6 text-sm text-muted-foreground">Não foi possível carregar o documento.</p>
      )}
    </div>
  );
}

function SignedVideo({ content }: { content: BlockContent }) {
  const { data, isLoading } = useSignedUrl(content.path);
  if (isLoading)
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-muted">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  if (!data) return <p className="text-sm text-muted-foreground">Vídeo indisponível.</p>;
  return (
    <video
      controls
      preload="metadata"
      src={data}
      className="w-full rounded-2xl border border-border bg-black shadow-[var(--shadow-soft)]"
    />
  );
}

export function BlockRenderer({ block }: { block: LessonBlock }) {
  const c = block.conteudo ?? {};

  switch (block.tipo) {
    case "titulo":
      return <h2 className="text-2xl font-semibold tracking-tight">{c.texto}</h2>;
    case "subtitulo":
      return <h3 className="text-lg font-semibold text-primary">{c.texto}</h3>;
    case "texto":
      return (
        <div className="prose-lesson space-y-4 text-[15px]">
          {(c.texto ?? "").split(/\n{2,}/).map((par, i) => (
            <p key={i} className="whitespace-pre-line">
              {par}
            </p>
          ))}
        </div>
      );
    case "lista":
      return (
        <ul className="space-y-2">
          {(c.itens ?? []).map((item, i) => (
            <li key={i} className="flex gap-3 text-[15px]">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "citacao":
      return (
        <blockquote className="border-l-4 border-accent bg-muted/60 px-5 py-4 text-[15px] italic">
          <p>{c.texto}</p>
          {c.autor ? (
            <footer className="mt-2 text-sm not-italic text-muted-foreground">— {c.autor}</footer>
          ) : null}
        </blockquote>
      );
    case "destaque":
      return (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4 text-[15px]">
          {c.texto}
        </div>
      );
    case "imagem":
      return <SignedImage content={c} />;
    case "pdf":
      return <SignedPdf content={c} />;
    case "video":
      return <SignedVideo content={c} />;
    case "youtube": {
      const embed = youtubeEmbedUrl(c.url ?? "");
      if (!embed) return <p className="text-sm text-muted-foreground">URL do YouTube inválida.</p>;
      return (
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-soft)]">
          <iframe
            src={embed}
            title={c.nome || "Vídeo do YouTube"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      );
    }
    case "link":
      return (
        <a
          href={c.url}
          target="_blank"
          rel="noreferrer"
          className="surface flex items-center justify-between gap-3 px-5 py-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
        >
          <span className="text-sm font-medium">{c.rotulo || c.url}</span>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </a>
      );
    default:
      return null;
  }
}
