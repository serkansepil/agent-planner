"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AgentForm, AgentFormData } from "@/components/agents/AgentForm"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { ArrowLeft } from "lucide-react"
import { Agent } from "@/types"
import { agentsApi, handleApiError } from "@/lib/api"
import { useToast } from "@/lib/hooks/use-toast"

export default function EditAgentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleSubmit = async (data: AgentFormData) => {
    if (!agent) return

    setIsSubmitting(true)
    try {
      await agentsApi.update(agent.id, {
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt,
        isActive: data.isActive,
      })

      toast({
        title: "Success",
        description: "Agent updated successfully!",
      })

      router.push(`/agents/${agent.id}`)
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
        <LoadingSpinner size="lg" text="Loading agent..." />
      </div>
    )
  }

  if (!agent) {
    return null
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href={`/agents/${agent.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Agent</h1>
          <p className="text-muted-foreground">
            Update {agent.name}'s configuration
          </p>
        </div>
      </div>

      <AgentForm
        agent={agent}
        isLoading={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/agents/${agent.id}`)}
      />
    </div>
  )
}
