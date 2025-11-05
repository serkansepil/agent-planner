# Agent Planner Frontend

A modern Next.js frontend application for managing AI agents, workspaces, and conversations.

## Features

- **Authentication**: Login, Register, and Forgot Password pages
- **Agent Management**: Create, update, and manage AI agents
- **Workspace Management**: Organize agents into workspaces
- **Real-time Chat**: WebSocket-based chat interface with LLM streaming
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **Type-safe**: Full TypeScript support with type definitions from backend API

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Forms**: React Hook Form + Zod validation
- **API Client**: Axios
- **Real-time**: Socket.io Client

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API running on `http://localhost:3000`

### Installation

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Configure environment variables:

Create a `.env.local` file with:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3001](http://localhost:3001) in your browser.

## Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Authentication pages
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration page
│   │   └── forgot-password/     # Forgot password page
│   ├── (dashboard)/             # Dashboard pages (TODO)
│   │   ├── agents/              # Agent management
│   │   ├── workspaces/          # Workspace management
│   │   ├── chat/                # Chat interface
│   │   ├── analytics/           # Analytics dashboard
│   │   └── settings/            # User settings
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
├── components/
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── label.tsx
│   │   └── toast.tsx
│   ├── agents/                  # Agent-related components (TODO)
│   ├── workspaces/              # Workspace-related components (TODO)
│   ├── chat/                    # Chat-related components (TODO)
│   └── shared/                  # Shared components (TODO)
├── lib/
│   ├── api/                     # API client
│   │   ├── client.ts            # Axios instance & interceptors
│   │   ├── auth.ts              # Auth API calls
│   │   ├── agents.ts            # Agents API calls
│   │   ├── workspaces.ts        # Workspaces API calls
│   │   └── chat.ts              # Chat API calls
│   ├── hooks/                   # Custom React hooks
│   │   └── use-toast.ts         # Toast notification hook
│   └── utils/                   # Utility functions
│       └── cn.ts                # Class name merger
├── types/                       # TypeScript type definitions
│   └── index.ts                 # All type definitions
└── styles/                      # Additional styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Authentication Flow

1. Users can register a new account or login with existing credentials
2. JWT token is stored in localStorage upon successful authentication
3. API client automatically includes the token in all requests
4. Unauthorized responses (401) automatically redirect to login

## API Integration

All API calls are centralized in the `lib/api` directory:

- **authApi**: Authentication operations (login, register, profile)
- **agentsApi**: Agent CRUD operations
- **workspacesApi**: Workspace CRUD operations
- **chatApi**: Session and message operations

## Styling

The application uses Tailwind CSS with a custom design system:

- CSS variables for theming (light/dark mode support)
- shadcn/ui components for consistent UI
- Responsive design with mobile-first approach

## Next Steps

- [ ] Implement dashboard layout with sidebar
- [ ] Create agent management pages
- [ ] Create workspace management pages
- [ ] Implement real-time chat interface
- [ ] Add analytics dashboard
- [ ] Add user settings page
- [ ] Implement WebSocket connection for real-time features
- [ ] Add error boundaries and loading states
- [ ] Implement forgot password API endpoint
- [ ] Add file upload functionality
- [ ] Add dark mode toggle

## Contributing

This is a monorepo project. The backend API is located in the parent directory.

## License

UNLICENSED
