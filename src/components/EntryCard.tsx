import { BookOpen, Brain, Check, Database, NotebookPen, Sparkles } from 'lucide-react';
import type { AcronymEntry } from '../types';
import { MarkdownView } from './MarkdownView';

type Props = {
  entry: AcronymEntry;
  compact?: boolean;
  onSave?: () => void;
  onAsk?: () => void;
  onOpen?: () => void;
  onEditNote?: () => void;
  saved?: boolean;
};

export function EntryCard({ entry, compact, onSave, onAsk, onOpen, onEditNote, saved }: Props) {
  const className = [
    compact ? 'entry-card compact' : 'entry-card',
    onOpen ? 'clickable' : ''
  ].filter(Boolean).join(' ');

  return (
    <article
      className={className}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (!onOpen) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="entry-topline">
        <div>
          <div className="entry-acronym">{entry.acronym}</div>
          <div className="entry-fullname">{entry.fullName}</div>
        </div>
        <span className={`source-pill ${entry.source}`}>
          {entry.source === 'ai' ? <Sparkles size={14} /> : <BookOpen size={14} />}
          {entry.source === 'ai' ? 'AI Draft' : 'Local'}
        </span>
      </div>

      <div className="entry-chinese">{entry.chinese}</div>
      <p className="entry-summary">{entry.summary}</p>

      {entry.formula ? (
        <div className="entry-formula">
          <MarkdownView content={entry.formula} />
          {entry.formulaExplanation?.trim() ? (
            <p>{entry.formulaExplanation}</p>
          ) : null}
        </div>
      ) : null}

      <div className="tag-row">
        <span>{entry.domain}</span>
        {entry.tags.map((tag) => (
          <span key={`${tag.en}-${tag.zh}`} title={tag.zh}>
            {tag.en}
          </span>
        ))}
      </div>

      {entry.notes?.trim() ? (
        <div className="entry-note-indicator">
          <NotebookPen size={14} />
          已有 Markdown 笔记
        </div>
      ) : null}

      {(onSave || onAsk || onEditNote) && (
        <div className="entry-actions">
          {onEditNote && (
            <button
              className="button secondary"
              onClick={(event) => {
                event.stopPropagation();
                onEditNote();
              }}
            >
              <NotebookPen size={16} />
              笔记
            </button>
          )}
          {onSave && (
            <button
              className="button secondary"
              onClick={(event) => {
                event.stopPropagation();
                onSave();
              }}
            >
              {saved ? <Check size={16} /> : <Database size={16} />}
              {saved ? '已入库' : '保存至本地库'}
            </button>
          )}
          {onAsk && (
            <button
              className="button primary"
              onClick={(event) => {
                event.stopPropagation();
                onAsk();
              }}
            >
              <Brain size={16} />
              深度追问
            </button>
          )}
        </div>
      )}
    </article>
  );
}
