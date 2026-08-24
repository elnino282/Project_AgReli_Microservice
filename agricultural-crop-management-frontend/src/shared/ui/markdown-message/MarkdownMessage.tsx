import { ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/shared/lib';

interface MarkdownMessageProps {
  content: string;
}

const isExternalLink = (href?: string) => Boolean(href && /^(https?:)?\/\//i.test(href));

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children, ...props }) => {
            const external = isExternalLink(href);
            return (
              <a
                href={href}
                className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:text-primary/80"
                target={external ? '_blank' : undefined}
                rel={external ? 'noreferrer noopener' : undefined}
                {...props}
              >
                {children}
                {external && <ExternalLink className="h-3.5 w-3.5" aria-label="Mở liên kết ngoài" />}
              </a>
            );
          },
          h1: ({ children, ...props }) => <h1 className="mt-3 text-base font-semibold first:mt-0" {...props}>{children}</h1>,
          h2: ({ children, ...props }) => <h2 className="mt-3 text-sm font-semibold first:mt-0" {...props}>{children}</h2>,
          h3: ({ children, ...props }) => <h3 className="mt-3 text-sm font-medium first:mt-0" {...props}>{children}</h3>,
          p: ({ children, ...props }) => <p className="mb-2 whitespace-pre-wrap last:mb-0" {...props}>{children}</p>,
          ul: ({ children, ...props }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0" {...props}>{children}</ul>,
          ol: ({ children, ...props }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" {...props}>{children}</ol>,
          li: ({ children, ...props }) => <li className="whitespace-pre-wrap" {...props}>{children}</li>,
          blockquote: ({ children, ...props }) => (
            <blockquote className="mb-2 border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground last:mb-0" {...props}>
              {children}
            </blockquote>
          ),
          pre: ({ children, ...props }) => (
            <pre className="mb-2 overflow-x-auto rounded-md bg-muted/60 p-3 text-xs last:mb-0" {...props}>{children}</pre>
          ),
          code: ({ className, children, ...props }) => (
            <code
              className={className
                ? cn('font-mono text-xs', className)
                : 'rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]'}
              {...props}
            >
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
