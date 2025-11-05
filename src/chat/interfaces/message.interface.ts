// Define MessageRole enum locally until Prisma is generated
export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
  TOOL = 'TOOL',
}

export interface IMessage {
  id: string;
  sessionId: string;
  agentId?: string;
  content: string;
  role: MessageRole;
  metadata?: Record<string, any>;
  tokens?: number;
  parentMessageId?: string;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  reactions?: IMessageReaction[];
  attachments?: IMessageAttachment[];
  replies?: IMessage[];
}

export interface IMessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface IMessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ITypingStatus {
  sessionId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface IUserPresence {
  userId: string;
  sessionId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
}

export interface IMessageDeliveryStatus {
  messageId: string;
  userId: string;
  delivered: boolean;
  seen: boolean;
  deliveredAt?: Date;
  seenAt?: Date;
}
