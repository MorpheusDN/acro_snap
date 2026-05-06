import { BookOpen, Brain, Check, Database, Sparkles } from 'lucide-react';
import type { AcronymEntry } from '../types';
import { MarkdownView } from './MarkdownView';

type Props = {
  entry: AcronymEntry;
  compact?: boolean;
  onSave?: () => void;
  onAsk?: () => void;
  saved?: boolean;
};

export function EntryCard({ entry, compact, onSave, onAsk, saved }: Props) {
  return (
    <article className={compact ? 'entry-card compact' : 'entry-card'}>
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

      {entry.formula ? <MarkdownView content={entry.formula} /> : null}

      <div className="tag-row">
        <span>{entry.domain}</span>
        {entry.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>

      {(onSave || onAsk) && (
        <div className="entry-actions">
          {onSave && (
            <button className="button secondary" onClick={onSave}>
              {saved ? <Check size={16} /> : <Database size={16} />}
              {saved ? '已入库' : '保存至本地库'}
            </button>
          )}
          {onAsk && (
            <button className="button primary" onClick={onAsk}>
              <Brain size={16} />
              深度追问
            </button>
          )}
        </div>
      )}
    </article>
  );
}
