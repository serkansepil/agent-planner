"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WorkspaceForm, WorkspaceFormData } from "@/components/workspaces/WorkspaceForm"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { ArrowLeft } from "lucide-react"
import { Workspace } from "@/types"
import { workspacesApi, handleApiError } from "@/lib/api"
import { useToast } from "@/lib/hooks/use-toast"

export default function EditWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleSubmit = async (data: WorkspaceFormData) => {
    if (!workspace) return

    setIsSubmitting(true)
    try {
      await workspacesApi.update(workspace.id, {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
      })

      toast({
        title: "Success",
        description: "Workspace updated successfully!",
      })

      router.push(`/workspaces/${workspace.id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: handleApiError(error),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
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
      <div className="flex items-center gap-4">
        <Link href={`/workspaces/${workspace.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Workspace</h1>
          <p className="text-muted-foreground">
            Update {workspace.name}'s configuration
          </p>
        </div>
      </div>

      <WorkspaceForm
        workspace={workspace}
        isLoading={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/workspaces/${workspace.id}`)}
      />
    </div>
  )
}
