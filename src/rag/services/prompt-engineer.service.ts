import { Injectable, Logger } from '@nestjs/common';
import { RAGContext } from '../interfaces/rag.interface';

export interface PromptTemplate {
  name: string;
  systemPrompt: string;
  contextTemplate: string;
  userTemplate: string;
  includeInstructions: boolean;
  includeCitationInstructions: boolean;
}

@Injectable()
export class PromptEngineerService {
  private readonly logger = new Logger(PromptEngineerService.name);

  private readonly defaultTemplates: Record<string, PromptTemplate> = {
    detailed: {
      name: 'Detailed RAG',
      systemPrompt: `You are a helpful AI assistant with access to a knowledge base.
Your role is to provide accurate, detailed answers based on the provided context.
Always cite sources and indicate confidence levels.`,
      contextTemplate: `# Relevant Context

The following information has been retrieved from the knowledge base:

{context}

---`,
      userTemplate: `Based on the context provided above, please answer the following question:

{query}

Guidelines:
- Base your answer primarily on the provided context
- Cite specific documents when making claims
- If the context doesn't fully answer the question, acknowledge the limitations
- Be concise but thorough`,
      includeInstructions: true,
      includeCitationInstructions: true,
    },
    concise: {
      name: 'Concise RAG',
      systemPrompt: `You are a helpful AI assistant. Provide concise, accurate answers based on the given context.`,
      contextTemplate: `Context:\n\n{context}\n\n---\n\n`,
      userTemplate: `Question: {query}\n\nProvide a concise answer based on the context above.`,
      includeInstructions: false,
      includeCitationInstructions: false,
    },
    conversational: {
      name: 'Conversational RAG',
      systemPrompt: `You are a friendly AI assistant helping users understand information from a knowledge base.
Explain concepts clearly and engage in natural conversation.`,
      contextTemplate: `I have some relevant information that might help:\n\n{context}\n\n`,
      userTemplate: `{query}\n\nPlease help me understand this based on the information above.`,
      includeInstructions: false,
      includeCitationInstructions: true,
    },
    analytical: {
      name: 'Analytical RAG',
      systemPrompt: `You are an analytical AI assistant. Provide structured, well-reasoned answers with clear logic.
Break down complex topics and explain your reasoning.`,
      contextTemplate: `# Source Material\n\n{context}\n\n# Analysis Required\n\n`,
      userTemplate: `{query}\n\nPlease provide a structured analysis:
1. Direct Answer
2. Supporting Evidence
3. Considerations/Limitations
4. Sources Used`,
      includeInstructions: true,
      includeCitationInstructions: true,
    },
  };

  /**
   * Build complete prompt with context
   */
  buildPrompt(
    query: string,
    context: RAGContext,
    templateName: string = 'detailed',
    customInstructions?: string,
  ): {
    systemPrompt: string;
    userPrompt: string;
    totalTokensEstimate: number;
  } {
    const template = this.defaultTemplates[templateName] || this.defaultTemplates.detailed;

    // Format context
    const formattedContext = this.formatContext(context);

    // Build system prompt
    let systemPrompt = template.systemPrompt;
    if (customInstructions) {
      systemPrompt += `\n\nAdditional Instructions:\n${customInstructions}`;
    }

    // Build user prompt with context
    let contextSection = template.contextTemplate.replace('{context}', formattedContext);
    let userPrompt = template.userTemplate.replace('{query}', query);

    // Add citation instructions if enabled
    if (template.includeCitationInstructions) {
      userPrompt += this.getCitationInstructions();
    }

    // Combine context and query
    userPrompt = contextSection + userPrompt;

    // Estimate tokens (rough approximation)
    const totalTokensEstimate = Math.ceil(
      (systemPrompt.length + userPrompt.length) / 4,
    );

    this.logger.debug(`Built prompt with ~${totalTokensEstimate} tokens`);

    return {
      systemPrompt,
      userPrompt,
      totalTokensEstimate,
    };
  }

  /**
   * Format context for inclusion in prompt
   */
  private formatContext(context: RAGContext): string {
    const parts: string[] = [];

    for (let i = 0; i < context.chunks.length; i++) {
      const chunk = context.chunks[i];
      const docNumber = i + 1;

      parts.push(
        `[Document ${docNumber}: ${chunk.document.title}]\n${chunk.content}`,
      );
    }

    return parts.join('\n\n');
  }

