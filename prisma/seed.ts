import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create a demo user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password: hashedPassword,
      name: 'Demo User',
      role: 'USER',
    },
  });

  console.log('Created user:', user.email);

  // Create a demo agent
  const agent = await prisma.agent.create({
    data: {
      name: 'Customer Support Agent',
      description: 'A helpful customer support AI assistant',
      systemPrompt:
        'You are a friendly and helpful customer support agent. Your goal is to assist users with their questions and resolve their issues promptly and professionally.',
      config: {
        temperature: 0.7,
        maxTokens: 2000,
      },
      ownerId: user.id,
    },
  });

  console.log('Created agent:', agent.name);

  // Create a demo workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Customer Support Workspace',
      description: 'Main workspace for customer support interactions',
      ownerId: user.id,
      hostAgentId: agent.id,
    },
  });

  console.log('Created workspace:', workspace.name);

  // Create a demo session
  const session = await prisma.session.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      status: 'ACTIVE',
    },
  });

  console.log('Created session:', session.id);

  // Create demo messages
  await prisma.message.createMany({
    data: [
      {
        sessionId: session.id,
        content: 'Hello! I need help with my account.',
        role: 'USER',
      },
      {
        sessionId: session.id,
        content:
          "Hello! I'd be happy to help you with your account. What specifically would you like assistance with?",
        role: 'ASSISTANT',
        agentId: agent.id,
      },
      {
        sessionId: session.id,
        content: 'I forgot my password and need to reset it.',
        role: 'USER',
      },
      {
        sessionId: session.id,
        content:
          "I can help you reset your password. I'll send you a password reset link to your registered email address. Please check your inbox and follow the instructions in the email.",
        role: 'ASSISTANT',
        agentId: agent.id,
      },
    ],
  });

  console.log('Created demo messages');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
