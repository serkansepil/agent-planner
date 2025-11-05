"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AgentForm, AgentFormData } from "@/components/agents/AgentForm"
import { agentsApi, handleApiError } from "@/lib/api"
import { useToast } from "@/lib/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NewAgentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: AgentFormData) => {
    setIsLoading(true)
    try {
      await agentsApi.create({
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt,
        config: {},
      })

      toast({
        title: "Success",
        description: "Agent created successfully!",
      })

      router.push("/agents")
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
        <Link href="/agents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Agent</h1>
          <p className="text-muted-foreground">
            Set up a new AI agent with custom instructions
          </p>
        </div>
      </div>

      <AgentForm
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/agents")}
      />
    </div>
  )
}
