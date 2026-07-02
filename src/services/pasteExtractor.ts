import type { AcronymEntry, Tag } from '../types';

type Section = {
  title: string;
  body: string;
};

const headingPattern = /^#{1,6}\s+(.*)$/gm;
const entryPattern = /\*\*?\s*([A-Z][A-Z0-9]{1,9})\s*=\s*([^*\n，,]+?)(?:[，,]\s*([^*\n#]+?))?\s*\*\*?/g;
const bulletEntryPattern = /[-*]\s*([A-Z][A-Z0-9]{1,9})\s*[:：=]\s*([^，,\n]+)(?:[，,]\s*([^\n]+))?/g;

function idFrom(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || crypto.randomUUID();
}

function clean(text = '') {
  return text
    .replace(/\*\*/g, '')
    .replace(/[`#>-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferDomain(sectionTitle: string, body: string) {
  const source = `${sectionTitle} ${body}`.toLowerCase();
  if (/ai|硬件|光电|数据中心|gpu|算力|it/.test(source)) return 'IT / Hardware / AI';
  if (/职场|高管|公司|产品官|ceo|cto|cfo|roadmap/.test(source)) return 'Business / Leadership';
  if (/金融|股票|交易|基金|commodity|pool|operator/.test(source)) return 'Finance';
  if (/隐私|privacy/.test(source)) return 'Privacy / Governance';
  if (/项目|project/.test(source)) return 'Project Management';
  return sectionTitle ? clean(sectionTitle) : 'General Knowledge';
}

function inferTags(domain: string, text: string): Tag[] {
  const tags: Tag[] = [{ en: domain, zh: domain }];
  const source = `${domain} ${text}`.toLowerCase();
  if (/ai|gpu|数据中心|光电|硬件/.test(source)) tags.push({ en: 'AI Infrastructure', zh: 'AI 基础设施' });
  if (/产品|roadmap|高管|chief/.test(source)) tags.push({ en: 'Leadership', zh: '管理岗位' });
  if (/金融|基金|股票|commodity/.test(source)) tags.push({ en: 'Finance', zh: '金融' });
  return tags;
}

function splitSections(text: string): Section[] {
  const matches = [...text.matchAll(headingPattern)];
  if (!matches.length) return [{ title: '', body: text }];

  return matches.map((match, index) => {
    const start = (match.index || 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index || text.length : text.length;
    return {
      title: clean(match[1]),
      body: text.slice(start, end)
    };
  });
}

function extractSummary(body: string) {
  const oneLine = body.match(/一句话[:：]\s*([\s\S]*?)(?:\n\s*\n|###|---|$)/);
  if (oneLine?.[1]) return clean(oneLine[1]);

  const bullet = body.match(/[-*]\s*([^\n]{12,160})/);
  if (bullet?.[1]) return clean(bullet[1]);

  const paragraph = body
    .split(/\n+/)
    .map(clean)
    .find((line) => line.length >= 12 && !/^#{1,6}/.test(line));
  return paragraph || '从粘贴内容中自动提取的缩写条目，建议保存后复核。';
}

function parseMatches(pattern: RegExp, section: Section) {
  return [...section.body.matchAll(pattern)].map((match) => ({
    acronym: clean(match[1]).toUpperCase(),
    fullName: clean(match[2]),
    chinese: clean(match[3] || ''),
    context: section.body
  }));
}

export function extractEntriesFromPaste(text: string): AcronymEntry[] {
  const sections = splitSections(text);
  const map = new Map<string, AcronymEntry>();

  for (const section of sections) {
    const matches = [
      ...parseMatches(entryPattern, section),
      ...parseMatches(bulletEntryPattern, section)
    ];

    for (const match of matches) {
      if (!match.fullName || match.fullName.length < 2) continue;
      const domain = inferDomain(section.title, match.context);
      const summary = extractSummary(match.context);
      const key = `${match.acronym}:${domain}:${match.fullName}`.toLowerCase();

      map.set(key, {
        id: idFrom(`${match.acronym}-${domain}-${match.fullName}`),
        acronym: match.acronym,
        fullName: match.fullName,
        chinese: match.chinese || '待补充',
        domain,
        summary,
        formula: '',
        tags: inferTags(domain, `${match.fullName} ${match.chinese} ${summary}`),
        source: 'ai',
        updatedAt: new Date().toISOString()
      });
    }
  }

  return [...map.values()];
}
