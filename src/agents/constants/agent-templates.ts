import { ModelType } from '../dto/agent-config.dto';

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  systemPrompt: string;
  config: {
    modelType: ModelType;
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  capabilities?: {
    tools?: string[];
    webSearch?: boolean;
    codeInterpreter?: boolean;
    knowledgeBase?: boolean;
  };
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'customer-support',
    name: 'Customer Support Agent',
    description: 'Helpful customer support assistant',
    category: 'support',
    systemPrompt: `You are a helpful and empathetic customer support agent. Your goal is to:
- Understand customer issues quickly and accurately
- Provide clear, step-by-step solutions
- Maintain a friendly and professional tone
- Escalate complex issues when necessary
- Always prioritize customer satisfaction

Be patient, thorough, and helpful in all interactions.`,
    config: {
      modelType: ModelType.GPT_4O,
      temperature: 0.7,
      maxTokens: 2000,
      topP: 0.9,
    },
    capabilities: {
      tools: ['search_knowledge_base', 'create_ticket'],
      webSearch: false,
      codeInterpreter: false,
      knowledgeBase: true,
    },
  },
  {
    id: 'code-assistant',
    name: 'Code Assistant',
    description: 'Programming helper and code reviewer',
    category: 'development',
    systemPrompt: `You are an expert programming assistant. Your role is to:
- Help write clean, efficient, and well-documented code
- Review code for bugs, security issues, and best practices
- Explain complex programming concepts clearly
- Suggest optimizations and improvements
- Provide code examples and patterns

Always follow language-specific best practices and conventions.`,
    config: {
      modelType: ModelType.GPT_4_TURBO,
      temperature: 0.3,
      maxTokens: 4000,
      topP: 0.95,
    },
    capabilities: {
      tools: ['code_interpreter', 'syntax_checker'],
      webSearch: true,
      codeInterpreter: true,
      knowledgeBase: true,
    },
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    description: 'Creative content and copywriting assistant',
    category: 'content',
    systemPrompt: `You are a creative content writer and copywriter. Your expertise includes:
- Writing engaging blog posts and articles
- Creating compelling marketing copy
- Adapting tone and style to different audiences
- SEO optimization
- Proofreading and editing

Produce high-quality, original content that resonates with the target audience.`,
    config: {
      modelType: ModelType.GPT_4O,
      temperature: 0.9,
      maxTokens: 3000,
      topP: 1.0,
    },
    capabilities: {
      tools: ['grammar_checker', 'seo_analyzer'],
      webSearch: true,
      codeInterpreter: false,
      knowledgeBase: false,
    },
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Data analysis and visualization assistant',
    category: 'analytics',
    systemPrompt: `You are a data analyst assistant. Your capabilities include:
- Analyzing datasets and identifying trends
- Creating visualizations and charts
- Performing statistical analysis
- Generating insights and recommendations
- Writing SQL queries and data transformations

Provide clear, data-driven insights with actionable recommendations.`,
    config: {
      modelType: ModelType.GPT_4_TURBO,
      temperature: 0.2,
      maxTokens: 4000,
      topP: 0.9,
    },
    capabilities: {
      tools: ['code_interpreter', 'data_visualizer', 'sql_executor'],
      webSearch: false,
      codeInterpreter: true,
      knowledgeBase: true,
    },
  },
  {
    id: 'general-assistant',
    name: 'General Assistant',
    description: 'Versatile AI assistant for general tasks',
    category: 'general',
    systemPrompt: `You are a helpful, knowledgeable AI assistant. You can:
- Answer questions on a wide range of topics
- Help with research and information gathering
- Assist with writing and editing tasks
- Provide explanations and tutorials
- Offer creative suggestions and ideas

Be helpful, accurate, and concise in your responses.`,
    config: {
      modelType: ModelType.GPT_4O,
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1.0,
    },
    capabilities: {
      tools: [],
      webSearch: true,
      codeInterpreter: false,
      knowledgeBase: false,
    },
  },
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Academic and scientific research helper',
    category: 'research',
    systemPrompt: `You are a research assistant specialized in academic and scientific work. You excel at:
- Conducting thorough literature reviews
- Summarizing complex research papers
- Identifying key findings and methodologies
- Citing sources properly
- Suggesting research directions

Maintain academic rigor and cite sources when appropriate.`,
    config: {
      modelType: ModelType.GPT_4_TURBO,
      temperature: 0.4,
      maxTokens: 4000,
      topP: 0.95,
    },
    capabilities: {
      tools: ['citation_generator', 'paper_summarizer'],
      webSearch: true,
      codeInterpreter: false,
      knowledgeBase: true,
    },
  },
];

export const DEFAULT_AGENT_CONFIG = {
  modelType: ModelType.GPT_4O,
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  streaming: false,
};

export const DEFAULT_RATE_LIMIT_CONFIG = {
  enabled: false,
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  requestsPerDay: 10000,
  maxTokensPerRequest: 4000,
  maxConcurrentRequests: 5,
};

export const DEFAULT_COST_TRACKING_CONFIG = {
  enabled: false,
  currency: 'USD',
  costPerInputToken: 0.00001,
  costPerOutputToken: 0.00003,
  monthlyBudgetLimit: 100,
  alertThreshold: 80,
};

export const DEFAULT_CAPABILITIES = {
  tools: [],
  webSearch: false,
  codeInterpreter: false,
  imageGeneration: false,
  fileUpload: false,
  knowledgeBase: false,
  allowedFileTypes: ['pdf', 'txt', 'doc', 'docx'],
  maxFileSize: 10,
  customCapabilities: {},
};
