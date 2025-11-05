export interface ExtractedDocument {
  content: string;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdDate?: Date;
  modifiedDate?: Date;
  pageCount?: number;
  wordCount?: number;
  language?: string;
  encoding?: string;
  [key: string]: any;
}

export interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
  separators?: string[];
  keepSeparator?: boolean;
}

export interface ProcessedChunk {
  content: string;
  chunkIndex: number;
  startPos: number;
  endPos: number;
  metadata?: Record<string, any>;
}
