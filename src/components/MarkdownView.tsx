import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

type Props = {
  content: string;
};

function renderMath(source: string) {
  return source
    .replace(/\$\$([\s\S]+?)\$\$/g, (_match, expr) => {
      try {
        return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false });
      } catch {
        return `<pre>${expr}</pre>`;
      }
    })
    .replace(/\$([^$\n]+?)\$/g, (_match, expr) => {
      try {
        return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
      } catch {
        return expr;
      }
    });
}

export function MarkdownView({ content }: Props) {
  const html = marked.parse(renderMath(content), { async: false, breaks: true });
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
