import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ==================== USERS ====================
  console.log('\n👤 Creating users...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      metadata: {
        department: 'Engineering',
        position: 'System Administrator',
      },
    },
  });
  console.log('  ✓ Created admin user:', adminUser.email);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password: hashedPassword,
      name: 'Demo User',
      role: 'USER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
      metadata: {
        preferences: {
          theme: 'dark',
          notifications: true,
        },
      },
    },
  });
  console.log('  ✓ Created demo user:', demoUser.email);

  // ==================== AGENTS ====================
  console.log('\n🤖 Creating agents...');

  const supportAgent = await prisma.agent.create({
    data: {
      name: 'Customer Support Agent',
      description: 'A helpful customer support AI assistant specialized in handling customer inquiries',
      systemPrompt:
        'You are a friendly and helpful customer support agent. Your goal is to assist users with their questions and resolve their issues promptly and professionally. Always be empathetic and solution-oriented.',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=support',
      config: {
        temperature: 0.7,
        maxTokens: 2000,
        model: 'gpt-4',
      },
      metadata: {
        version: '1.0',
        capabilities: ['customer_service', 'troubleshooting', 'faq'],
      },
      ownerId: demoUser.id,
    },
  });
  console.log('  ✓ Created agent:', supportAgent.name);

  const technicalAgent = await prisma.agent.create({
    data: {
      name: 'Technical Documentation Agent',
      description: 'An AI assistant specialized in technical documentation and code explanation',
      systemPrompt:
        'You are a technical documentation expert. Help users understand complex technical concepts, explain code, and create clear documentation. Use examples and diagrams when appropriate.',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=technical',
      config: {
        temperature: 0.5,
        maxTokens: 3000,
        model: 'gpt-4',
      },
      metadata: {
        version: '1.0',
        capabilities: ['documentation', 'code_review', 'technical_writing'],
      },
      ownerId: demoUser.id,
    },
  });
  console.log('  ✓ Created agent:', technicalAgent.name);

  const dataAgent = await prisma.agent.create({
    data: {
      name: 'Data Analysis Agent',
      description: 'An AI assistant specialized in data analysis and insights',
      systemPrompt:
        'You are a data analysis expert. Help users analyze data, create visualizations, and extract meaningful insights. Provide clear explanations of statistical concepts.',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=data',
      config: {
        temperature: 0.3,
        maxTokens: 2500,
        model: 'gpt-4',
      },
      metadata: {
        version: '1.0',
        capabilities: ['data_analysis', 'visualization', 'statistics'],
      },
      ownerId: adminUser.id,
    },
  });
  console.log('  ✓ Created agent:', dataAgent.name);

  // ==================== WORKSPACES ====================
  console.log('\n📁 Creating workspaces...');

  const supportWorkspace = await prisma.workspace.create({
    data: {
      name: 'Customer Support Workspace',
      description: 'Main workspace for handling customer support inquiries and tickets',
      avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=support',
      config: {
        autoAssign: true,
        priorityLevels: ['low', 'medium', 'high', 'urgent'],
      },
      metadata: {
        category: 'customer_service',
        tags: ['support', 'helpdesk'],
      },
      ownerId: demoUser.id,
    },
  });
  console.log('  ✓ Created workspace:', supportWorkspace.name);

  const devWorkspace = await prisma.workspace.create({
    data: {
      name: 'Development Workspace',
      description: 'Workspace for technical documentation and code assistance',
      avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=dev',
      config: {
        codeLanguages: ['javascript', 'typescript', 'python', 'go'],
        autoFormat: true,
      },
      metadata: {
        category: 'development',
        tags: ['coding', 'documentation'],
      },
      ownerId: demoUser.id,
    },
  });
  console.log('  ✓ Created workspace:', devWorkspace.name);

  const analyticsWorkspace = await prisma.workspace.create({
    data: {
      name: 'Analytics Workspace',
      description: 'Workspace for data analysis and business intelligence',
      avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=analytics',
      config: {
        dataConnections: ['postgresql', 'mongodb', 'csv'],
        visualizations: true,
      },
      metadata: {
        category: 'analytics',
        tags: ['data', 'insights', 'bi'],
      },
      ownerId: adminUser.id,
    },
  });
  console.log('  ✓ Created workspace:', analyticsWorkspace.name);

  // ==================== WORKSPACE AGENTS ====================
  console.log('\n🔗 Linking agents to workspaces...');

  await prisma.workspaceAgent.create({
    data: {
      workspaceId: supportWorkspace.id,
      agentId: supportAgent.id,
      role: 'primary',
      config: {
        priority: 1,
        autoRespond: true,
      },
      order: 1,
    },
  });
  console.log('  ✓ Linked support agent to support workspace');

  await prisma.workspaceAgent.create({
    data: {
      workspaceId: devWorkspace.id,
      agentId: technicalAgent.id,
      role: 'primary',
      config: {
        priority: 1,
        languages: ['typescript', 'javascript'],
      },
      order: 1,
    },
  });
  console.log('  ✓ Linked technical agent to dev workspace');

  await prisma.workspaceAgent.create({
    data: {
      workspaceId: devWorkspace.id,
      agentId: supportAgent.id,
      role: 'assistant',
      config: {
        priority: 2,
        backupAgent: true,
      },
      order: 2,
    },
  });
  console.log('  ✓ Linked support agent as assistant to dev workspace');

  await prisma.workspaceAgent.create({
    data: {
      workspaceId: analyticsWorkspace.id,
      agentId: dataAgent.id,
      role: 'primary',
      config: {
        priority: 1,
        dataAccess: true,
      },
      order: 1,
    },
  });
  console.log('  ✓ Linked data agent to analytics workspace');

  // ==================== SESSIONS ====================
  console.log('\n💬 Creating sessions...');

  const supportSession = await prisma.session.create({
    data: {
      workspaceId: supportWorkspace.id,
      userId: demoUser.id,
      title: 'Password Reset Assistance',
      status: 'COMPLETED',
      metadata: {
        priority: 'medium',
        category: 'account',
      },
      endedAt: new Date(),
    },
  });
  console.log('  ✓ Created session:', supportSession.title);

  const devSession = await prisma.session.create({
    data: {
      workspaceId: devWorkspace.id,
      userId: demoUser.id,
      title: 'NestJS Best Practices',
      status: 'ACTIVE',
      metadata: {
        topic: 'backend',
        language: 'typescript',
      },
    },
  });
  console.log('  ✓ Created session:', devSession.title);

  const analyticsSession = await prisma.session.create({
    data: {
      workspaceId: analyticsWorkspace.id,
      userId: adminUser.id,
      title: 'Q4 Sales Analysis',
      status: 'ACTIVE',
      metadata: {
        quarter: 'Q4',
        year: 2024,
      },
    },
  });
  console.log('  ✓ Created session:', analyticsSession.title);

  // ==================== MESSAGES ====================
  console.log('\n✉️  Creating messages...');

  await prisma.message.createMany({
    data: [
      {
        sessionId: supportSession.id,
        content: 'Hello! I need help with my account. I forgot my password.',
        role: 'USER',
        metadata: { sentiment: 'neutral' },
      },
      {
        sessionId: supportSession.id,
        agentId: supportAgent.id,
        content:
          "Hello! I'd be happy to help you with your account. I can assist you in resetting your password. What's the email address associated with your account?",
        role: 'ASSISTANT',
        tokens: 45,
        metadata: { confidence: 0.95 },
      },
      {
        sessionId: supportSession.id,
        content: 'It\'s demo@example.com',
        role: 'USER',
        metadata: { sentiment: 'neutral' },
      },
      {
        sessionId: supportSession.id,
        agentId: supportAgent.id,
        content:
          "Perfect! I've sent a password reset link to demo@example.com. Please check your inbox and follow the instructions in the email. The link will expire in 1 hour. Is there anything else I can help you with?",
        role: 'ASSISTANT',
        tokens: 52,
        metadata: { confidence: 0.98, action: 'password_reset_sent' },
      },
      {
        sessionId: supportSession.id,
        content: 'No, that\'s all. Thank you!',
        role: 'USER',
        metadata: { sentiment: 'positive' },
      },
      {
        sessionId: devSession.id,
        content: 'What are the best practices for structuring a NestJS application?',
        role: 'USER',
        metadata: { topic: 'architecture' },
      },
      {
        sessionId: devSession.id,
        agentId: technicalAgent.id,
        content:
          "Great question! Here are the key best practices for structuring a NestJS application:\n\n1. **Module Organization**: Group related features into modules\n2. **Dependency Injection**: Use NestJS's built-in DI system\n3. **DTOs**: Use Data Transfer Objects for validation\n4. **Services**: Keep business logic in services\n5. **Controllers**: Keep controllers thin, delegate to services\n\nWould you like me to elaborate on any of these points?",
        role: 'ASSISTANT',
        tokens: 98,
        metadata: { confidence: 0.92, code_examples: true },
      },
    ],
  });
  console.log('  ✓ Created demo messages');

  // ==================== INTEGRATIONS ====================
  console.log('\n🔌 Creating integrations...');

  const slackIntegration = await prisma.integration.create({
    data: {
      name: 'Slack Integration',
      description: 'Connect to Slack for real-time notifications and messaging',
      type: 'WEBHOOK',
      status: 'ACTIVE',
      config: {
        webhookUrl: 'https://hooks.slack.com/services/example',
        channel: '#customer-support',
      },
      credentials: {
        apiKey: 'sk_test_*********************',
      },
      metadata: {
        version: '1.0',
        features: ['notifications', 'messaging'],
      },
      workspaceId: supportWorkspace.id,
      userId: demoUser.id,
      lastSyncAt: new Date(),
    },
  });
  console.log('  ✓ Created integration:', slackIntegration.name);

  const databaseIntegration = await prisma.integration.create({
    data: {
      name: 'PostgreSQL Analytics DB',
      description: 'Connection to analytics database for data queries',
      type: 'DATABASE',
      status: 'ACTIVE',
      config: {
        host: 'analytics-db.example.com',
        port: 5432,
        database: 'analytics',
      },
      credentials: {
        username: 'analytics_user',
        password: 'encrypted_password_here',
      },
      metadata: {
        version: '14.5',
        readOnly: true,
      },
      workspaceId: analyticsWorkspace.id,
      userId: adminUser.id,
      lastSyncAt: new Date(),
    },
  });
  console.log('  ✓ Created integration:', databaseIntegration.name);

  const githubIntegration = await prisma.integration.create({
    data: {
      name: 'GitHub Integration',
      description: 'Connect to GitHub for repository access and code analysis',
      type: 'OAUTH',
      status: 'ACTIVE',
      config: {
        scopes: ['repo', 'read:user'],
        repository: 'example/agent-planner',
      },
      credentials: {
        accessToken: 'ghp_*********************',
        refreshToken: 'ghr_*********************',
      },
      metadata: {
        installationId: '12345678',
      },
      workspaceId: devWorkspace.id,
      userId: demoUser.id,
      lastSyncAt: new Date(),
    },
  });
  console.log('  ✓ Created integration:', githubIntegration.name);

  // ==================== KNOWLEDGE DOCUMENTS ====================
  console.log('\n📚 Creating knowledge documents...');

  await prisma.knowledgeDocument.create({
    data: {
      title: 'Getting Started Guide',
      filename: 'getting-started-guide.md',
      content:
        'This guide will help you get started with our platform. First, create an account and verify your email. Then, set up your first workspace and invite team members. You can create agents to automate tasks and integrate with your favorite tools.',
      summary: 'A comprehensive guide for new users to get started with the platform',
      source: 'internal',
      mimeType: 'text/markdown',
      fileSize: 1024,
      status: 'COMPLETED',
      tags: ['guide', 'onboarding', 'tutorial'],
      metadata: {
        author: 'Documentation Team',
        lastReviewed: new Date().toISOString(),
      },
      workspaceId: supportWorkspace.id,
      userId: demoUser.id,
    },
  });
  console.log('  ✓ Created document: Getting Started Guide');

  await prisma.knowledgeDocument.create({
    data: {
      title: 'API Documentation',
      filename: 'api-documentation.md',
      content:
        'Our REST API provides programmatic access to all platform features. Authentication is done via JWT tokens. All endpoints require authentication except /auth/login and /auth/register. Rate limiting is applied at 100 requests per minute.',
      summary: 'Complete API reference and authentication guide',
      source: 'internal',
      sourceUrl: 'https://docs.example.com/api',
      mimeType: 'text/markdown',
      fileSize: 2048,
      status: 'COMPLETED',
      tags: ['api', 'documentation', 'reference'],
      metadata: {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
      },
      workspaceId: devWorkspace.id,
      agentId: technicalAgent.id,
      userId: demoUser.id,
    },
  });
  console.log('  ✓ Created document: API Documentation');

  await prisma.knowledgeDocument.create({
    data: {
      title: 'Data Analysis Best Practices',
      filename: 'data-analysis-best-practices.md',
      content:
        'When analyzing data, always start with exploratory data analysis (EDA). Check for missing values, outliers, and data distributions. Use appropriate statistical tests and visualizations. Document your assumptions and methodology.',
      summary: 'Best practices for conducting data analysis',
      source: 'internal',
      mimeType: 'text/markdown',
      fileSize: 1536,
      status: 'COMPLETED',
      tags: ['analytics', 'best-practices', 'methodology'],
      metadata: {
        difficulty: 'intermediate',
        topic: 'data-science',
      },
      workspaceId: analyticsWorkspace.id,
      agentId: dataAgent.id,
      userId: adminUser.id,
    },
  });
  console.log('  ✓ Created document: Data Analysis Best Practices');

  await prisma.knowledgeDocument.create({
    data: {
      title: 'Troubleshooting Common Issues',
      filename: 'troubleshooting-common-issues.md',
      content:
        'Common issues and their solutions: 1. Login problems - Clear cookies and cache. 2. Slow performance - Check network connection. 3. Integration errors - Verify API credentials. 4. Data sync issues - Check last sync timestamp.',
      summary: 'Solutions to frequently encountered problems',
      source: 'internal',
      mimeType: 'text/markdown',
      fileSize: 896,
      status: 'COMPLETED',
      tags: ['troubleshooting', 'faq', 'support'],
      metadata: {
        category: 'support',
        priority: 'high',
      },
      workspaceId: supportWorkspace.id,
      agentId: supportAgent.id,
      userId: demoUser.id,
    },
  });
  console.log('  ✓ Created document: Troubleshooting Common Issues');

  // ==================== SUMMARY ====================
  console.log('\n✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - Users: 2`);
  console.log(`  - Agents: 3`);
  console.log(`  - Workspaces: 3`);
  console.log(`  - Workspace-Agent Links: 4`);
  console.log(`  - Sessions: 3`);
  console.log(`  - Messages: 7`);
  console.log(`  - Integrations: 3`);
  console.log(`  - Knowledge Documents: 4`);
  console.log('\n🔐 Login credentials:');
  console.log('  Admin: admin@example.com / password123');
  console.log('  User:  demo@example.com / password123');
}

main()
  .catch((e) => {
    console.error('\n❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
