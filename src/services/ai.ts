import type { AcronymEntry, ChatMessage, Tag } from '../types';
import { loadSettings } from './settings';

type AiMessage = {
  role: 'system' | ChatMessage['role'];
  content: string;
};

type AiMode = 'chat' | 'responses';

const systemPrompt = [
  'You are AcroSnap, a multi-domain acronym knowledge assistant.',
  'The user may study computer science, AI, stock trading, finance, medicine, design, management, and other domains.',
  'If an acronym has common meanings in multiple domains and the user did not specify a domain, ask a clarifying question before answering.',
  'If the user has specified a domain, answer within that domain.',
  'Use Chinese for explanations unless the user asks otherwise.',
  'Display equations with $$...$$ or \\[...\\]. Inline math may use $...$ or \\(...\\).',
  'After each equation, explain the meaning of the variables in natural language.'
].join('\n');

function idFrom(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || crypto.randomUUID();
}

function normalizeAiTags(raw: unknown): Tag[] {
  if (!Array.isArray(raw)) return [{ en: 'Knowledge', zh: '知识' }];
  return raw.map((tag) => {
    if (typeof tag === 'string') return { en: tag, zh: tag };
    if (tag && typeof tag === 'object') {
      const value = tag as Partial<Tag>;
      return { en: value.en || value.zh || '', zh: value.zh || value.en || '' };
    }
    return { en: String(tag), zh: String(tag) };
  }).filter((tag) => tag.en || tag.zh);
}

function canCallAi(settings: ReturnType<typeof loadSettings>) {
  return Boolean(settings.aiEndpoint && (settings.aiApiKey || shouldUseResponsesApi(settings)));
}

function entryFromParsed(parsed: any, fallbackAcronym: string): AcronymEntry {
  const acronym = String(parsed?.acronym || fallbackAcronym || 'AI').toUpperCase();
  const fullName = parsed?.fullName || parsed?.full_name || parsed?.english || 'Unknown';
  const chinese = parsed?.chinese || parsed?.zh || '待补充';
  const domain = parsed?.domain || 'General Knowledge';
  const summary = parsed?.summary || 'AI 已生成初步解释，建议保存前复核。';
  const notes = parsed?.notes || parsed?.note || '';
  const formulaExplanation = parsed?.formulaExplanation || parsed?.formula_explanation || parsed?.formulaNotes || '';

  return {
    id: idFrom(`${acronym}-${domain}-${fullName}`),
    acronym,
    fullName,
    chinese,
    domain,
    summary,
    formula: parsed?.formula || '',
    formulaExplanation,
    tags: normalizeAiTags(parsed?.tags),
    source: 'ai',
    updatedAt: new Date().toISOString(),
    aliases: Array.isArray(parsed?.aliases) ? parsed.aliases : undefined,
    examples: Array.isArray(parsed?.examples) ? parsed.examples : undefined,
    notes
  };
}

export async function explainAcronym(query: string): Promise<AcronymEntry> {
  const settings = loadSettings();
  if (canCallAi(settings)) {
    const prompt = [
      `请把 "${query}" 解释为一个多领域缩写词典条目。`,
      '只返回 JSON，不要 Markdown。',
      '字段：acronym, fullName, chinese, domain, summary, formula, formulaExplanation, tags。',
      '如果存在公式，formulaExplanation 要用中文解释公式含义，并逐项说明每个字母/变量代表什么。',
      'tags 必须是数组，每一项格式为 {"en":"英文标签","zh":"中文标签"}。'
    ].join('\n');
    const content = await callAi(settings, prompt);
    const parsed = parseJson(content);
    if (parsed) return entryFromParsed(parsed, query);
  }

  await new Promise((resolve) => setTimeout(resolve, 650));
  return {
    id: idFrom(query),
    acronym: query.toUpperCase(),
    fullName: `${query.toUpperCase()} Concept`,
    chinese: 'AI 生成释义',
    domain: 'General Knowledge',
    summary: '当前未配置真实 AI 服务。这是用于演示查询、保存和深度追问流程的结构化解释。',
    formula: '$$\\operatorname{score}(x)=\\frac{\\exp(f(x))}{\\sum_i \\exp(f(x_i))}$$',
    formulaExplanation: '公式含义：softmax 将一组分数转换为概率分布。\n变量说明：x 表示当前候选项；f(x) 表示模型给 x 的原始分数；x_i 表示第 i 个候选项；分母表示所有候选项指数分数的总和。',
    tags: [
      { en: 'AI Draft', zh: 'AI 草稿' },
      { en: 'Review', zh: '待复核' }
    ],
    source: 'ai',
    updatedAt: new Date().toISOString()
  };
}

