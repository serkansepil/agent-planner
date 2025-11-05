"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { Agent } from "@/types"

const agentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  systemPrompt: z.string().min(10, "System prompt must be at least 10 characters"),
  avatar: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
})

export type AgentFormData = z.infer<typeof agentSchema>

interface AgentFormProps {
  agent?: Agent
  isLoading?: boolean
  onSubmit: (data: AgentFormData) => void
  onCancel?: () => void
}

export function AgentForm({ agent, isLoading, onSubmit, onCancel }: AgentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: agent
      ? {
          name: agent.name,
          description: agent.description || "",
          systemPrompt: agent.systemPrompt,
          avatar: agent.avatar || "",
          isActive: agent.isActive,
        }
      : {
          isActive: true,
        },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Configure the basic settings for your AI agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name *</Label>
            <Input
              id="name"
              placeholder="Customer Support Agent"
              {...register("name")}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="A helpful assistant that provides customer support..."
              rows={3}
              {...register("description")}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar URL</Label>
            <Input
              id="avatar"
              type="url"
              placeholder="https://example.com/avatar.png"
              {...register("avatar")}
              disabled={isLoading}
            />
            {errors.avatar && (
              <p className="text-sm text-destructive">{errors.avatar.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Optional: Provide a URL to an image for the agent's avatar
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              {...register("isActive")}
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active (agent can be used in workspaces)
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Prompt *</CardTitle>
          <CardDescription>
            Define how this agent should behave and respond
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              id="systemPrompt"
              placeholder="You are a friendly and helpful customer support agent. You should always..."
              rows={8}
              {...register("systemPrompt")}
              disabled={isLoading}
            />
            {errors.systemPrompt && (
              <p className="text-sm text-destructive">{errors.systemPrompt.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              This prompt defines the agent's personality, knowledge, and behavior
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {agent ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>{agent ? "Update Agent" : "Create Agent"}</>
          )}
        </Button>
      </div>
    </form>
  )
}
