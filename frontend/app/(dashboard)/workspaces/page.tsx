"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WorkspaceCard } from "@/components/workspaces/WorkspaceCard"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Plus, Search } from "lucide-react"
import { Workspace } from "@/types"
import { workspacesApi, handleApiError } from "@/lib/api"
import { useToast } from "@/lib/hooks/use-toast"
import { Input } from "@/components/ui/input"

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [filteredWorkspaces, setFilteredWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    loadWorkspaces()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = workspaces.filter(
        (workspace) =>
          workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          workspace.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredWorkspaces(filtered)
    } else {
      setFilteredWorkspaces(workspaces)
    }
  }, [searchQuery, workspaces])

  const loadWorkspaces = async () => {
    try {
      const data = await workspacesApi.getAll()
      setWorkspaces(data)
      setFilteredWorkspaces(data)
    } catch (error) {
      toast({
        title: "Error",
        description: handleApiError(error),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workspace?")) {
      return
    }

    try {
      await workspacesApi.delete(id)
      toast({
        title: "Success",
        description: "Workspace deleted successfully",
      })
      loadWorkspaces()
    } catch (error) {
      toast({
        title: "Error",
        description: handleApiError(error),
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" text="Loading workspaces..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground">
            Organize your agents into workspaces for different projects
          </p>
        </div>
        <Link href="/workspaces/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Workspace
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredWorkspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Plus className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No workspaces found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? "Try adjusting your search query"
              : "Get started by creating your first workspace"}
          </p>
          {!searchQuery && (
            <Link href="/workspaces/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Workspace
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
