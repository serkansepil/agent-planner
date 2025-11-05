import Link from "next/link"
import { Agent } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, Edit, Trash2, Eye } from "lucide-react"

interface AgentCardProps {
  agent: Agent
  onDelete?: (id: string) => void
}

export function AgentCard({ agent, onDelete }: AgentCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              {agent.avatar ? (
                <img src={agent.avatar} alt={agent.name} className="h-10 w-10 rounded-lg" />
              ) : (
                <Bot className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  agent.isActive
                    ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                    : "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10"
                }`}>
                  {agent.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="line-clamp-2">
          {agent.description || "No description provided"}
        </CardDescription>

        <div className="text-sm text-muted-foreground">
          <p className="line-clamp-2">{agent.systemPrompt}</p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-xs text-muted-foreground">
            Created {new Date(agent.createdAt).toLocaleDateString()}
          </span>
          <div className="flex gap-2">
            <Link href={`/agents/${agent.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/agents/${agent.id}/edit`}>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(agent.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
