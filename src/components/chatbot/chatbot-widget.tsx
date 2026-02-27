"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Send,
  X,
  Bot,
  User,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  actionType?: string;
  actionData?: any;
  actionExecuted?: boolean;
}

interface ChatbotWidgetProps {
  onAction?: (action: string, data: any) => void;
}

export function ChatbotWidget({ onAction }: ChatbotWidgetProps) {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message optimistically
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        createdAt: new Date().toISOString(),
      },
    ]);

    setLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConversationId(data.conversationId);

        // Add assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: data.message.id,
            role: "assistant",
            content: data.message.content,
            createdAt: data.message.createdAt,
            actionType: data.action?.action,
            actionData: data.action?.data,
            actionExecuted: data.message.actionExecuted,
          },
        ]);

        // Handle action if present
        if (data.action && onAction) {
          handleAction(data.action.action, data.action.data);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to get response from chatbot",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to communicate with chatbot",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, data: any) => {
    if (action === "send_email" && data) {
      try {
        const res = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: data.to,
            subject: data.subject,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
              <p>${data.message}</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #666; font-size: 12px;">Sent via SynchroBot from Synchro PM</p>
            </div>`,
          }),
        });

        if (res.ok) {
          toast({
            title: "Email Sent",
            description: `Email sent to ${data.to}`,
          });
          onAction?.("send_email", data);
        } else {
          toast({
            title: "Error",
            description: "Failed to send email",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to send email",
          variant: "destructive",
        });
      }
    } else if (action === "create_ticket" && data) {
      onAction?.("create_ticket", data);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { label: "Send email to team", message: "Help me send an email notification to my team" },
    { label: "Create a ticket", message: "I want to create a new ticket" },
    { label: "Project status", message: "What's the status of my projects?" },
    { label: "Due reminders", message: "Show me upcoming due dates" },
  ];

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-sm">SynchroBot</CardTitle>
            <p className="text-xs text-muted-foreground">AI Assistant</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">
                Hi! I'm SynchroBot, your AI assistant. How can I help you today?
              </p>
              <div className="space-y-2">
                {quickActions.map((action, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      setInput(action.message);
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    message.role === "user" ? "flex-row-reverse" : ""
                  )}
                >
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    {message.role === "user" ? (
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-muted text-xs">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 max-w-[80%] text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.actionType && !message.actionExecuted && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        <Mail className="h-3 w-3 mr-1" />
                        Action: {message.actionType}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback className="bg-muted text-xs">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-3 py-2 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={loading}
            />
            <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
