"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { Workspace, Agent } from "@/types"
import { agentsApi, handleApiError } from "@/lib/api"
import { useToast } from "@/lib/hooks/use-toast"

const workspaceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  avatar: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  hostAgentId: z.string().uuid("Must select a host agent"),
  isActive: z.boolean().optional(),
})

export type WorkspaceFormData = z.infer<typeof workspaceSchema>

interface WorkspaceFormProps {
  workspace?: Workspace
  isLoading?: boolean
  onSubmit: (data: WorkspaceFormData) => void
  onCancel?: () => void
}

export function WorkspaceForm({ workspace, isLoading, onSubmit, onCancel }: WorkspaceFormProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: workspace
      ? {
          name: workspace.name,
          description: workspace.description || "",
          avatar: workspace.avatar || "",
          hostAgentId: workspace.hostAgentId,
          isActive: workspace.isActive,
        }
      : {
          isActive: true,
        },
  })

  const selectedHostAgentId = watch("hostAgentId")

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const data = await agentsApi.getAll()
        setAgents(data)
      } catch (error) {
        toast({
          title: "Error loading agents",
          description: handleApiError(error),
          variant: "destructive",
        })
      } finally {
        setLoadingAgents(false)
      }
    }
    loadAgents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Details</CardTitle>
          <CardDescription>
            Configure the basic settings for your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name *</Label>
            <Input
              id="name"
              placeholder="Customer Support Team"
              {...register("name")}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="hostAgentId">Host Agent *</Label>
            <Select
              value={selectedHostAgentId}
              onValueChange={(value) => setValue("hostAgentId", value)}
              disabled={isLoading || loadingAgents}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a host agent..." />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.hostAgentId && (
              <p className="text-sm text-destructive">{errors.hostAgentId.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              The primary agent that will manage this workspace
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="A workspace for managing customer support agents and conversations..."
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
              Optional: Provide a URL to an image for the workspace's avatar
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
              Active (workspace is available for use)
            </Label>
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
              {workspace ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>{workspace ? "Update Workspace" : "Create Workspace"}</>
          )}
        </Button>
      </div>
    </form>
  )
}
