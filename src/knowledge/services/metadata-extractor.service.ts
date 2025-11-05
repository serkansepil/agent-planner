import { Injectable, Logger } from '@nestjs/common';
import { DocumentMetadata } from '../interfaces/document.interface';

@Injectable()
export class MetadataExtractorService {
  private readonly logger = new Logger(MetadataExtractorService.name);

  /**
   * Extract comprehensive metadata from document content and existing metadata
   */
  extractMetadata(
    content: string,
    existingMetadata: Partial<DocumentMetadata>,
    filename: string,
  ): DocumentMetadata {
    const metadata: DocumentMetadata = {
      ...existingMetadata,
      title: existingMetadata.title || this.extractTitle(content, filename),
      wordCount: existingMetadata.wordCount || this.countWords(content),
      characterCount: content.length,
      lineCount: this.countLines(content),
      language: this.detectLanguage(content),
      readingTime: this.estimateReadingTime(content),
      keywords: this.extractKeywords(content),
      summary: this.generateSummary(content),
    };

    this.logger.debug(`Extracted metadata for: ${metadata.title}`);
    return metadata;
  }

  /**
   * Extract title from content
   */
  private extractTitle(content: string, filename: string): string {
    // Try to find title in first few lines
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length > 0) {
      const firstLine = lines[0].trim();

      // Check if first line looks like a title (short, not too long)
      if (firstLine.length < 100 && firstLine.length > 0) {
        return firstLine;
      }
    }

    // Fallback to filename
    return filename.replace(/\.[^/.]+$/, '');
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Count lines in content
   */
  private countLines(content: string): number {
    return content.split('\n').length;
  }

  /**
   * Detect language (simple heuristic)
   */
  private detectLanguage(content: string): string {
    // Simple language detection based on common words
    const sample = content.toLowerCase().slice(0, 1000);

    const englishWords = ['the', 'and', 'is', 'to', 'in', 'of', 'a', 'for'];
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es'];
    const frenchWords = ['le', 'de', 'un', 'et', 'la', 'est', 'pour', 'dans'];

    const englishScore = englishWords.filter((word) =>
      sample.includes(` ${word} `),
    ).length;
    const spanishScore = spanishWords.filter((word) =>
      sample.includes(` ${word} `),
    ).length;
    const frenchScore = frenchWords.filter((word) =>
      sample.includes(` ${word} `),
    ).length;

    const maxScore = Math.max(englishScore, spanishScore, frenchScore);

    if (maxScore === 0) return 'unknown';
    if (englishScore === maxScore) return 'en';
    if (spanishScore === maxScore) return 'es';
    if (frenchScore === maxScore) return 'fr';

    return 'unknown';
  }

  /**
   * Estimate reading time in minutes
   */
  private estimateReadingTime(content: string): number {
    const wordCount = this.countWords(content);
    const wordsPerMinute = 200; // Average reading speed
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Extract keywords (simple frequency-based)
   */
  private extractKeywords(content: string, topN: number = 10): string[] {
    // Convert to lowercase and split into words
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);

    // Filter out common stop words
    const stopWords = new Set([
      'the',
      'is',
      'at',
      'which',
      'on',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'with',
      'to',
      'for',
      'of',
      'as',
      'by',
      'that',
      'this',
      'it',
      'from',
      'be',
      'are',
      'was',
      'were',
      'been',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
    ]);

    const filteredWords = words.filter(
      (word) => word.length > 3 && !stopWords.has(word),
    );

    // Count word frequency
    const wordFreq = new Map<string, number>();
    for (const word of filteredWords) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    // Sort by frequency and return top N
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word]) => word);
  }

  /**
   * Generate a brief summary (first few sentences)
   */
  private generateSummary(content: string, maxLength: number = 200): string {
    // Get first few sentences
    const sentences = content
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let summary = '';
    for (const sentence of sentences) {
      if (summary.length + sentence.length > maxLength) {
        break;
      }
      summary += sentence + '. ';
    }

    return summary.trim() || content.slice(0, maxLength) + '...';
  }

  /**
   * Extract dates from content
   */
  extractDates(content: string): Date[] {
    const datePattern =
      /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{1,2}-\d{1,2}-\d{4}\b/g;
    const matches = content.match(datePattern);

    if (!matches) return [];

    return matches
      .map((dateStr) => {
        try {
          return new Date(dateStr);
        } catch {
          return null;
        }
      })
      .filter((date): date is Date => date !== null && !isNaN(date.getTime()));
  }

  /**
   * Extract URLs from content
   */
  extractUrls(content: string): string[] {
    const urlPattern =
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const matches = content.match(urlPattern);
    return matches || [];
  }

  /**
   * Extract email addresses from content
   */
  extractEmails(content: string): string[] {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = content.match(emailPattern);
    return matches || [];
  }

  /**
   * Extract phone numbers from content
   */
  extractPhoneNumbers(content: string): string[] {
    const phonePattern =
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/g;
    const matches = content.match(phonePattern);
    return matches || [];
  }

  /**
   * Analyze document structure
   */
  analyzeStructure(content: string): {
    hasHeadings: boolean;
    hasBulletPoints: boolean;
    hasNumberedLists: boolean;
    hasCodeBlocks: boolean;
    hasTables: boolean;
  } {
    return {
      hasHeadings: /^#{1,6}\s+/m.test(content) || /^[A-Z][^\n]+\n[=\-]+$/m.test(content),
      hasBulletPoints: /^[\*\-\+]\s+/m.test(content),
      hasNumberedLists: /^\d+\.\s+/m.test(content),
      hasCodeBlocks: /```[\s\S]*?```/.test(content) || /`[^`]+`/.test(content),
      hasTables: /\|.*\|/.test(content),
    };
  }

  /**
   * Calculate document complexity score
   */
  calculateComplexityScore(content: string): number {
    const wordCount = this.countWords(content);
    const avgWordLength =
      content.replace(/\s+/g, '').length / Math.max(wordCount, 1);
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgSentenceLength = wordCount / Math.max(sentenceCount, 1);

    // Simple complexity score based on word length and sentence length
    const score = (avgWordLength / 10 + avgSentenceLength / 20) * 50;

    return Math.min(Math.max(score, 0), 100); // Clamp between 0 and 100
  }

  /**
   * Extract entities (simple NER)
   */
  extractEntities(content: string): {
    persons: string[];
    organizations: string[];
    locations: string[];
  } {
    // Very simple pattern-based entity extraction
    // In production, use a proper NLP library

    // Capitalized words that appear multiple times might be entities
    const capitalizedWords = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];

    const wordFreq = new Map<string, number>();
    for (const word of capitalizedWords) {
      if (word.length > 2) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    // Words that appear 2+ times are likely entities
    const entities = Array.from(wordFreq.entries())
      .filter(([, count]) => count >= 2)
      .map(([word]) => word)
      .slice(0, 20);

    // For simplicity, just return them all as "persons"
    // A real implementation would classify them properly
    return {
      persons: entities,
      organizations: [],
      locations: [],
    };
  }
}
