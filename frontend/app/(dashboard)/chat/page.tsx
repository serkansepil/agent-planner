import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chat</h1>
        <p className="text-muted-foreground">
          Interact with your AI agents in real-time
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Real-time Chat Interface</CardTitle>
          </div>
          <CardDescription>
            Connect to your agents and start conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Chat Interface Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              We're building a powerful real-time chat interface with WebSocket support, streaming responses, and multi-agent conversations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
