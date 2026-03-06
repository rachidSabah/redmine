"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  MoreVertical,
  Search,
  Phone,
  Video,
  Users,
  X,
  Download,
  Upload,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  user: {
    id: string;
    name: string | null;
    image?: string | null;
  };
  createdAt: string;
  edited?: boolean;
  attachments?: { id: string; filename: string; originalName: string; url: string; size: number }[];
}

interface ChatChannel {
  id: string;
  name: string;
  type: "public" | "private" | "direct";
  members: number;
  unread?: number;
}

interface ChatPanelProps {
  channelId?: string;
  channelName?: string;
  embedded?: boolean;
}

export function ChatPanel({ channelId, channelName, embedded }: ChatPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Fetch channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch("/api/chat/channels");
        if (res.ok) {
          const data = await res.json();
          setChannels(data.channels || []);
          if (data.channels?.length > 0 && !activeChannel) {
            setActiveChannel(data.channels[0]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch channels:", e);
      }
    };
    fetchChannels();
  }, []);

  // Fetch messages when channel changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeChannel?.id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/chat/channels/${activeChannel.id}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (e) {
        console.error("Failed to fetch messages:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [activeChannel]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setPendingFiles((prev) => [...prev, ...Array.from(files)]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && pendingFiles.length === 0) return;
    if (!activeChannel?.id) return;

    try {
      // First upload any pending files
      const uploadedAttachments: any[] = [];
      
      for (const file of pendingFiles) {
        const formData = new FormData();
        formData.append("file", file);
        
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedAttachments.push(uploadData.attachment);
        }
      }

      // Send message with attachments
      const res = await fetch(`/api/chat/channels/${activeChannel.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage,
          attachments: uploadedAttachments.map(a => a.id),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
        setPendingFiles([]);
      } else {
        toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return format(d, "h:mm a");
    }
    return format(d, "MMM d, h:mm a");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt).toDateString();
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: currentDate, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <Card className={cn("h-full flex flex-col", embedded && "border-0 shadow-none")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg font-semibold">
            {activeChannel?.name || channelName || "Team Chat"}
          </CardTitle>
          {activeChannel && (
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {activeChannel.members}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex p-0 overflow-hidden">
        {/* Channels sidebar */}
        {!embedded && (
          <div className="w-56 border-r flex-shrink-0">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-420px)]">
              <div className="p-2">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Channels</p>
                {channels
                  .filter((c) => c.type !== "direct")
                  .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setActiveChannel(channel)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                        activeChannel?.id === channel.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="text-muted-foreground">#</span>
                      <span className="flex-1 text-left truncate">{channel.name}</span>
                      {channel.unread && (
                        <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                          {channel.unread}
                        </Badge>
                      )}
                    </button>
                  ))}
                
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-4">Direct Messages</p>
                {channels
                  .filter((c) => c.type === "direct")
                  .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setActiveChannel(channel)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                        activeChannel?.id === channel.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {channel.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                      </div>
                      <span className="flex-1 text-left truncate">{channel.name}</span>
                      {channel.unread && (
                        <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                          {channel.unread}
                        </Badge>
                      )}
                    </button>
                  ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel header */}
          {!embedded && activeChannel && (
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">#</span>
                <h3 className="font-medium">{activeChannel.name}</h3>
                {activeChannel.type === "private" && (
                  <Badge variant="outline" className="text-xs">Private</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeChannel.members} members
              </p>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="py-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : messageGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messageGroups.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {/* Date separator */}
                    <div className="flex items-center gap-4 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground font-medium">
                        {format(new Date(group.date), "MMMM d, yyyy")}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Messages for this date */}
                    {group.messages.map((message, index) => {
                      const showAvatar =
                        index === 0 ||
                        group.messages[index - 1].user.id !== message.user.id;

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3",
                            !showAvatar && "mt-1"
                          )}
                        >
                          {showAvatar ? (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={message.user.image || undefined} />
                              <AvatarFallback className="text-xs">
                                {message.user.name?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            {showAvatar && (
                              <div className="flex items-baseline gap-2">
                                <span className="font-medium text-sm">
                                  {message.user.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatMessageTime(message.createdAt)}
                                </span>
                              </div>
                            )}
                            <p className="text-sm break-words">{message.content}</p>
                            
                            {/* Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {message.attachments.map((attachment) => (
                                  <a
                                    key={attachment.id}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-xs hover:bg-muted/80 transition-colors"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    <span className="truncate max-w-[150px]">{attachment.originalName}</span>
                                    <span className="text-muted-foreground">({formatFileSize(attachment.size)})</span>
                                    <Download className="h-3 w-3" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Pending files */}
          {pendingFiles.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/30">
              <div className="flex flex-wrap gap-2">
                {pendingFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-2 py-1 bg-background rounded border text-xs"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => removePendingFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="p-4 border-t">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pr-24"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      multiple
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Smile className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button onClick={sendMessage} disabled={!newMessage.trim() && pendingFiles.length === 0}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
