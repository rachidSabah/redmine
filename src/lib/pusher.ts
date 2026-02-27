/**
 * Pusher Real-Time Service for Synchro PM
 * Serverless-compatible real-time updates
 */

import { db } from "@/lib/db";

export interface PusherConfig {
  appId: string;
  key: string;
  secret: string;
  cluster: string;
}

export interface RealtimeEvent {
  channel: string;
  event: string;
  data: Record<string, any>;
}

// Event types for type safety
export const RealtimeEvents = {
  // Ticket events
  TICKET_CREATED: "ticket:created",
  TICKET_UPDATED: "ticket:updated",
  TICKET_DELETED: "ticket:deleted",
  TICKET_ASSIGNED: "ticket:assigned",
  TICKET_COMMENTED: "ticket:commented",
  TICKET_STATUS_CHANGED: "ticket:status_changed",
  
  // Project events
  PROJECT_UPDATED: "project:updated",
  PROJECT_MEMBER_ADDED: "project:member_added",
  
  // Wiki events
  WIKI_UPDATED: "wiki:updated",
  
  // Chat events
  CHAT_MESSAGE: "chat:message",
  CHAT_TYPING: "chat:typing",
  
  // Presence events
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
  
  // Notification events
  NOTIFICATION_NEW: "notification:new",
  
  // Activity events
  ACTIVITY_NEW: "activity:new",
} as const;

/**
 * Pusher Service for serverless real-time
 */
class PusherService {
  private config: PusherConfig | null = null;
  private initialized = false;

  initialize() {
    if (this.initialized) return;
    
    this.config = {
      appId: process.env.PUSHER_APP_ID || "",
      key: process.env.PUSHER_KEY || "",
      secret: process.env.PUSHER_SECRET || "",
      cluster: process.env.PUSHER_CLUSTER || "us2",
    };
    
    this.initialized = true;
  }

  /**
   * Trigger an event on a channel
   */
  async trigger(event: RealtimeEvent): Promise<boolean> {
    this.initialize();

    if (!this.config?.appId || !this.config?.key || !this.config?.secret) {
      // Fall back to logging if Pusher not configured
      console.log(`[Real-time] ${event.channel}:${event.event}`, event.data);
      return false;
    }

    try {
      const body = {
        name: event.event,
        channel: event.channel,
        data: JSON.stringify(event.data),
      };

      const timestamp = Math.floor(Date.now() / 1000);
      const bodyString = JSON.stringify(body);
      const md5 = await this.md5(bodyString);
      
      const stringToSign = [
        "POST",
        "/apps/" + this.config.appId + "/events",
        this.config.key,
        timestamp.toString(),
        md5,
      ].join("\n");

      const signature = await this.hmacSha256(
        stringToSign,
        this.config.secret
      );

      const url = `https://api-${this.config.cluster}.pusher.com/apps/${this.config.appId}/events?auth_key=${this.config.key}&auth_timestamp=${timestamp}&auth_version=1.0&auth_signature=${signature}&body_md5=${md5}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: bodyString,
      });

      return response.ok;
    } catch (error) {
      console.error("Pusher trigger error:", error);
      return false;
    }
  }

  /**
   * Trigger multiple events
   */
  async triggerBatch(events: RealtimeEvent[]): Promise<boolean> {
    const results = await Promise.all(events.map(e => this.trigger(e)));
    return results.every(r => r);
  }

  /**
   * Generate channel name for organization
   */
  orgChannel(organizationId: string): string {
    return `private-org-${organizationId}`;
  }

  /**
   * Generate channel name for project
   */
  projectChannel(projectId: string): string {
    return `private-project-${projectId}`;
  }

  /**
   * Generate channel name for user
   */
  userChannel(userId: string): string {
    return `private-user-${userId}`;
  }

  /**
   * Generate channel name for ticket
   */
  ticketChannel(ticketId: string): string {
    return `private-ticket-${ticketId}`;
  }

  // Helper methods for common events

  async notifyTicketCreated(organizationId: string, projectId: string, ticket: any) {
    await this.trigger({
      channel: this.orgChannel(organizationId),
      event: RealtimeEvents.TICKET_CREATED,
      data: { ticket, projectId },
    });
    await this.trigger({
      channel: this.projectChannel(projectId),
      event: RealtimeEvents.TICKET_CREATED,
      data: { ticket },
    });
  }

  async notifyTicketUpdated(organizationId: string, projectId: string, ticket: any, changes: any) {
    await this.trigger({
      channel: this.orgChannel(organizationId),
      event: RealtimeEvents.TICKET_UPDATED,
      data: { ticket, changes, projectId },
    });
    await this.trigger({
      channel: this.projectChannel(projectId),
      event: RealtimeEvents.TICKET_UPDATED,
      data: { ticket, changes },
    });
    await this.trigger({
      channel: this.ticketChannel(ticket.id),
      event: RealtimeEvents.TICKET_UPDATED,
      data: { ticket, changes },
    });
  }

  async notifyUser(userId: string, type: string, data: any) {
    await this.trigger({
      channel: this.userChannel(userId),
      event: type,
      data,
    });
  }

  async broadcastToOrg(organizationId: string, event: string, data: any) {
    await this.trigger({
      channel: this.orgChannel(organizationId),
      event,
      data,
    });
  }

  async broadcastToProject(projectId: string, event: string, data: any) {
    await this.trigger({
      channel: this.projectChannel(projectId),
      event,
      data,
    });
  }

  /**
   * Generate authentication signature for private channels
   */
  async authenticate(
    socketId: string,
    channel: string,
    userId: string,
    userData?: Record<string, any>
  ): Promise<string | null> {
    this.initialize();

    if (!this.config?.key || !this.config?.secret) {
      return null;
    }

    const channelData = userData
      ? JSON.stringify({ user_id: userId, user_data: userData })
      : JSON.stringify({ user_id: userId });

    const stringToSign = `${socketId}:${channel}:${channelData}`;
    const signature = await this.hmacSha256(stringToSign, this.config.secret);

    return `${this.config.key}:${signature}:${channelData}`;
  }

  // Crypto helpers
  private async md5(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest("MD5", encoder.encode(data));
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private async hmacSha256(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(data)
    );
    
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

// Export singleton
export const pusherService = new PusherService();

// Export helper functions
export function notifyTicketUpdate(orgId: string, projectId: string, ticket: any, changes?: any) {
  if (changes) {
    return pusherService.notifyTicketUpdated(orgId, projectId, ticket, changes);
  }
  return pusherService.notifyTicketCreated(orgId, projectId, ticket);
}

export function sendUserNotification(userId: string, notification: any) {
  return pusherService.notifyUser(userId, RealtimeEvents.NOTIFICATION_NEW, notification);
}
