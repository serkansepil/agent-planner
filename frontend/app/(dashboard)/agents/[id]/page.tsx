"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { ArrowLeft, Edit, Trash2, Bot } from "lucide-react"
import { Agent } from "@/types"
import { agentsApi, handleApiError } from "@/lib/api"
import { useToast } from "@/lib/hooks/use-toast"

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadAgent()
    }
  }, [params.id])

  const loadAgent = async () => {
    try {
      const data = await agentsApi.getById(params.id as string)
      setAgent(data)
    } catch (error) {
      toast({
        title: "Error",
        description: handleApiError(error),
        variant: "destructive",
      })
      router.push("/agents")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!agent || !confirm("Are you sure you want to delete this agent?")) {
      return
    }

    try {
      await agentsApi.delete(agent.id)
      toast({
        title: "Success",
        description: "Agent deleted successfully",
      })
      router.push("/agents")
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
        <LoadingSpinner size="lg" text="Loading agent..." />
      </div>
    )
  }

  if (!agent) {
    return null
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/agents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              {agent.avatar ? (
                <img src={agent.avatar} alt={agent.name} className="h-12 w-12 rounded-lg" />
              ) : (
                <Bot className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              <p className="text-muted-foreground">
                {agent.description || "No description"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/agents/${agent.id}/edit`}>
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
            <CardTitle>Agent Information</CardTitle>
            <CardDescription>Details about this AI agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium mt-1 ${
                  agent.isActive
                    ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                    : "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10"
                }`}>
                  {agent.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm mt-1">
                  {new Date(agent.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm mt-1">
                  {new Date(agent.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Agent ID</p>
                <p className="text-sm mt-1 font-mono">{agent.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
            <CardDescription>The instructions that define this agent's behavior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm whitespace-pre-wrap">{agent.systemPrompt}</p>
            </div>
          </CardContent>
        </Card>

        {agent.config && Object.keys(agent.config).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Additional settings for this agent</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                {JSON.stringify(agent.config, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
