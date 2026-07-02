import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Copy,
  Database,
  ExternalLink,
  ImageOff,
  Loader2,
  NotebookPen,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import type { AcronymEntry, WikiSummary } from '../types';
import { buildWikipediaSearchUrl, fetchWikiSummary } from '../services/wikipedia';
import { MarkdownView } from './MarkdownView';

type Props = {
  entry: AcronymEntry;
  entries: AcronymEntry[];
  onBack: () => void;
  onAsk: () => void;
  onSave?: () => void;
  onEditNote?: () => void;
  onOpenEntry: (entry: AcronymEntry) => void;
};

function sourceLabel(source: AcronymEntry['source']) {
  if (source === 'ai') return 'AI Draft';
  if (source === 'supabase') return 'Supabase';
  return 'Local';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildRelatedEntries(entry: AcronymEntry, entries: AcronymEntry[]) {
  const tagSet = new Set(entry.tags.flatMap((tag) => [tag.en.toLowerCase(), tag.zh.toLowerCase()]));
  return entries
    .filter((item) => item.id !== entry.id)
    .map((item) => {
      const domainScore = item.domain === entry.domain ? 2 : 0;
      const tagScore = item.tags.reduce((score, tag) => {
        return score + (tagSet.has(tag.en.toLowerCase()) || tagSet.has(tag.zh.toLowerCase()) ? 1 : 0);
      }, 0);
      return { item, score: domainScore + tagScore };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.acronym.localeCompare(b.item.acronym))
    .slice(0, 4)
    .map(({ item }) => item);
}

function wikipediaEmbedUrl(url: string) {
  return url
    .replace('://en.wikipedia.org/wiki/', '://en.m.wikipedia.org/wiki/')
    .replace('://zh.wikipedia.org/wiki/', '://zh.m.wikipedia.org/wiki/');
}

export function EntryDetail({ entry, entries, onBack, onAsk, onSave, onEditNote, onOpenEntry }: Props) {
  const [wikiLanguage, setWikiLanguage] = useState<WikiSummary['language']>(entry.wikiLanguage || 'en');
  const [wiki, setWiki] = useState<WikiSummary | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [wikiError, setWikiError] = useState(false);

  const relatedEntries = useMemo(() => buildRelatedEntries(entry, entries), [entry, entries]);
  const fallbackWikiUrl = buildWikipediaSearchUrl(entry, wikiLanguage);

  useEffect(() => {
    let cancelled = false;

    async function loadWiki() {
      setWikiLoading(true);
      setWikiError(false);
      try {
        const summary = await fetchWikiSummary(entry, wikiLanguage);
        if (!cancelled) {
          setWiki(summary);
          setWikiError(!summary);
        }
      } catch {
        if (!cancelled) {
          setWiki(null);
          setWikiError(true);
        }
      } finally {
        if (!cancelled) setWikiLoading(false);
      }
    }

    loadWiki();
    return () => {
      cancelled = true;
    };
  }, [entry, wikiLanguage]);

  async function refreshWiki() {
    setWikiLoading(true);
    setWikiError(false);
    try {
      const summary = await fetchWikiSummary(entry, wikiLanguage, { force: true });
      setWiki(summary);
      setWikiError(!summary);
    } catch {
      setWiki(null);
      setWikiError(true);
    } finally {
      setWikiLoading(false);
    }
  }

  async function copyMarkdown() {
    const lines = [
      `## ${entry.acronym} - ${entry.fullName}`,
      '',
      `中文：${entry.chinese}`,
      `领域：${entry.domain}`,
      `摘要：${entry.summary}`,
      wiki?.url ? `Wikipedia：${wiki.url}` : '',
      entry.formula ? `公式：${entry.formula}` : '',
      entry.formulaExplanation ? `公式详解：${entry.formulaExplanation}` : ''
    ].filter(Boolean);
    await navigator.clipboard?.writeText(lines.join('\n'));
  }

  return (
    <section className="detail-page">
      <div className="detail-toolbar">
        <button className="button secondary" onClick={onBack}>
          <ArrowLeft size={16} />
          返回词库
        </button>
        <div className="detail-toolbar-actions">
          <button className="button secondary" onClick={copyMarkdown}>
            <Copy size={16} />
            复制引用
          </button>
          {onSave && (
            <button className="button secondary" onClick={onSave}>
              <Database size={16} />
              保存
            </button>
          )}
          {onEditNote && (
            <button className="button secondary" onClick={onEditNote}>
              <NotebookPen size={16} />
              笔记
            </button>
          )}
          <button className="button primary" onClick={onAsk}>
            <Brain size={16} />
            深度追问
          </button>
        </div>
      </div>

      <header className="detail-hero">
        <div className="detail-identity">
          <p className="eyebrow">{entry.domain}</p>
          <h1>{entry.acronym}</h1>
          <h2>{entry.fullName}</h2>
          <div className="detail-chinese">{entry.chinese}</div>
          <div className="detail-meta-row">
            <span className={`source-pill ${entry.source}`}>
              {entry.source === 'ai' ? <Sparkles size={14} /> : <BookOpen size={14} />}
              {sourceLabel(entry.source)}
            </span>
            <span>Updated {formatDate(entry.updatedAt)}</span>
          </div>
        </div>

        <div className="detail-visual">
          {wiki?.thumbnailUrl ? (
            <img src={wiki.thumbnailUrl} alt={`${wiki.title} from Wikipedia`} />
          ) : (
            <div className="concept-visual">
              <span>{entry.acronym}</span>
              <small>{entry.tags.slice(0, 3).map((tag) => tag.en).join(' / ') || entry.domain}</small>
            </div>
          )}
          <div className="detail-visual-caption">
            {wiki?.thumbnailUrl ? 'Image from Wikipedia / Wikimedia' : 'Generated concept preview'}
          </div>
        </div>
      </header>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="detail-section summary-band">
            <p>{entry.summary}</p>
          </section>

          {entry.notes?.trim() && (
            <section className="detail-section note-section">
              <h3>我的笔记</h3>
              <MarkdownView content={entry.notes} />
            </section>
          )}

          {entry.formula && (
            <section className="detail-section formula-panel">
              <div>
                <h3>公式 / 机制</h3>
                <p>
                  {entry.formulaExplanation?.trim()
                    || '这个公式是理解该概念机制的压缩表达。建议结合上下文补充每个变量的含义、输入输出关系，以及它在实际场景中衡量或优化的对象。'}
                </p>
              </div>
              <MarkdownView content={entry.formula} />
            </section>
          )}

          <section className="wiki-panel">
            <div className="wiki-panel-header">
              <div>
                <p className="eyebrow">Wikipedia</p>
                <h3>{wiki?.title || '百科资料'}</h3>
              </div>
              <div className="wiki-actions">
                <button
                  className={wikiLanguage === 'en' ? 'wiki-lang active' : 'wiki-lang'}
                  onClick={() => setWikiLanguage('en')}
                >
                  EN
                </button>
                <button
                  className={wikiLanguage === 'zh' ? 'wiki-lang active' : 'wiki-lang'}
                  onClick={() => setWikiLanguage('zh')}
                >
                  中
                </button>
                <button className="icon-button" onClick={refreshWiki} title="刷新 Wikipedia 信息">
                  {wikiLoading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
                </button>
              </div>
            </div>

            {wikiLoading && !wiki ? (
              <div className="wiki-empty">
                <Loader2 className="spin" size={18} />
                正在匹配 Wikipedia 条目
              </div>
            ) : wiki ? (
              <>
                <div className="wiki-live-card">
                  <iframe
                    title={`${wiki.title} Wikipedia preview`}
                    src={wikipediaEmbedUrl(wiki.url)}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <p>{wiki.extract}</p>
                <button className="button secondary wiki-link" onClick={() => window.acroSnap?.openExternal(wiki.url)}>
                  <ExternalLink size={16} />
                  打开 Wikipedia
                </button>
              </>
            ) : (
              <div className="wiki-empty">
                <ImageOff size={18} />
                {wikiError ? '暂未匹配到可靠百科摘要' : '尚未加载百科摘要'}
                <button className="button secondary wiki-link" onClick={() => window.acroSnap?.openExternal(fallbackWikiUrl)}>
                  <ExternalLink size={16} />
                  搜索 Wikipedia
                </button>
              </div>
            )}
          </section>

          <section className="detail-section">
            <h3>标签</h3>
            <div className="tag-row">
              <span>{entry.domain}</span>
              {entry.tags.map((tag) => (
                <span key={`${tag.en}-${tag.zh}`} title={tag.zh}>
                  {tag.en}
                </span>
              ))}
            </div>
          </section>
        </div>

        <aside className="detail-aside">
          <section className="related-panel">
            <h3>相关词条</h3>
            {relatedEntries.length ? (
              <div className="related-list">
                {relatedEntries.map((item) => (
                  <button key={item.id} onClick={() => onOpenEntry(item)}>
                    <strong>{item.acronym}</strong>
                    <span>{item.fullName}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p>暂无本地相关词条。保存更多同领域缩写后，这里会自动补全。</p>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
