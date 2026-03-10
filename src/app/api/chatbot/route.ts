import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

// POST - Chat with AI assistant
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, conversationId, action } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.chatbotConversation.findFirst({
        where: {
          id: conversationId,
          userId: user.id,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 20,
          },
        },
      });
    }

    if (!conversation) {
      conversation = await prisma.chatbotConversation.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          title: message.slice(0, 50),
          messages: {
            create: {
              role: "system",
              content: `You are SynchroBot, an AI assistant for Synchro PM - a multi-tenant project management system. You help users with:
- Managing projects and tickets
- Team collaboration
- Sending email notifications to team members
- Setting up email configurations
- Answering questions about project management

Current user: ${user.name} (${user.email})
Role: ${user.role}

Be helpful, concise, and friendly. When users ask to send emails or perform actions, provide clear instructions or confirm actions.

IMPORTANT: When a user asks to send an email notification, respond with a JSON action object like:
{"action": "send_email", "data": {"to": "email@example.com", "subject": "Subject", "message": "Message content"}}

For creating tickets: {"action": "create_ticket", "data": {"title": "Ticket title", "description": "Description", "priority": "MEDIUM"}}
For other actions, provide helpful guidance.`,
            },
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 20,
          },
        },
      });
    }

    // Save user message
    await prisma.chatbotMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // Build messages for AI
    const messages = [
      ...conversation.messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Call AI
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      model: "default",
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantContent = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request. Please try again.";

    // Check for action in response
    let actionData = null;
    let actionExecuted = false;

    // Try to extract action from response
    const actionMatch = assistantContent.match(/\{[^{}]*"action"\s*:\s*"[^"]+"\s*[^{}]*\}/);
    if (actionMatch) {
      try {
        actionData = JSON.parse(actionMatch[0]);
      } catch (e) {
        // Not valid JSON, ignore
      }
    }

    // Execute action if present
    if (actionData && actionData.action === "send_email" && actionData.data) {
      // Store action for frontend to execute
      actionExecuted = false; // Will be executed by frontend
    }

    // Save assistant message
    const assistantMessage = await prisma.chatbotMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantContent.replace(/\{[^{}]*"action"\s*:\s*"[^"]+"\s*[^{}]*\}/g, "").trim(),
        actionType: actionData?.action,
        actionData: actionData?.data,
        actionExecuted,
      },
    });

    // Update conversation
    await prisma.chatbotConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      message: assistantMessage,
      conversationId: conversation.id,
      action: actionData,
    });
  } catch (error: any) {
    console.error("Chatbot error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Get conversation history
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (conversationId) {
      const conversation = await prisma.chatbotConversation.findFirst({
        where: {
          id: conversationId,
          userId: user.id,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      return NextResponse.json({ conversation });
    }

    // List all conversations
    const conversations = await prisma.chatbotConversation.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
