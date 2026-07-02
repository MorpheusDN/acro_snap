import type { AcronymEntry } from '../types';

export const sampleEntries: AcronymEntry[] = [
  {
    id: 'llm',
    acronym: 'LLM',
    fullName: 'Large Language Model',
    chinese: '大语言模型',
    domain: 'AI / NLP',
    summary: '一种基于海量语料训练的生成式模型，能够进行文本理解、推理、生成、代码辅助和知识问答。',
    formula: '$$p(x)=\\prod_{t=1}^{T}p(x_t\\mid x_{<t})$$',
    tags: [
      { en: 'NLP', zh: '自然语言处理' },
      { en: 'Transformer', zh: 'Transformer 架构' },
      { en: 'Generation', zh: '生成模型' }
    ],
    source: 'local',
    updatedAt: '2026-05-05T00:00:00.000Z'
  },
  {
    id: 'rag',
    acronym: 'RAG',
    fullName: 'Retrieval-Augmented Generation',
    chinese: '检索增强生成',
    domain: 'AI / Knowledge',
    summary: '将外部知识检索结果注入生成模型上下文，用于降低幻觉并提升可追溯性。',
    formula: '$$y=\\operatorname{LLM}(q,\\operatorname{Retrieve}(q,\\mathcal{D}))$$',
    tags: [
      { en: 'Retrieval', zh: '检索' },
      { en: 'Vector DB', zh: '向量数据库' },
      { en: 'LLM', zh: '大语言模型' }
    ],
    source: 'local',
    updatedAt: '2026-05-05T00:00:00.000Z'
  },
  {
    id: 'cnn',
    acronym: 'CNN',
    fullName: 'Convolutional Neural Network',
    chinese: '卷积神经网络',
    domain: 'AI / Vision',
    summary: '使用卷积核提取局部空间特征的神经网络，常用于图像分类、检测和分割。',
    formula: '$$(X*K)_{i,j}=\\sum_m\\sum_n X_{i+m,j+n}K_{m,n}$$',
    tags: [
      { en: 'Vision', zh: '计算机视觉' },
      { en: 'Deep Learning', zh: '深度学习' }
    ],
    source: 'local',
    updatedAt: '2026-05-05T00:00:00.000Z'
  },
  {
    id: 'rlhf',
    acronym: 'RLHF',
    fullName: 'Reinforcement Learning from Human Feedback',
    chinese: '基于人类反馈的强化学习',
    domain: 'AI Alignment',
    summary: '通过人类偏好数据训练奖励模型，再用强化学习优化生成模型行为。',
    formula: '$$\\max_\\pi \\mathbb{E}_{x\\sim D,y\\sim\\pi}[r_\\phi(x,y)-\\beta\\operatorname{KL}(\\pi\\|\\pi_0)]$$',
    tags: [
      { en: 'Alignment', zh: '对齐' },
      { en: 'Preference', zh: '偏好学习' },
      { en: 'Reinforcement Learning', zh: '强化学习' }
    ],
    source: 'local',
    updatedAt: '2026-05-05T00:00:00.000Z'
  }
];
