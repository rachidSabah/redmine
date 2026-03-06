'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Project } from '@/types'
import {
  MoreVertical,
  Users,
  Ticket,
  Calendar,
  Eye,
  Lock,
  Globe,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface ProjectCardProps {
  project: Project
  onClick: () => void
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-500/10 text-green-500 border-green-500/20',
  COMPLETED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  ON_HOLD: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  ARCHIVED: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const visibilityIcons: Record<string, React.ElementType> = {
  PRIVATE: Lock,
  PUBLIC: Globe,
  INTERNAL: Eye,
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const VisibilityIcon = visibilityIcons[project.visibility] || Lock

  return (
    <Card
      className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Header with color bar */}
        <div
          className="h-2 rounded-t-lg"
          style={{ backgroundColor: project.color || '#6B7280' }}
        />

        <div className="p-4 space-y-3">
          {/* Title and actions */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: project.color || '#6B7280' }}
              >
                {project.icon || '📁'}
              </div>
              <div className="min-w-0">
                <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <VisibilityIcon className="h-3 w-3" />
                  <span>{project.visibility.toLowerCase()}</span>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuItem>Archive</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description || 'No description provided'}
          </p>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Ticket className="h-3 w-3" />
              <span>{project._count?.tickets || 0} tickets</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{project._count?.members || 0} members</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Badge
              variant="outline"
              className={cn('text-xs', statusColors[project.status])}
            >
              {project.status.replace('_', ' ')}
            </Badge>
            {project.endDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Due {format(new Date(project.endDate), 'MMM d')}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
