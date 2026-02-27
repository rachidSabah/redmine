/**
 * Real-Time WebSocket Service for Synchro PM
 * Handles live updates, presence, and notifications
 */

import { Server as WebSocketServer, WebSocket } from 'ws';

export interface RealTimeMessage {
  type: 'ticket_update' | 'comment_added' | 'notification' | 'presence' | 'typing' | 'activity' | 'bulk_update';
  payload: any;
  timestamp: string;
  userId?: string;
  organizationId?: string;
  projectId?: string;
}

export interface PresenceUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  currentPage?: string;
  lastSeen: Date;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  entityType: 'ticket' | 'comment' | 'wiki';
  entityId: string;
  timestamp: Date;
}

class RealTimeService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, { ws: WebSocket; userId: string; organizationId: string }> = new Map();
  private presence: Map<string, PresenceUser> = new Map();
  private typing: Map<string, TypingIndicator[]> = new Map();

  initialize(server: any) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const clientId = this.generateClientId();
      
      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnect(clientId);
      });

      // Send connection confirmation
      this.sendToClient(ws, {
        type: 'connection',
        payload: { clientId, connected: true },
        timestamp: new Date().toISOString(),
      });
    });

    console.log('✅ Real-Time WebSocket service initialized');
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);

    switch (message.type) {
      case 'auth':
        this.handleAuth(clientId, message.payload);
        break;

      case 'presence':
        this.handlePresence(clientId, message.payload);
        break;

      case 'typing_start':
        this.handleTypingStart(clientId, message.payload);
        break;

      case 'typing_stop':
        this.handleTypingStop(clientId, message.payload);
        break;

      case 'subscribe':
        this.handleSubscribe(clientId, message.payload);
        break;

      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message.payload);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleAuth(clientId: string, payload: { userId: string; organizationId: string }) {
    const client = this.clients.get(clientId);
    if (client) {
      client.userId = payload.userId;
      client.organizationId = payload.organizationId;
    }
    this.clients.set(clientId, {
      ws: client?.ws || null as any,
      userId: payload.userId,
      organizationId: payload.organizationId,
    });
  }

  private handlePresence(clientId: string, payload: { page: string; userId: string }) {
    const client = this.clients.get(clientId);
    if (client) {
      this.presence.set(client.userId, {
        id: client.userId,
        name: payload.userId, // Would fetch from DB in real implementation
        email: '',
        currentPage: payload.page,
        lastSeen: new Date(),
      });

      // Broadcast presence to organization
      this.broadcastToOrganization(client.organizationId, {
        type: 'presence',
        payload: { users: Array.from(this.presence.values()) },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleTypingStart(clientId: string, payload: { entityType: string; entityId: string }) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const key = `${payload.entityType}_${payload.entityId}`;
    const typingList = this.typing.get(key) || [];
    
    const indicator: TypingIndicator = {
      userId: client.userId,
      userName: '', // Would fetch from DB
      entityType: payload.entityType as any,
      entityId: payload.entityId,
      timestamp: new Date(),
    };

    typingList.push(indicator);
    this.typing.set(key, typingList);

    // Broadcast typing indicator
    this.broadcastToOrganization(client.organizationId, {
      type: 'typing',
      payload: { key, typing: typingList },
      timestamp: new Date().toISOString(),
    });
  }

  private handleTypingStop(clientId: string, payload: { entityType: string; entityId: string }) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const key = `${payload.entityType}_${payload.entityId}`;
    const typingList = this.typing.get(key) || [];
    const filtered = typingList.filter(t => t.userId !== client.userId);
    this.typing.set(key, filtered);

    // Broadcast updated typing list
    this.broadcastToOrganization(client.organizationId, {
      type: 'typing',
      payload: { key, typing: filtered },
      timestamp: new Date().toISOString(),
    });
  }

  private handleSubscribe(clientId: string, payload: { channel: string }) {
    // Implementation for channel subscription
  }

  private handleUnsubscribe(clientId: string, payload: { channel: string }) {
    // Implementation for channel unsubscription
  }

  private handleDisconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from presence
      this.presence.delete(client.userId);
      
      // Broadcast updated presence
      if (client.organizationId) {
        this.broadcastToOrganization(client.organizationId, {
          type: 'presence',
          payload: { users: Array.from(this.presence.values()) },
          timestamp: new Date().toISOString(),
        });
      }
    }
    this.clients.delete(clientId);
  }

  private sendToClient(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Broadcast to all clients in an organization
  broadcastToOrganization(organizationId: string, message: RealTimeMessage) {
    this.clients.forEach((client) => {
      if (client.organizationId === organizationId) {
        this.sendToClient(client.ws, message);
      }
    });
  }

  // Broadcast to all clients in a project
  broadcastToProject(projectId: string, message: RealTimeMessage) {
    // Would need to track which clients are viewing which project
    this.clients.forEach((client) => {
      this.sendToClient(client.ws, { ...message, projectId });
    });
  }

  // Send to specific user
  sendToUser(userId: string, message: RealTimeMessage) {
    this.clients.forEach((client) => {
      if (client.userId === userId) {
        this.sendToClient(client.ws, message);
      }
    });
  }

  // Notify about ticket update
  notifyTicketUpdate(organizationId: string, projectId: string, ticket: any) {
    this.broadcastToOrganization(organizationId, {
      type: 'ticket_update',
      payload: ticket,
      timestamp: new Date().toISOString(),
      organizationId,
      projectId,
    });
  }

  // Notify about new comment
  notifyCommentAdded(organizationId: string, projectId: string, comment: any, userIds: string[]) {
    const message: RealTimeMessage = {
      type: 'comment_added',
      payload: comment,
      timestamp: new Date().toISOString(),
      organizationId,
      projectId,
    };

    userIds.forEach(userId => {
      this.sendToUser(userId, message);
    });
  }

  // Send notification
  sendNotification(userId: string, notification: any) {
    this.sendToUser(userId, {
      type: 'notification',
      payload: notification,
      timestamp: new Date().toISOString(),
      userId,
    });
  }

  // Get online users for organization
  getOnlineUsers(organizationId: string): PresenceUser[] {
    const users: PresenceUser[] = [];
    this.clients.forEach((client) => {
      if (client.organizationId === organizationId) {
        const presence = this.presence.get(client.userId);
        if (presence) {
          users.push(presence);
        }
      }
    });
    return users;
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.presence.has(userId);
  }

  // Get typing indicators for entity
  getTypingIndicators(entityType: string, entityId: string): TypingIndicator[] {
    const key = `${entityType}_${entityId}`;
    return this.typing.get(key) || [];
  }
}