export async function extractEntriesFromLongText(text: string): Promise<AcronymEntry[]> {
  const settings = loadSettings();
  if (!canCallAi(settings)) return [];
  const primaryAcronym = inferPrimaryAcronym(text);

  const prompt = [
    '请从下面粘贴的文本中抽取所有值得入库的缩写/简称/公司简称/技术名词。',
    primaryAcronym
      ? `重要：这段文本开头的核心主题缩写很可能是 "${primaryAcronym}"。如果全文主要都在解释它，请只输出 "${primaryAcronym}" 这一个条目，把其他缩写、产品名、竞品、型号、技术词都整理进 notes，不要作为独立条目输出。`
      : '重要：如果文本开头先给出了一个大的主题缩写，并且后文主要围绕它展开，请只输出这个核心缩写；其他缩写只作为拓展知识写入 notes。',
    '不仅要抽取基本信息，还要把文本中关于该缩写的拓展知识、产品线、对比、用途、关键词、例子整理为 Markdown 笔记，放入 notes 字段。',
    '只有当文本明确在并列介绍多个独立主题缩写，或同一缩写有多个不同含义/领域时，才输出多个条目。',
    '如果存在公式，formula 字段写公式本身，formulaExplanation 字段用中文解释公式含义，并逐项说明每个字母/变量代表什么。',
    '只返回 JSON，不要 Markdown，不要解释。',
    '',
    '返回格式：',
    '{ "entries": [',
    '  {',
    '    "acronym": "AMD",',
    '    "fullName": "Advanced Micro Devices",',
    '    "chinese": "超威半导体",',
    '    "domain": "Semiconductor / Computing",',
    '    "summary": "一句话定义，80 字以内",',
    '    "formula": "",',
    '    "formulaExplanation": "公式含义：...\\n变量说明：x 表示...；y 表示...。",',
    '    "tags": [{"en":"Semiconductor","zh":"半导体"}],',
    '    "aliases": ["可选别名"],',
    '    "examples": ["可选例子"],',
    '    "notes": "## 核心理解\\n- ...\\n\\n## 产品线\\n- ...\\n\\n## 对比\\n- ..."',
    '  }',
    '] }',
    '',
    '文本如下：',
    text
  ].join('\n');

  const content = await callAi(settings, prompt);
  const parsed = parseJson(content);
  const rawEntries = Array.isArray(parsed) ? parsed : parsed?.entries;
  if (!Array.isArray(rawEntries)) return [];
  const scopedEntries = primaryAcronym
    ? rawEntries.filter((item) => String(item?.acronym || '').toUpperCase() === primaryAcronym)
    : rawEntries;
  const finalEntries = scopedEntries.length ? scopedEntries : rawEntries;
  return finalEntries.map((item) => entryFromParsed(item, item?.acronym || primaryAcronym || 'AI'));
}

function inferPrimaryAcronym(text: string) {
  const head = text.trim().slice(0, 360);
  const patterns = [
    /^#{1,6}\s*([A-Z][A-Z0-9]{1,10})\b/m,
    /^([A-Z][A-Z0-9]{1,10})\s*[（(=：:,-]/,
    /\b([A-Z][A-Z0-9]{1,10})\b\s*[（(]\s*[A-Z][A-Za-z0-9&+\- /]+[）)]/,
    /(?:^|\n)\s*(?:一、|1[）.)]?)?\s*([A-Z][A-Z0-9]{1,10})\s*=/
  ];
  for (const pattern of patterns) {
    const match = head.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }
  return '';
}

