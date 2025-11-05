import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { marked } from 'marked';
import { createHash } from 'crypto';
import { ExtractedDocument, DocumentMetadata } from '../interfaces/document.interface';

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);

  private readonly supportedMimeTypes = {
    'application/pdf': this.extractPDF.bind(this),
    'text/plain': this.extractText.bind(this),
    'text/markdown': this.extractMarkdown.bind(this),
    'application/json': this.extractJSON.bind(this),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      this.extractDOCX.bind(this),
  };

  /**
   * Check if file type is supported
   */
  isSupported(mimeType: string): boolean {
    return mimeType in this.supportedMimeTypes;
  }

  /**
   * Get list of supported mime types
   */
  getSupportedMimeTypes(): string[] {
    return Object.keys(this.supportedMimeTypes);
  }

  /**
   * Extract text and metadata from a file buffer
   */
  async extractDocument(
    buffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<ExtractedDocument> {
    if (!this.isSupported(mimeType)) {
      throw new BadRequestException(
        `Unsupported file type: ${mimeType}. Supported types: ${this.getSupportedMimeTypes().join(', ')}`,
      );
    }

    try {
      const extractor = this.supportedMimeTypes[mimeType];
      const result = await extractor(buffer, filename);

      // Add file size and hash to metadata
      result.metadata.fileSize = buffer.length;
      result.metadata.fileHash = this.generateHash(buffer);

      this.logger.log(`Extracted document: ${filename} (${mimeType})`);
      return result;
    } catch (error) {
      this.logger.error(`Error extracting document ${filename}:`, error);
      throw new BadRequestException(
        `Failed to extract content from ${filename}: ${error.message}`,
      );
    }
  }

  /**
   * Extract text from PDF
   */
  private async extractPDF(
    buffer: Buffer,
    filename: string,
  ): Promise<ExtractedDocument> {
    const data = await pdfParse(buffer);

    return {
      content: data.text,
      metadata: {
        title: filename,
        pageCount: data.numpages,
        wordCount: this.countWords(data.text),
        info: data.info,
      },
    };
  }

  /**
   * Extract text from plain text file
   */
  private async extractText(
    buffer: Buffer,
    filename: string,
  ): Promise<ExtractedDocument> {
    const content = buffer.toString('utf-8');

    return {
      content,
      metadata: {
        title: filename,
        wordCount: this.countWords(content),
        encoding: 'utf-8',
      },
    };
  }

  /**
   * Extract text from Markdown
   */
  private async extractMarkdown(
    buffer: Buffer,
    filename: string,
  ): Promise<ExtractedDocument> {
    const markdown = buffer.toString('utf-8');

    // Convert markdown to plain text (remove formatting)
    const html = await marked(markdown);
    const plainText = this.stripHtml(html);

    return {
      content: plainText,
      metadata: {
        title: this.extractMarkdownTitle(markdown) || filename,
        wordCount: this.countWords(plainText),
        encoding: 'utf-8',
        originalFormat: 'markdown',
      },
    };
  }

  /**
   * Extract text from JSON
   */
  private async extractJSON(
    buffer: Buffer,
    filename: string,
  ): Promise<ExtractedDocument> {
    const jsonText = buffer.toString('utf-8');
    const data = JSON.parse(jsonText);

    // Convert JSON to readable text
    const content = JSON.stringify(data, null, 2);

    return {
      content,
      metadata: {
        title: data.title || filename,
        wordCount: this.countWords(content),
        encoding: 'utf-8',
        originalFormat: 'json',
      },
    };
  }

  /**
   * Extract text from DOCX
   */
  private async extractDOCX(
    buffer: Buffer,
    filename: string,
  ): Promise<ExtractedDocument> {
    const result = await mammoth.extractRawText({ buffer });

    return {
      content: result.value,
      metadata: {
        title: filename,
        wordCount: this.countWords(result.value),
        messages: result.messages,
      },
    };
  }

  /**
   * Generate SHA-256 hash of file content
   */
  generateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Extract title from markdown (first h1)
   */
  private extractMarkdownTitle(markdown: string): string | null {
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }

  /**
   * Validate file size
   */
  validateFileSize(size: number, maxSizeMB: number = 10): void {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (size > maxBytes) {
      throw new BadRequestException(
        `File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
      );
    }
  }

  /**
   * Detect file type from buffer
   */
  async detectMimeType(buffer: Buffer, filename: string): Promise<string> {
    // Simple detection based on file extension as fallback
    const ext = filename.split('.').pop()?.toLowerCase();

    const extensionMap: Record<string, string> = {
      pdf: 'application/pdf',
      txt: 'text/plain',
      md: 'text/markdown',
      json: 'application/json',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    return extensionMap[ext || ''] || 'application/octet-stream';
  }
}