// Export singleton instance
export const realTimeService = new RealTimeService();

// For use in API routes to trigger real-time updates
export function notifyTicketCreated(organizationId: string, projectId: string, ticket: any) {
  realTimeService.notifyTicketUpdate(organizationId, projectId, {
    action: 'created',
    ticket,
  });
}

export function notifyTicketUpdated(organizationId: string, projectId: string, ticket: any, changes: any) {
  realTimeService.notifyTicketUpdate(organizationId, projectId, {
    action: 'updated',
    ticket,
    changes,
  });
}

export function notifyTicketAssigned(organizationId: string, projectId: string, ticket: any, assigneeId: string) {
  realTimeService.sendNotification(assigneeId, {
    type: 'ticket_assigned',
    title: 'Ticket Assigned',
    message: `You have been assigned to ${ticket.key}: ${ticket.title}`,
    data: { ticketId: ticket.id, projectId },
  });
}

export function notifyCommentCreated(organizationId: string, projectId: string, comment: any, mentionUserIds: string[] = []) {
  realTimeService.notifyCommentAdded(organizationId, projectId, comment, mentionUserIds);
}

export function broadcastActivity(organizationId: string, activity: any) {
  realTimeService.broadcastToOrganization(organizationId, {
    type: 'activity',
    payload: activity,
    timestamp: new Date().toISOString(),
    organizationId,
  });
}
