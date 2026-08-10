import DOMPurify from "dompurify";
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  ImageOff,
  Loader2,
  Presentation,
} from "lucide-react";
import type { BlockContent, LessonBlock } from "@/lib/api";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { youtubeEmbedUrl } from "@/lib/storage";
import { fileExtension, formatSize } from "@/lib/uploads";
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


function useResolvedUrl(content: BlockContent) {
  const signed = useSignedUrl(content.path);
  if (!content.path) {
    return { data: content.url ?? "", isLoading: false, isError: !content.url };
  }
  return signed;
}

function SignedImage({ content }: { content: BlockContent }) {
  const { data, isLoading, isError } = useResolvedUrl(content);

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
  const { data, isLoading } = useResolvedUrl(content);
  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{content.nome || "Documento PDF"}</span>
        </div>
        {data ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={data} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Visualizar
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={data} download={content.nome || "documento.pdf"}>
                <Download className="h-4 w-4" /> Baixar PDF
              </a>
            </Button>
          </div>
        ) : null}
      </div>
      {isLoading ? (
        <div className="flex h-72 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <iframe
          title={content.nome || "PDF"}
          src={data}
          loading="lazy"
          className="h-[560px] w-full"
        />
      ) : (
        <p className="p-6 text-sm text-muted-foreground">Não foi possível carregar o documento.</p>
      )}
    </div>
  );
}

const docIcons: Record<string, typeof FileText> = {
  xlsx: FileSpreadsheet,
  pptx: Presentation,
};

function SignedDocument({ content }: { content: BlockContent }) {
  const { data, isLoading } = useResolvedUrl(content);
  const ext = fileExtension(content.nome || content.path || "");
  const Icon = docIcons[ext] ?? FileText;
  return (
    <div className="surface flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="rounded-xl bg-muted p-2 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {content.nome || "Arquivo"}
          </span>
          <span className="block text-xs uppercase text-muted-foreground">
            {ext || "arquivo"} · {formatSize(content.tamanho)}
          </span>
          {content.descricao ? (
            <span className="block text-xs text-muted-foreground">{content.descricao}</span>
          ) : null}
        </span>
      </div>
      <Button asChild size="sm" variant="outline" disabled={isLoading || !data}>
        <a href={data || "#"} download={content.nome || "arquivo"}>
          <Download className="h-4 w-4" /> Baixar arquivo
        </a>
      </Button>
    </div>
  );
}

function SignedVideo({ content }: { content: BlockContent }) {
  const { data, isLoading } = useResolvedUrl(content);
  if (isLoading)
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-muted">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  if (!data) return <p className="text-sm text-muted-foreground">Vídeo indisponível.</p>;
  return (
    <figure className="space-y-2">
      <video
        controls
        controlsList="nodownload"
        preload="none"
        playsInline
        src={data}
        {...(content.poster ? { poster: content.poster } : {})}
        className="w-full rounded-2xl border border-border bg-black shadow-[var(--shadow-soft)]"
      />
      {content.nome ? (
        <figcaption className="text-xs text-muted-foreground">{content.nome}</figcaption>
      ) : null}
    </figure>
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
      if (c.html) {
        return (
          <SafeHtml
            html={c.html}
            className="prose-lesson space-y-3 text-[15px] [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
          />
        );
      }
      return (
        <div className="prose-lesson space-y-4 text-[15px]">
          {(c.texto ?? "").split(/\n{2,}/).map((par, i) => (
            <p key={i} className="whitespace-pre-line">
              {par}
            </p>
          ))}
        </div>
      );
    case "lista": {
      const itens = (c.itens ?? []).filter((i) => i.trim().length > 0);
      if (c.ordenada) {
        return (
          <ol className="space-y-2 pl-1">
            {itens.map((item, i) => (
              <li key={i} className="flex gap-3 text-[15px]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent-foreground">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="space-y-2">
          {itens.map((item, i) => (
            <li key={i} className="flex gap-3 text-[15px]">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }

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
        <div
          className={`rounded-2xl border px-5 py-4 text-[15px] ${destaqueStyles[c.variante ?? "dica"] ?? destaqueStyles['dica']}`}
        >
          {c.titulo ? <p className="mb-1 font-semibold">{c.titulo}</p> : null}
          <p className="whitespace-pre-line">{c.texto}</p>
        </div>
      );

    case "imagem":
      return <SignedImage content={c} />;
    case "pdf":
      return <SignedPdf content={c} />;
    case "documento":
      return <SignedDocument content={c} />;
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
          <span>
            <span className="block text-sm font-medium">{c.rotulo || c.url}</span>
            {c.descricao ? (
              <span className="block text-xs text-muted-foreground">{c.descricao}</span>
            ) : null}
          </span>
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
        </a>
      );

    default:
      return null;
  }
}