  /**
   * Get citation instructions
   */
  private getCitationInstructions(): string {
    return `\n\nImportant: When citing information, reference documents by their title (e.g., "According to [Document Title]...").`;
  }

  /**
   * Build fallback prompt (when no context available)
   */
  buildFallbackPrompt(query: string): {
    systemPrompt: string;
    userPrompt: string;
  } {
    return {
      systemPrompt: `You are a helpful AI assistant. The user has asked a question, but no relevant context was found in the knowledge base.
Provide a helpful response while clearly indicating that your answer is based on general knowledge, not specific documentation.`,
      userPrompt: `${query}\n\nNote: No relevant information was found in the knowledge base for this query. Please provide a general answer and suggest that the user may need to:
1. Rephrase their question
2. Check if the information exists in the knowledge base
3. Consult additional sources`,
    };
  }

  /**
   * Extract query intent for better prompt engineering
   */
  analyzeQueryIntent(query: string): {
    type: 'factual' | 'procedural' | 'conceptual' | 'comparative' | 'exploratory';
    keywords: string[];
    complexity: 'simple' | 'moderate' | 'complex';
  } {
    const lowerQuery = query.toLowerCase();

    // Detect question type
    let type: 'factual' | 'procedural' | 'conceptual' | 'comparative' | 'exploratory' =
      'factual';

    if (
      lowerQuery.includes('how to') ||
      lowerQuery.includes('steps') ||
      lowerQuery.includes('procedure')
    ) {
      type = 'procedural';
    } else if (
      lowerQuery.includes('what is') ||
      lowerQuery.includes('define') ||
      lowerQuery.includes('explain')
    ) {
      type = 'conceptual';
    } else if (
      lowerQuery.includes('compare') ||
      lowerQuery.includes('difference') ||
      lowerQuery.includes('versus')
    ) {
      type = 'comparative';
    } else if (
      lowerQuery.includes('why') ||
      lowerQuery.includes('explore') ||
      lowerQuery.includes('analyze')
    ) {
      type = 'exploratory';
    }

    // Extract keywords (simple approach)
    const stopWords = new Set([
      'what',
      'how',
      'why',
      'when',
      'where',
      'who',
      'is',
      'are',
      'the',
      'a',
      'an',
      'to',
      'of',
      'in',
      'for',
    ]);
    const keywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

    // Assess complexity
    const wordCount = query.split(/\s+/).length;
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (wordCount > 20) {
      complexity = 'complex';
    } else if (wordCount > 10) {
      complexity = 'moderate';
    }

    return { type, keywords, complexity };
  }

  /**
   * Optimize prompt based on query intent
   */
  optimizePromptForIntent(
    query: string,
    context: RAGContext,
    intent: ReturnType<typeof this.analyzeQueryIntent>,
  ): { systemPrompt: string; userPrompt: string } {
    let templateName = 'detailed';

    switch (intent.type) {
      case 'procedural':
        templateName = 'analytical'; // Use structured format for procedures
        break;
      case 'conceptual':
        templateName = 'conversational'; // Use friendly explanation
        break;
      case 'comparative':
        templateName = 'analytical'; // Use structured comparison
        break;
      case 'exploratory':
        templateName = 'analytical'; // Use detailed analysis
        break;
      default:
        templateName = 'detailed';
    }

    const prompt = this.buildPrompt(query, context, templateName);
    return {
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
    };
  }

  /**
   * Add conversation history to prompt
   */
  buildPromptWithHistory(
    query: string,
    context: RAGContext,
    conversationHistory: Array<{ role: string; content: string }>,
    templateName: string = 'detailed',
  ): {
    messages: Array<{ role: string; content: string }>;
  } {
    const prompt = this.buildPrompt(query, context, templateName);

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: prompt.systemPrompt },
      ...conversationHistory,
      { role: 'user', content: prompt.userPrompt },
    ];

    return { messages };
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): string[] {
    return Object.keys(this.defaultTemplates);
  }

  /**
   * Get template details
   */
  getTemplate(name: string): PromptTemplate | null {
    return this.defaultTemplates[name] || null;
  }

  /**
   * Register custom template
   */
  registerTemplate(name: string, template: PromptTemplate): void {
    this.defaultTemplates[name] = template;
    this.logger.log(`Registered custom template: ${name}`);
  }
}