export async function chatReply(messages: ChatMessage[]): Promise<string> {
  const settings = loadSettings();
  const latest = messages[messages.length - 1]?.content || '';
  if (canCallAi(settings)) {
    return callAi(settings, latest, messages);
  }

  await new Promise((resolve) => setTimeout(resolve, 700));
  return [
    `可以。围绕 **${latest.slice(0, 40) || '该概念'}**，建议从定义、动机、数学形式和落地场景四层理解。`,
    '',
    '$$',
    '\\begin{aligned}',
    'p(y\\mid x) &= \\operatorname{softmax}(W h_x) \\\\',
    '\\mathcal{L} &= -\\sum_t \\log p(y_t\\mid y_{<t},x)',
    '\\end{aligned}',
    '$$',
    '',
    '- 定义层：先明确输入、输出和约束。',
    '- 动机层：关注它解决了什么问题。',
    '- 落地层：检查数据、检索、推理、交易或训练链路中的位置。'
  ].join('\n');
}

export async function extractEntryFromText(text: string): Promise<AcronymEntry> {
  const extracted = await extractEntriesFromLongText(text);
  if (extracted[0]) return extracted[0];
  const matched = text.match(/\b[A-Z][A-Z0-9]{1,8}\b/);
  return explainAcronym(matched?.[0] || 'AI');
}

async function callAi(settings: ReturnType<typeof loadSettings>, prompt: string, history?: ChatMessage[]) {
  const messages: AiMessage[] = history
    ? [
        { role: 'system', content: systemPrompt },
        ...history.map((message) => ({ role: message.role, content: message.content }))
      ]
    : [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ];

  const mode = shouldUseResponsesApi(settings) ? 'responses' : 'chat';
  const endpoint = normalizeAiEndpoint(settings.aiEndpoint, mode);
  const result = await requestAi(settings, endpoint, mode, messages);
  const data = parseResponseJson(result.text);

  if (!result.ok) {
    const message = data?.error?.message || data?.message || result.text || `HTTP ${result.status}`;
    const endpointHint = result.endpoint ? `\n实际请求地址：${result.endpoint}` : '';
    throw new Error(`AI 请求失败：${message}${endpointHint}`);
  }

  const content = mode === 'responses'
    ? extractResponsesContent(data)
    : data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI 服务没有返回可读取的文本内容，请检查 Endpoint、Model 和 API 返回格式。');
  }
  return content;
}

async function requestAi(
  settings: ReturnType<typeof loadSettings>,
  endpoint: string,
  mode: AiMode,
  messages: AiMessage[]
) {
  if (window.acroSnap?.chatCompletion) {
    return window.acroSnap.chatCompletion({
      endpoint,
      apiKey: settings.aiApiKey,
      model: settings.aiModel,
      messages,
      mode,
      instructions: systemPrompt,
      temperature: 0.2
    });
  }

  const body = mode === 'responses'
    ? {
        model: settings.aiModel,
        instructions: systemPrompt,
        input: messages
          .filter((message) => message.role !== 'system')
          .map((message) => ({
            role: message.role,
            content: [{ type: message.role === 'assistant' ? 'output_text' : 'input_text', text: message.content }]
          }))
      }
    : {
        model: settings.aiModel,
        messages,
        temperature: 0.2
      };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.aiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    return {
      ok: response.ok,
      status: response.status,
      endpoint,
      text: await response.text()
    };
  } catch (error) {
    throw new Error(`无法连接 AI Endpoint：${error instanceof Error ? error.message : '网络请求失败'}`);
  }
}

function shouldUseResponsesApi(settings: ReturnType<typeof loadSettings>) {
  const endpoint = settings.aiEndpoint.toLowerCase();
  const model = settings.aiModel.toLowerCase();
  return endpoint.includes('ark.cn-beijing.volces.com') || endpoint.includes('/api/v3') || model.startsWith('doubao-');
}

function normalizeAiEndpoint(endpoint: string, mode: AiMode) {
  const trimmed = endpoint.trim().replace(/\/+$/, '');
  if (!trimmed) return trimmed;

  if (mode === 'responses') {
    if (/\/responses$/i.test(trimmed)) return trimmed;
    return `${trimmed}/responses`;
  }

  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  if (/\/v1$/i.test(trimmed)) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

function parseResponseJson(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`AI 服务返回了非 JSON 内容：${text.slice(0, 180) || '空响应'}`);
  }
}

function extractResponsesContent(data: any): string {
  if (typeof data?.output_text === 'string') return data.output_text;

  const chunks: string[] = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
      if (typeof content?.value === 'string') chunks.push(content.value);
    }
  }
  return chunks.join('\n').trim();
}

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
