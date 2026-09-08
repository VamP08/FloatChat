import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * An answer from the model, rendered as the Markdown it actually is.
 *
 * The model replies with tables, bold figures and unit superscripts, and the panel used
 * to print that straight into a paragraph, so a reader saw `**14.41**` and a row of pipe
 * characters instead of a table. Tables in particular matter here: an answer comparing
 * seven measurements is a table, and there is no prose arrangement of it that reads as
 * well.
 *
 * Styling comes from the same tokens as the rest of the app, so the answer sits inside
 * the world rather than importing a stylesheet's idea of a document. Numerals are
 * tabular, because every one of them is a measurement.
 */
export default function Answer({ children }) {
  return (
    <div className="text-sm leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="tnum font-semibold text-[var(--ink)]">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => (
            <p className="mb-2 mt-4 font-semibold text-[var(--ink)] first:mt-0">{children}</p>
          ),
          h2: ({ children }) => (
            <p className="mb-2 mt-4 font-semibold text-[var(--ink)] first:mt-0">{children}</p>
          ),
          h3: ({ children }) => (
            <p className="mb-2 mt-4 font-semibold text-[var(--ink)] first:mt-0">{children}</p>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--action)] underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="tnum rounded-sm bg-[var(--sea-abyss)] px-1 py-0.5 text-[0.8125rem]">
              {children}
            </code>
          ),
          // A table can be wider than the panel, so it scrolls inside its own box rather
          // than forcing the conversation column sideways.
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto last:mb-0">
              <table className="tnum w-full border-collapse text-left text-[0.8125rem]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-[var(--sea-edge)]">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="whitespace-nowrap px-2 py-1.5 font-medium text-[var(--ink-dim)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-[var(--sea-edge)] px-2 py-1.5 align-top">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l border-[var(--sea-edge)] pl-3 text-[var(--ink-dim)] last:mb-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-[var(--sea-edge)]" />,
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
