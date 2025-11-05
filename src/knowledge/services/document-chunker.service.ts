import { Injectable, Logger } from '@nestjs/common';
import { ChunkingConfig, ProcessedChunk } from '../interfaces/document.interface';

@Injectable()
export class DocumentChunkerService {
  private readonly logger = new Logger(DocumentChunkerService.name);

  // Default chunking configuration
  private readonly defaultConfig: ChunkingConfig = {
    chunkSize: 1000, // characters
    chunkOverlap: 200, // characters
    separators: ['\n\n', '\n', '. ', ' '],
    keepSeparator: true,
  };

  /**
   * Chunk a document into smaller pieces
   */
  chunkDocument(
    content: string,
    config?: Partial<ChunkingConfig>,
  ): ProcessedChunk[] {
    const fullConfig = { ...this.defaultConfig, ...config };

    this.logger.debug(
      `Chunking document with size ${fullConfig.chunkSize} and overlap ${fullConfig.chunkOverlap}`,
    );

    const chunks = this.recursiveCharacterSplit(content, fullConfig);

    this.logger.log(`Created ${chunks.length} chunks from document`);
    return chunks;
  }

  /**
   * Recursive character text splitter
   * Tries to split on different separators in order of preference
   */
  private recursiveCharacterSplit(
    text: string,
    config: ChunkingConfig,
  ): ProcessedChunk[] {
    const chunks: ProcessedChunk[] = [];
    const separators = config.separators || this.defaultConfig.separators!;

    let startPos = 0;
    let chunkIndex = 0;

    while (startPos < text.length) {
      let endPos = Math.min(startPos + config.chunkSize, text.length);

      // If we're not at the end of the text, try to find a good split point
      if (endPos < text.length) {
        endPos = this.findBestSplitPoint(
          text,
          startPos,
          endPos,
          separators,
          config.keepSeparator,
        );
      }

      const chunkContent = text.slice(startPos, endPos).trim();

      if (chunkContent.length > 0) {
        chunks.push({
          content: chunkContent,
          chunkIndex,
          startPos,
          endPos,
          metadata: {
            length: chunkContent.length,
            wordCount: this.countWords(chunkContent),
          },
        });
        chunkIndex++;
      }

      // Move start position forward, accounting for overlap
      startPos = endPos - config.chunkOverlap;

      // Ensure we make progress
      if (startPos <= chunks[chunks.length - 1]?.startPos) {
        startPos = endPos;
      }
    }

    return chunks;
  }

  /**
   * Find the best split point using separators
   */
  private findBestSplitPoint(
    text: string,
    startPos: number,
    endPos: number,
    separators: string[],
    keepSeparator?: boolean,
  ): number {
    for (const separator of separators) {
      const searchStart = startPos;
      const searchEnd = endPos;
      const chunk = text.slice(searchStart, searchEnd);

      const lastIndex = chunk.lastIndexOf(separator);

      if (lastIndex !== -1) {
        const splitPos = searchStart + lastIndex;
        return keepSeparator ? splitPos + separator.length : splitPos;
      }
    }

    // No good split point found, return original end position
    return endPos;
  }

  /**
   * Chunk by token count (requires token counter service)
   */
  chunkByTokens(
    content: string,
    maxTokens: number,
    overlapTokens: number,
  ): ProcessedChunk[] {
    // Rough approximation: 1 token ≈ 4 characters
    const chunkSize = maxTokens * 4;
    const overlap = overlapTokens * 4;

    return this.chunkDocument(content, {
      chunkSize,
      chunkOverlap: overlap,
    });
  }

  /**
   * Chunk by sentences
   */
  chunkBySentences(
    content: string,
    sentencesPerChunk: number = 5,
    overlapSentences: number = 1,
  ): ProcessedChunk[] {
    const sentences = this.splitIntoSentences(content);
    const chunks: ProcessedChunk[] = [];

    let startPos = 0;
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i += sentencesPerChunk - overlapSentences) {
      const chunkSentences = sentences.slice(i, i + sentencesPerChunk);
      const chunkContent = chunkSentences.join(' ');
      const endPos = startPos + chunkContent.length;

      if (chunkContent.trim().length > 0) {
        chunks.push({
          content: chunkContent.trim(),
          chunkIndex,
          startPos,
          endPos,
          metadata: {
            sentenceCount: chunkSentences.length,
            wordCount: this.countWords(chunkContent),
          },
        });
        chunkIndex++;
      }

      startPos = endPos;
    }

    return chunks;
  }

  /**
   * Chunk by paragraphs
   */
  chunkByParagraphs(
    content: string,
    paragraphsPerChunk: number = 3,
    overlapParagraphs: number = 1,
  ): ProcessedChunk[] {
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const chunks: ProcessedChunk[] = [];

    let startPos = 0;
    let chunkIndex = 0;

    for (
      let i = 0;
      i < paragraphs.length;
      i += paragraphsPerChunk - overlapParagraphs
    ) {
      const chunkParagraphs = paragraphs.slice(i, i + paragraphsPerChunk);
      const chunkContent = chunkParagraphs.join('\n\n');
      const endPos = startPos + chunkContent.length;

      if (chunkContent.trim().length > 0) {
        chunks.push({
          content: chunkContent.trim(),
          chunkIndex,
          startPos,
          endPos,
          metadata: {
            paragraphCount: chunkParagraphs.length,
            wordCount: this.countWords(chunkContent),
          },
        });
        chunkIndex++;
      }

      startPos = endPos;
    }

    return chunks;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting (can be improved with NLP library)
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Calculate optimal chunk size based on document length
   */
  calculateOptimalChunkSize(documentLength: number): ChunkingConfig {
    // Heuristic: adjust chunk size based on document length
    if (documentLength < 5000) {
      return { chunkSize: 500, chunkOverlap: 100 };
    } else if (documentLength < 20000) {
      return { chunkSize: 1000, chunkOverlap: 200 };
    } else if (documentLength < 100000) {
      return { chunkSize: 1500, chunkOverlap: 300 };
    } else {
      return { chunkSize: 2000, chunkOverlap: 400 };
    }
  }

  /**
   * Merge small chunks
   */
  mergeSmallChunks(
    chunks: ProcessedChunk[],
    minChunkSize: number = 100,
  ): ProcessedChunk[] {
    const merged: ProcessedChunk[] = [];
    let currentChunk: ProcessedChunk | null = null;

    for (const chunk of chunks) {
      if (!currentChunk) {
        currentChunk = { ...chunk };
      } else if (currentChunk.content.length < minChunkSize) {
        // Merge with current chunk
        currentChunk.content += ' ' + chunk.content;
        currentChunk.endPos = chunk.endPos;
        currentChunk.metadata = {
          ...currentChunk.metadata,
          wordCount:
            (currentChunk.metadata?.wordCount || 0) +
            (chunk.metadata?.wordCount || 0),
        };
      } else {
        merged.push(currentChunk);
        currentChunk = { ...chunk };
      }
    }

    if (currentChunk) {
      merged.push(currentChunk);
    }

    // Re-index chunks
    return merged.map((chunk, index) => ({
      ...chunk,
      chunkIndex: index,
    }));
  }

  /**
   * Get chunking statistics
   */
  getChunkingStats(chunks: ProcessedChunk[]): {
    totalChunks: number;
    averageChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    totalCharacters: number;
  } {
    const sizes = chunks.map((c) => c.content.length);

    return {
      totalChunks: chunks.length,
      averageChunkSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,
      minChunkSize: Math.min(...sizes),
      maxChunkSize: Math.max(...sizes),
      totalCharacters: sizes.reduce((a, b) => a + b, 0),
    };
  }
}
