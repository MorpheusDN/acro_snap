import type { AcronymEntry, ChatMessage } from '../types';
import { loadSettings } from './settings';

function idFrom(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || crypto.randomUUID();
}

export async function explainAcronym(query: string): Promise<AcronymEntry> {
  const settings = loadSettings();
  if (settings.aiEndpoint && settings.aiApiKey) {
    const prompt = `请把 "${query}" 解释为 CS/AI 研究者使用的缩写词典条目，返回 JSON，字段为 acronym, fullName, chinese, domain, summary, formula, tags。`;
    const content = await callOpenAICompatible(settings, prompt);
    const parsed = parseJson(content);
    if (parsed) {
      return {
        id: idFrom(parsed.acronym || query),
        acronym: parsed.acronym || query.toUpperCase(),
        fullName: parsed.fullName || parsed.full_name || 'Unknown',
        chinese: parsed.chinese || '待补充',
        domain: parsed.domain || 'CS / AI',
        summary: parsed.summary || 'AI 已生成初步解释，建议保存前复核。',
        formula: parsed.formula || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['AI'],
        source: 'ai',
        updatedAt: new Date().toISOString()
      };
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 650));
  return {
    id: idFrom(query),
    acronym: query.toUpperCase(),
    fullName: `${query.toUpperCase()} Concept`,
    chinese: 'AI 生成释义',
    domain: 'CS / AI',
    summary: '当前未配置真实 AI 服务，这是用于演示查询兜底、保存和深度追问流程的结构化解释。',
    formula: '$$\\operatorname{score}(x)=\\frac{\\exp(f(x))}{\\sum_i \\exp(f(x_i))}$$',
    tags: ['AI Draft', 'Review'],
    source: 'ai',
    updatedAt: new Date().toISOString()
  };
}

export async function chatReply(messages: ChatMessage[]): Promise<string> {
  const settings = loadSettings();
  const latest = messages[messages.length - 1]?.content || '';
  if (settings.aiEndpoint && settings.aiApiKey) {
    return callOpenAICompatible(settings, latest, messages);
  }

  await new Promise((resolve) => setTimeout(resolve, 700));
  return [
    `可以。围绕 **${latest.slice(0, 40) || '该概念'}**，建议从定义、动机、数学形式和工程落地四层理解。`,
    '',
    '$$',
    '\\begin{aligned}',
    'p(y\\mid x) &= \\operatorname{softmax}(W h_x) \\\\',
    '\\mathcal{L} &= -\\sum_t \\log p(y_t\\mid y_{<t},x)',
    '\\end{aligned}',
    '$$',
    '',
    '- 定义层：先明确输入、输出和约束。',
    '- 动机层：关注它解决了什么瓶颈。',
    '- 实现层：检查数据、检索、推理或训练链路中的位置。',
    '',
    '如果回答中出现新的缩写，可以点击右侧提取按钮生成标准词条。'
  ].join('\n');
}

export async function extractEntryFromText(text: string): Promise<AcronymEntry> {
  const matched = text.match(/\b[A-Z][A-Z0-9]{1,8}\b/);
  return explainAcronym(matched?.[0] || 'AI');
}

async function callOpenAICompatible(settings: ReturnType<typeof loadSettings>, prompt: string, history?: ChatMessage[]) {
  const messages = history
    ? history.map((message) => ({ role: message.role, content: message.content }))
    : [{ role: 'user', content: prompt }];

  const response = await fetch(settings.aiEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.aiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: settings.aiModel,
      messages,
      temperature: 0.2
    })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
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
