import { Injectable, Logger } from '@nestjs/common';
import { RAGContext, Citation, ConfidenceScore } from '../interfaces/rag.interface';

@Injectable()
export class ConfidenceScorerService {
  private readonly logger = new Logger(ConfidenceScorerService.name);

  /**
   * Calculate confidence score for RAG response
   */
  calculateConfidence(
    query: string,
    context: RAGContext,
    answer: string,
    citations: Citation[],
  ): ConfidenceScore {
    // Calculate individual factors
    const contextRelevance = this.scoreContextRelevance(context);
    const contextCoverage = this.scoreContextCoverage(context, query);
    const answerCoherence = this.scoreAnswerCoherence(answer);
    const citationStrength = this.scoreCitationStrength(citations, context);

    // Weighted average for overall score
    const overall =
      contextRelevance * 0.3 +
      contextCoverage * 0.25 +
      answerCoherence * 0.25 +
      citationStrength * 0.2;

    const explanation = this.generateExplanation({
      contextRelevance,
      contextCoverage,
      answerCoherence,
      citationStrength,
      overall,
    });

    this.logger.debug(`Confidence score: ${(overall * 100).toFixed(1)}%`);

    return {
      overall,
      factors: {
        contextRelevance,
        contextCoverage,
        answerCoherence,
        citationStrength,
      },
      explanation,
    };
  }

  /**
   * Score context relevance (based on similarity scores)
   */
  private scoreContextRelevance(context: RAGContext): number {
    if (context.chunks.length === 0) {
      return 0;
    }

    // Average relevance score
    const avgRelevance = context.averageRelevance;

    // Penalize if top relevance is low
    const topRelevance = context.relevanceScores[0] || 0;

    // Weighted score
    return avgRelevance * 0.6 + topRelevance * 0.4;
  }

  /**
   * Score context coverage (how well context covers the query)
   */
  private scoreContextCoverage(context: RAGContext, query: string): number {
    if (context.chunks.length === 0) {
      return 0;
    }

    // Extract key terms from query
    const queryTerms = this.extractKeyTerms(query);

    // Check how many query terms appear in context
    const contextText = context.chunks.map((c) => c.content.toLowerCase()).join(' ');
    const matchedTerms = queryTerms.filter((term) => contextText.includes(term));

    const termCoverage = matchedTerms.length / queryTerms.length;

    // Consider diversity of sources
    const uniqueDocs = new Set(context.chunks.map((c) => c.documentId)).size;
    const diversityBonus = Math.min(uniqueDocs / 3, 1) * 0.1;

    return Math.min(termCoverage + diversityBonus, 1);
  }

