import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

type Props = {
  content: string;
};

function renderKatex(expr: string, displayMode: boolean) {
  try {
    return katex.renderToString(expr.trim(), {
      displayMode,
      throwOnError: false,
      output: 'html'
    });
  } catch {
    return displayMode ? `<pre>${expr}</pre>` : expr;
  }
}

function extractMath(source: string) {
  const math: string[] = [];
  const stash = (html: string) => {
    const index = math.push(html) - 1;
    return `@@ACRO_MATH_${index}@@`;
  };

  const markdown = source
    .replace(/\\\[([\s\S]+?)\\\]/g, (_match, expr) => stash(renderKatex(expr, true)))
    .replace(/\$\$([\s\S]+?)\$\$/g, (_match, expr) => stash(renderKatex(expr, true)))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_match, expr) => stash(renderKatex(expr, false)))
    .replace(/\$([^$\n]+?)\$/g, (_match, expr) => stash(renderKatex(expr, false)));

  return { markdown, math };
}

export function MarkdownView({ content }: Props) {
  const { markdown, math } = extractMath(content);
  const parsed = marked.parse(markdown, { async: false, breaks: true }) as string;
  const html = parsed.replace(/@@ACRO_MATH_(\d+)@@/g, (_match, index) => math[Number(index)] || '');
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
