import Link from "next/link"
import { Workspace } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, Edit, Trash2, Eye, Users } from "lucide-react"

interface WorkspaceCardProps {
  workspace: Workspace
  onDelete?: (id: string) => void
}

export function WorkspaceCard({ workspace, onDelete }: WorkspaceCardProps) {
  const agentCount = workspace.workspaceAgents?.length || 0

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              {workspace.avatar ? (
                <img src={workspace.avatar} alt={workspace.name} className="h-10 w-10 rounded-lg" />
              ) : (
                <Briefcase className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{workspace.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  workspace.isActive
                    ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                    : "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10"
                }`}>
                  {workspace.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="line-clamp-2">
          {workspace.description || "No description provided"}
        </CardDescription>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{agentCount} {agentCount === 1 ? "agent" : "agents"}</span>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-xs text-muted-foreground">
            Created {new Date(workspace.createdAt).toLocaleDateString()}
          </span>
          <div className="flex gap-2">
            <Link href={`/workspaces/${workspace.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/workspaces/${workspace.id}/edit`}>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(workspace.id)}
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
