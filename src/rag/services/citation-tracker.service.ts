import { Injectable, Logger } from '@nestjs/common';
import { RAGContext, Citation } from '../interfaces/rag.interface';

@Injectable()
export class CitationTrackerService {
  private readonly logger = new Logger(CitationTrackerService.name);

  /**
   * Generate citations from context
   */
  generateCitations(context: RAGContext, answer?: string): Citation[] {
    const citationMap = new Map<string, Citation>();

    // Group chunks by document
    for (const chunk of context.chunks) {
      const docId = chunk.documentId;

      if (!citationMap.has(docId)) {
        citationMap.set(docId, {
          documentId: docId,
          documentTitle: chunk.document.title,
          filename: chunk.document.filename,
          chunkIds: [],
          relevanceScore: 0,
          excerpts: [],
        });
      }

      const citation = citationMap.get(docId)!;
      citation.chunkIds.push(chunk.chunkId);
      citation.relevanceScore = Math.max(citation.relevanceScore, chunk.relevance);
      citation.excerpts.push(this.createExcerpt(chunk.content));
    }

    // Convert map to array and sort by relevance
    const citations = Array.from(citationMap.values()).sort(
      (a, b) => b.relevanceScore - a.relevanceScore,
    );

    // If answer is provided, try to detect which citations were actually used
    if (answer) {
      return this.filterUsedCitations(citations, answer);
    }

    this.logger.debug(`Generated ${citations.length} citations`);
    return citations;
  }

  /**
   * Create excerpt from chunk content
   */
  private createExcerpt(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) {
      return content;
    }

    // Try to break at sentence boundary
    const truncated = content.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastQuestion = truncated.lastIndexOf('?');
    const lastExclamation = truncated.lastIndexOf('!');

    const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);

    if (lastSentenceEnd > maxLength * 0.7) {
      return content.substring(0, lastSentenceEnd + 1);
    }

    return truncated + '...';
  }

  /**
   * Filter citations to only those likely used in answer
   */
  private filterUsedCitations(citations: Citation[], answer: string): Citation[] {
    const usedCitations: Citation[] = [];
    const answerLower = answer.toLowerCase();

    for (const citation of citations) {
      // Check if document title is mentioned
      const titleMentioned = answerLower.includes(citation.documentTitle.toLowerCase());

      // Check if key phrases from excerpts appear in answer
      const hasMatchingContent = citation.excerpts.some((excerpt) => {
        const keyPhrases = this.extractKeyPhrases(excerpt);
        return keyPhrases.some((phrase) => answerLower.includes(phrase.toLowerCase()));
      });

      if (titleMentioned || hasMatchingContent) {
        usedCitations.push(citation);
      }
    }

    // If no citations detected as used, return top 3 by relevance
    if (usedCitations.length === 0) {
      return citations.slice(0, 3);
    }

    this.logger.debug(`Filtered to ${usedCitations.length} used citations`);
    return usedCitations;
  }

  /**
   * Extract key phrases from text (simple approach)
   */
  private extractKeyPhrases(text: string, minLength: number = 15): string[] {
    // Split into sentences
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= minLength);

    // Also extract noun phrases (simplified - just consecutive capitalized words)
    const capitalizedPhrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];

    return [...sentences.slice(0, 2), ...capitalizedPhrases];
  }

  /**
   * Format citations for display
   */
  formatCitations(citations: Citation[], format: 'markdown' | 'html' | 'text' = 'markdown'): string {
    if (citations.length === 0) {
      return '';
    }

    switch (format) {
      case 'markdown':
        return this.formatMarkdown(citations);
      case 'html':
        return this.formatHtml(citations);
      case 'text':
        return this.formatText(citations);
      default:
        return this.formatMarkdown(citations);
    }
  }

  /**
   * Format as markdown
   */
  private formatMarkdown(citations: Citation[]): string {
    const lines = ['## Sources\n'];

    citations.forEach((citation, index) => {
      lines.push(`${index + 1}. **${citation.documentTitle}**`);
      lines.push(`   - File: ${citation.filename}`);
      lines.push(`   - Relevance: ${(citation.relevanceScore * 100).toFixed(1)}%`);
      if (citation.excerpts.length > 0) {
        lines.push(`   - Excerpt: "${citation.excerpts[0]}"`);
      }
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Format as HTML
   */
  private formatHtml(citations: Citation[]): string {
    const items = citations.map((citation, index) => {
      const excerpt = citation.excerpts[0] || '';
      return `
        <li>
          <strong>${index + 1}. ${citation.documentTitle}</strong>
          <ul>
            <li>File: ${citation.filename}</li>
            <li>Relevance: ${(citation.relevanceScore * 100).toFixed(1)}%</li>
            ${excerpt ? `<li>Excerpt: <em>"${excerpt}"</em></li>` : ''}
          </ul>
        </li>
      `;
    });

    return `<h3>Sources</h3><ol>${items.join('')}</ol>`;
  }

  /**
   * Format as plain text
   */
  private formatText(citations: Citation[]): string {
    const lines = ['Sources:\n'];

    citations.forEach((citation, index) => {
      lines.push(`${index + 1}. ${citation.documentTitle}`);
      lines.push(`   File: ${citation.filename}`);
      lines.push(`   Relevance: ${(citation.relevanceScore * 100).toFixed(1)}%`);
      if (citation.excerpts.length > 0) {
        lines.push(`   Excerpt: "${citation.excerpts[0]}"`);
      }
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Validate citations against context
   */
  validateCitations(citations: Citation[], context: RAGContext): boolean {
    const contextDocIds = new Set(context.chunks.map((c) => c.documentId));

    for (const citation of citations) {
      if (!contextDocIds.has(citation.documentId)) {
        this.logger.warn(`Citation ${citation.documentId} not found in context`);
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate citation coverage (what percentage of context was cited)
   */
  calculateCitationCoverage(citations: Citation[], context: RAGContext): number {
    const citedChunkIds = new Set<string>();
    for (const citation of citations) {
      citation.chunkIds.forEach((id) => citedChunkIds.add(id));
    }

    const totalChunks = context.chunks.length;
    const citedChunks = context.chunks.filter((c) =>
      citedChunkIds.has(c.chunkId),
    ).length;

    return citedChunks / totalChunks;
  }

  /**
   * Merge citations for same document
   */
  mergeCitations(citations: Citation[]): Citation[] {
    const merged = new Map<string, Citation>();

    for (const citation of citations) {
      if (merged.has(citation.documentId)) {
        const existing = merged.get(citation.documentId)!;
        existing.chunkIds.push(...citation.chunkIds);
        existing.excerpts.push(...citation.excerpts);
        existing.relevanceScore = Math.max(
          existing.relevanceScore,
          citation.relevanceScore,
        );
      } else {
        merged.set(citation.documentId, { ...citation });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Generate citation graph (which documents cite each other)
   */
  generateCitationGraph(citations: Citation[]): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    for (const citation of citations) {
      graph[citation.documentId] = citations
        .filter((c) => c.documentId !== citation.documentId)
        .map((c) => c.documentId);
    }

    return graph;
  }
}