  /**
   * Score answer coherence (length, structure, completeness)
   */
  private scoreAnswerCoherence(answer: string): number {
    if (!answer || answer.length === 0) {
      return 0;
    }

    let score = 0.5; // Base score

    // Length check (not too short, not too long)
    const wordCount = answer.split(/\s+/).length;
    if (wordCount >= 20 && wordCount <= 500) {
      score += 0.2;
    } else if (wordCount >= 10) {
      score += 0.1;
    }

    // Check for structure (multiple sentences)
    const sentenceCount = answer.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
    if (sentenceCount >= 2) {
      score += 0.15;
    }

    // Check for hedging language (indicates uncertainty)
    const hedgingPhrases = [
      'might',
      'possibly',
      'perhaps',
      'unclear',
      'not sure',
      'may be',
      'could be',
    ];
    const hasHedging = hedgingPhrases.some((phrase) =>
      answer.toLowerCase().includes(phrase),
    );
    if (hasHedging) {
      score -= 0.1;
    }

    // Check for explicit uncertainty statements
    const uncertaintyPhrases = [
      'i don\'t know',
      'no information',
      'not found',
      'cannot determine',
    ];
    const hasUncertainty = uncertaintyPhrases.some((phrase) =>
      answer.toLowerCase().includes(phrase),
    );
    if (hasUncertainty) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(score, 1));
  }

  /**
   * Score citation strength
   */
  private scoreCitationStrength(citations: Citation[], context: RAGContext): number {
    if (citations.length === 0) {
      return 0;
    }

    // Base score from number of citations
    const citationCountScore = Math.min(citations.length / 3, 1) * 0.4;

    // Score from citation relevance
    const avgCitationRelevance =
      citations.reduce((sum, c) => sum + c.relevanceScore, 0) / citations.length;
    const relevanceScore = avgCitationRelevance * 0.4;

    // Score from coverage (how much of context is cited)
    const citedChunkIds = new Set<string>();
    citations.forEach((c) => c.chunkIds.forEach((id) => citedChunkIds.add(id)));
    const coverage = citedChunkIds.size / context.chunks.length;
    const coverageScore = coverage * 0.2;

    return citationCountScore + relevanceScore + coverageScore;
  }

  /**
   * Extract key terms from query
   */
  private extractKeyTerms(query: string): string[] {
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
      'on',
      'with',
      'about',
      'can',
      'could',
      'would',
      'should',
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Generate explanation for confidence score
   */
  private generateExplanation(scores: {
    contextRelevance: number;
    contextCoverage: number;
    answerCoherence: number;
    citationStrength: number;
    overall: number;
  }): string {
    const parts: string[] = [];

    // Overall assessment
    if (scores.overall >= 0.8) {
      parts.push('High confidence response.');
    } else if (scores.overall >= 0.6) {
      parts.push('Moderate confidence response.');
    } else if (scores.overall >= 0.4) {
      parts.push('Low confidence response.');
    } else {
      parts.push('Very low confidence response.');
    }

    // Context relevance
    if (scores.contextRelevance >= 0.7) {
      parts.push('Retrieved context is highly relevant.');
    } else if (scores.contextRelevance < 0.5) {
      parts.push('Retrieved context has limited relevance.');
    }

    // Context coverage
    if (scores.contextCoverage >= 0.7) {
      parts.push('Query topics are well covered in context.');
    } else if (scores.contextCoverage < 0.5) {
      parts.push('Context may not fully cover all query aspects.');
    }

    // Answer coherence
    if (scores.answerCoherence >= 0.7) {
      parts.push('Answer is well-structured and complete.');
    } else if (scores.answerCoherence < 0.5) {
      parts.push('Answer may lack detail or clarity.');
    }

    // Citation strength
    if (scores.citationStrength >= 0.7) {
      parts.push('Strong source citations.');
    } else if (scores.citationStrength < 0.5) {
      parts.push('Limited source citations.');
    }

    return parts.join(' ');
  }

  /**
   * Calculate confidence threshold recommendation
   */
  getConfidenceThreshold(
    confidenceScore: ConfidenceScore,
  ): 'reliable' | 'review' | 'unreliable' {
    if (confidenceScore.overall >= 0.7) {
      return 'reliable';
    } else if (confidenceScore.overall >= 0.5) {
      return 'review';
    } else {
      return 'unreliable';
    }
  }

  /**
   * Detect potential hallucination indicators
   */
  detectHallucinationRisk(
    answer: string,
    context: RAGContext,
  ): {
    risk: 'low' | 'medium' | 'high';
    indicators: string[];
  } {
    const indicators: string[] = [];

    // Check for specific claims not in context
    const answerTerms = this.extractKeyTerms(answer);
    const contextText = context.chunks.map((c) => c.content.toLowerCase()).join(' ');
    const unmatchedTerms = answerTerms.filter((term) => !contextText.includes(term));

    if (unmatchedTerms.length > answerTerms.length * 0.5) {
      indicators.push('Many terms in answer not found in context');
    }

    // Check for absolute statements
    const absoluteWords = ['always', 'never', 'all', 'none', 'every', 'no one'];
    const hasAbsolutes = absoluteWords.some((word) =>
      answer.toLowerCase().includes(word),
    );
    if (hasAbsolutes) {
      indicators.push('Contains absolute statements');
    }

    // Check for specific numbers/dates not in context
    const answerNumbers = answer.match(/\d+/g) || [];
    const contextNumbers = contextText.match(/\d+/g) || [];
    const unmatchedNumbers = answerNumbers.filter(
      (num) => !contextNumbers.includes(num),
    );
    if (unmatchedNumbers.length > 0) {
      indicators.push('Contains numbers not found in context');
    }

    // Calculate risk level
    let risk: 'low' | 'medium' | 'high' = 'low';
    if (indicators.length >= 3) {
      risk = 'high';
    } else if (indicators.length >= 2) {
      risk = 'medium';
    }

    return { risk, indicators };
  }

  /**
   * Calculate answer-context alignment score
   */
  calculateAlignmentScore(answer: string, context: RAGContext): number {
    if (context.chunks.length === 0) {
      return 0;
    }

    const answerTerms = this.extractKeyTerms(answer);
    const contextText = context.chunks.map((c) => c.content.toLowerCase()).join(' ');

    const matchedTerms = answerTerms.filter((term) => contextText.includes(term));

    return matchedTerms.length / answerTerms.length;
  }
}
