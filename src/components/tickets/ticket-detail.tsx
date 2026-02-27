'use client'

import React, { useState } from 'react'
import { Ticket } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  X,
  Edit2,
  Trash2,
  MessageSquare,
  Paperclip,
  Clock,
  User,
  Calendar,
  Tag,
  GitBranch,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

interface TicketDetailProps {
  ticket: Ticket | null
  open: boolean
  onClose: () => void
  onUpdate: (ticket: Partial<Ticket>) => void
  onDelete: () => void
}

const priorityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500 text-black',
  LOW: 'bg-green-500 text-white',
}

const statusColors: Record<string, string> = {
  BACKLOG: 'bg-gray-500 text-white',
  TODO: 'bg-slate-500 text-white',
  IN_PROGRESS: 'bg-blue-500 text-white',
  IN_REVIEW: 'bg-purple-500 text-white',
  TESTING: 'bg-amber-500 text-white',
  DONE: 'bg-green-500 text-white',
  CANCELLED: 'bg-red-500 text-white',
}

const typeIcons: Record<string, string> = {
  TASK: '✓',
  BUG: '🐛',
  FEATURE: '✨',
  STORY: '📖',
  EPIC: '🎯',
  SUBTASK: '○',
}

export function TicketDetail({ ticket, open, onClose, onUpdate, onDelete }: TicketDetailProps) {
  const [newComment, setNewComment] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  if (!ticket) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <div className="flex h-full">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <DialogHeader className="p-4 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-muted-foreground">
                      {ticket.key}
                    </span>
                    <Badge className={cn('text-xs', priorityColors[ticket.priority])}>
                      {ticket.priority}
                    </Badge>
                    <Badge className={cn('text-xs', statusColors[ticket.status])}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <DialogTitle className="text-xl">{ticket.title}</DialogTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={onDelete}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Content */}
            <ScrollArea className="flex-1 p-4">
              <Tabs defaultValue="details">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="comments">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Comments
                  </TabsTrigger>
                  <TabsTrigger value="time">
                    <Clock className="h-4 w-4 mr-1" />
                    Time Logs
                  </TabsTrigger>
                  <TabsTrigger value="attachments">
                    <Paperclip className="h-4 w-4 mr-1" />
                    Attachments
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    {isEditing ? (
                      <Textarea
                        defaultValue={ticket.description || ''}
                        placeholder="Add a description..."
                        rows={6}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {ticket.description || 'No description provided.'}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Progress</h4>
                      <span className="text-sm text-muted-foreground">
                        {ticket.progress}%
                      </span>
                    </div>
                    <Progress value={ticket.progress} />
                  </div>

                  {/* Activity */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
                    <div className="space-y-3">
                      <div className="flex gap-3 text-sm">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {ticket.reporter?.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{ticket.reporter?.name}</span>
                          <span className="text-muted-foreground"> created this ticket</span>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(ticket.createdAt), 'PPP')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="mt-4">
                  <div className="space-y-4">
                    {/* Comment input */}
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Textarea
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={3}
                        />
                        <Button size="sm" className="mt-2">
                          Post Comment
                        </Button>
                      </div>
                    </div>

                    {/* Comments list */}
                    <div className="space-y-4 pt-4">
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>JS</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">Jane Smith</span>
                            <span className="text-xs text-muted-foreground">2 hours ago</span>
                          </div>
                          <p className="text-sm">
                            I've reviewed the initial design. Looks good! Just a few minor
                            suggestions I'll add to the attachments.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="time" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Time Logged</p>
                        <p className="text-2xl font-bold">
                          {ticket.loggedHours}h
                          {ticket.estimatedHours && (
                            <span className="text-sm font-normal text-muted-foreground">
                              {' '}
                              / {ticket.estimatedHours}h estimated
                            </span>
                          )}
                        </p>
                      </div>
                      <Button size="sm">
                        <Clock className="h-4 w-4 mr-1" />
                        Log Time
                      </Button>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>JD</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">John Doe</p>
                            <p className="text-xs text-muted-foreground">Yesterday</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">4h</p>
                          <p className="text-xs text-muted-foreground">Design work</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="attachments" className="mt-4">
                  <div className="space-y-4">
                    <Button size="sm">
                      <Paperclip className="h-4 w-4 mr-1" />
                      Add Attachment
                    </Button>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-lg p-3">
                        <div className="h-24 bg-muted rounded mb-2 flex items-center justify-center">
                          <span className="text-2xl">🖼️</span>
                        </div>
                        <p className="text-sm font-medium truncate">design-mockup.png</p>
                        <p className="text-xs text-muted-foreground">2.4 MB</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </div>

          {/* Sidebar */}
          <div className="w-64 border-l p-4 bg-muted/30">
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Status
                </label>
                <Select defaultValue={ticket.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BACKLOG">Backlog</SelectItem>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="IN_REVIEW">In Review</SelectItem>
                    <SelectItem value="TESTING">Testing</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Priority
                </label>
                <Select defaultValue={ticket.priority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Assignee
                </label>
                <Select defaultValue={ticket.assigneeId || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    <SelectItem value="user_1">John Doe</SelectItem>
                    <SelectItem value="user_2">Jane Smith</SelectItem>
                    <SelectItem value="user_3">Bob Wilson</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reporter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Reporter
                </label>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {ticket.reporter?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{ticket.reporter?.name || 'Unknown'}</span>
                </div>
              </div>

              {/* Project */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Project
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ticket.project?.color || '#6B7280' }}
                  />
                  <span className="text-sm">{ticket.project?.name || 'Unknown'}</span>
                </div>
              </div>

              {/* Due Date */}
              {ticket.dueDate && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Due Date
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(ticket.dueDate), 'PPP')}</span>
                  </div>
                </div>
              )}

              {/* Story Points */}
              {ticket.storyPoints && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Story Points
                  </label>
                  <Badge variant="secondary">{ticket.storyPoints} SP</Badge>
                </div>
              )}

              <Separator />

              {/* Dates */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Created: {format(new Date(ticket.createdAt), 'PPP')}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
