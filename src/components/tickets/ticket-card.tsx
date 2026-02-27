'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Ticket } from '@/types'
import { cn } from '@/lib/utils'
import {
  GripVertical,
  MessageSquare,
  Paperclip,
  Clock,
} from 'lucide-react'

interface TicketCardProps {
  ticket: Ticket
  onClick: () => void
}

const priorityColors: Record<string, string> = {
  CRITICAL: 'border-l-red-500 bg-red-500/5',
  HIGH: 'border-l-orange-500 bg-orange-500/5',
  MEDIUM: 'border-l-yellow-500 bg-yellow-500/5',
  LOW: 'border-l-green-500 bg-green-500/5',
}

const typeIcons: Record<string, string> = {
  TASK: '✓',
  BUG: '🐛',
  FEATURE: '✨',
  STORY: '📖',
  EPIC: '🎯',
  SUBTASK: '○',
}

const typeColors: Record<string, string> = {
  TASK: 'text-blue-500',
  BUG: 'text-red-500',
  FEATURE: 'text-purple-500',
  STORY: 'text-green-500',
  EPIC: 'text-amber-500',
  SUBTASK: 'text-gray-500',
}

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-pointer hover:shadow-md transition-all duration-200 border-l-4',
        priorityColors[ticket.priority],
        isDragging && 'shadow-lg opacity-50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs', typeColors[ticket.type])}>
                {typeIcons[ticket.type]}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {ticket.key}
              </span>
            </div>

            {/* Title */}
            <h4 className="text-sm font-medium line-clamp-2 mb-2">
              {ticket.title}
            </h4>

            {/* Labels */}
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant="outline" className="text-xs">
                {ticket.type}
              </Badge>
              {ticket.storyPoints && (
                <Badge variant="secondary" className="text-xs">
                  {ticket.storyPoints} SP
                </Badge>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {ticket.dueDate && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(ticket.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
              {ticket.assignee && (
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {ticket.assignee.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>

            {/* Progress bar for in-progress tickets */}
            {ticket.progress > 0 && ticket.progress < 100 && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${ticket.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
