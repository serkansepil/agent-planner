"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { WorkspaceForm, WorkspaceFormData } from "@/components/workspaces/WorkspaceForm"
import { workspacesApi, handleApiError } from "@/lib/api"
import { useToast } from "@/lib/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NewWorkspacePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: WorkspaceFormData) => {
    setIsLoading(true)
    try {
      await workspacesApi.create({
        name: data.name,
        description: data.description,
        config: {},
      })

      toast({
        title: "Success",
        description: "Workspace created successfully!",
      })

      router.push("/workspaces")
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/workspaces">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Workspace</h1>
          <p className="text-muted-foreground">
            Set up a new workspace to organize your agents
          </p>
        </div>
      </div>

      <WorkspaceForm
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/workspaces")}
      />
    </div>
  )
}
