import type { AcronymEntry, WikiSummary } from '../types';

const cacheKey = 'acro-snap:wiki-cache';

type WikiCache = Record<string, WikiSummary>;

type SearchResponse = [string, string[], string[], string[]];

type SummaryResponse = {
  title?: string;
  extract?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
  thumbnail?: {
    source?: string;
  };
};

function cacheId(entry: AcronymEntry, language: WikiSummary['language']) {
  return `${language}:${entry.fullName || entry.acronym}`.toLowerCase();
}

function readCache(): WikiCache {
  const raw = localStorage.getItem(cacheKey);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeCache(cache: WikiCache) {
  localStorage.setItem(cacheKey, JSON.stringify(cache));
}

function getCachedSummary(entry: AcronymEntry, language: WikiSummary['language']) {
  const cached = readCache()[cacheId(entry, language)];
  if (!cached) return null;
  return cached;
}

function setCachedSummary(entry: AcronymEntry, summary: WikiSummary) {
  const cache = readCache();
  cache[cacheId(entry, summary.language)] = summary;
  writeCache(cache);
}

function wikiOrigin(language: WikiSummary['language']) {
  return `https://${language}.wikipedia.org`;
}

function encodeTitle(title: string) {
  return encodeURIComponent(title.replace(/ /g, '_'));
}

async function searchTitle(entry: AcronymEntry, language: WikiSummary['language']) {
  const query = language === 'zh'
    ? `${entry.chinese || entry.fullName || entry.acronym}`
    : `${entry.fullName || entry.acronym}`;
  const url = `${wikiOrigin(language)}/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&origin=*`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Wikipedia search failed');
  const [, titles] = await response.json() as SearchResponse;
  return titles[0] || null;
}

async function loadSummary(title: string, language: WikiSummary['language']): Promise<WikiSummary | null> {
  const url = `${wikiOrigin(language)}/api/rest_v1/page/summary/${encodeTitle(title)}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json() as SummaryResponse;
  if (!data.title || !data.extract) return null;

  return {
    title: data.title,
    extract: data.extract,
    url: data.content_urls?.desktop?.page || `${wikiOrigin(language)}/wiki/${encodeTitle(data.title)}`,
    thumbnailUrl: data.thumbnail?.source,
    language
  };
}

export async function fetchWikiSummary(
  entry: AcronymEntry,
  language: WikiSummary['language'] = 'en',
  options: { force?: boolean } = {}
): Promise<WikiSummary | null> {
  if (!options.force) {
    const cached = getCachedSummary(entry, language);
    if (cached) return cached;
  }

  const directTitle = language === entry.wikiLanguage ? entry.wikiTitle : undefined;
  const title = directTitle || await searchTitle(entry, language);
  if (!title) return null;

  const summary = await loadSummary(title, language);
  if (summary) setCachedSummary(entry, summary);
  return summary;
}

export function buildWikipediaSearchUrl(entry: AcronymEntry, language: WikiSummary['language'] = 'en') {
  const query = language === 'zh'
    ? entry.chinese || entry.fullName || entry.acronym
    : entry.fullName || entry.acronym;
  return `${wikiOrigin(language)}/w/index.php?search=${encodeURIComponent(query)}`;
}
