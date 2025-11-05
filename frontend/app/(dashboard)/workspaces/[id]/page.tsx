"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { ArrowLeft, Edit, Trash2, Briefcase } from "lucide-react"
import { Workspace } from "@/types"
import { workspacesApi, handleApiError } from "@/lib/api"
import { useToast } from "@/lib/hooks/use-toast"

export default function WorkspaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadWorkspace()
    }
  }, [params.id])

  const loadWorkspace = async () => {
    try {
      const data = await workspacesApi.getById(params.id as string)
      setWorkspace(data)
    } catch (error) {
      toast({
        title: "Error",
        description: handleApiError(error),
        variant: "destructive",
      })
      router.push("/workspaces")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!workspace || !confirm("Are you sure you want to delete this workspace?")) {
      return
    }

    try {
      await workspacesApi.delete(workspace.id)
      toast({
        title: "Success",
        description: "Workspace deleted successfully",
      })
      router.push("/workspaces")
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
        <LoadingSpinner size="lg" text="Loading workspace..." />
      </div>
    )
  }

  if (!workspace) {
    return null
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/workspaces">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              {workspace.avatar ? (
                <img src={workspace.avatar} alt={workspace.name} className="h-12 w-12 rounded-lg" />
              ) : (
                <Briefcase className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{workspace.name}</h1>
              <p className="text-muted-foreground">
                {workspace.description || "No description"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/workspaces/${workspace.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Workspace Information</CardTitle>
            <CardDescription>Details about this workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium mt-1 ${
                  workspace.isActive
                    ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                    : "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10"
                }`}>
                  {workspace.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm mt-1">
                  {new Date(workspace.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm mt-1">
                  {new Date(workspace.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Workspace ID</p>
                <p className="text-sm mt-1 font-mono">{workspace.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agents in this Workspace</CardTitle>
            <CardDescription>AI agents assigned to this workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              Agent management coming soon...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
