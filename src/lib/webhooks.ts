/**
 * Webhook System for Synchro PM
 * Outgoing webhooks for integrations
 */

import { db } from "@/lib/db";

export type WebhookEvent = 
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.deleted'
  | 'ticket.assigned'
  | 'ticket.commented'
  | 'ticket.status_changed'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'user.joined'
  | 'user.left'
  | 'wiki.created'
  | 'wiki.updated'
  | 'comment.created'
  | 'sprint.started'
  | 'sprint.completed'
  | 'milestone.completed'
  | 'custom';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  organizationId: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface WebhookConfig {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  headers?: Record<string, string>;
  retryCount: number;
  timeout: number;
}

/**
 * Webhook Service
 */
export class WebhookService {
  /**
   * Get all webhooks for an organization
   */
  async getWebhooks(organizationId: string): Promise<WebhookConfig[]> {
    const webhooks = await db.webhook.findMany({
      where: { organizationId, isActive: true },
    });
    
    return webhooks.map(w => ({
      id: w.id,
      organizationId: w.organizationId,
      name: w.name,
      url: w.url,
      secret: w.secret,
      events: w.events as WebhookEvent[],
      isActive: w.isActive,
      headers: w.headers as Record<string, string> | undefined,
      retryCount: w.retryCount,
      timeout: w.timeout,
    }));
  }

  /**
   * Create a new webhook
   */
  async createWebhook(data: {
    organizationId: string;
    name: string;
    url: string;
    secret: string;
    events: WebhookEvent[];
    headers?: Record<string, string>;
    createdBy: string;
  }): Promise<WebhookConfig> {
    const webhook = await db.webhook.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        url: data.url,
        secret: data.secret,
        events: data.events,
        headers: data.headers || {},
        createdBy: data.createdBy,
        isActive: true,
        retryCount: 3,
        timeout: 5000,
      },
    });

    return {
      id: webhook.id,
      organizationId: webhook.organizationId,
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events as WebhookEvent[],
      isActive: webhook.isActive,
      headers: webhook.headers as Record<string, string>,
      retryCount: webhook.retryCount,
      timeout: webhook.timeout,
    };
  }

  /**
   * Trigger webhooks for an event
   */
  async trigger(
    event: WebhookEvent,
    organizationId: string,
    data: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const webhooks = await this.getWebhooks(organizationId);
    
    const relevantWebhooks = webhooks.filter(
      w => w.events.includes(event) || w.events.includes('custom')
    );

    if (relevantWebhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      organizationId,
      data,
      metadata,
    };

    // Send webhooks in parallel (fire and forget)
    Promise.all(
      relevantWebhooks.map(webhook => this.sendWebhook(webhook, payload))
    ).catch(err => {
      console.error('Webhook delivery error:', err);
    });
  }

  /**
   * Send a webhook
   */
  private async sendWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload
  ): Promise<void> {
    const body = JSON.stringify(payload);
    const signature = await this.generateSignature(body, webhook.secret);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-SynchroPM-Event': payload.event,
      'X-SynchroPM-Signature': signature,
      'X-SynchroPM-Timestamp': payload.timestamp,
      ...webhook.headers,
    };

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= webhook.retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Log the delivery
        await this.logDelivery({
          webhookId: webhook.id,
          event: payload.event,
          statusCode: response.status,
          success: response.ok,
          attempt: attempt + 1,
        });

        if (response.ok) {
          return;
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        // Don't retry on 4xx errors (except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          break;
        }
      } catch (error: any) {
        lastError = error;
        
        // Log failed attempt
        await this.logDelivery({
          webhookId: webhook.id,
          event: payload.event,
          statusCode: 0,
          success: false,
          attempt: attempt + 1,
          error: error.message,
        });
      }

      // Exponential backoff
      if (attempt < webhook.retryCount) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    console.error(`Webhook delivery failed after ${webhook.retryCount + 1} attempts:`, lastError);
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private async generateSignature(
    payload: string, 
    secret: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );
    
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Log webhook delivery
   */
  private async logDelivery(data: {
    webhookId: string;
    event: string;
    statusCode: number;
    success: boolean;
    attempt: number;
    error?: string;
  }): Promise<void> {
    try {
      await db.webhookDelivery.create({
        data: {
          webhookId: data.webhookId,
          event: data.event,
          statusCode: data.statusCode,
          success: data.success,
          attempt: data.attempt,
          error: data.error,
        },
      });
    } catch (err) {
      console.error('Failed to log webhook delivery:', err);
    }
  }

  /**
   * Test a webhook endpoint
   */
  async testWebhook(webhookId: string): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
    duration: number;
  }> {
    const webhook = await db.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      return { success: false, error: 'Webhook not found', duration: 0 };
    }

    const testPayload: WebhookPayload = {
      event: 'custom',
      timestamp: new Date().toISOString(),
      organizationId: webhook.organizationId,
      data: { test: true, message: 'This is a test webhook' },
    };

    const startTime = Date.now();

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SynchroPM-Event': 'test',
          'X-SynchroPM-Test': 'true',
        },
        body: JSON.stringify(testPayload),
      });

      return {
        success: response.ok,
        statusCode: response.status,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService();

// Helper functions for common webhook triggers
export async function triggerTicketWebhook(
  event: WebhookEvent,
  ticket: any,
  organizationId: string
): Promise<void> {
  await webhookService.trigger(event, organizationId, { ticket });
}

export async function triggerProjectWebhook(
  event: WebhookEvent,
  project: any,
  organizationId: string
): Promise<void> {
  await webhookService.trigger(event, organizationId, { project });
}

export async function triggerCommentWebhook(
  event: WebhookEvent,
  comment: any,
  organizationId: string
): Promise<void> {
  await webhookService.trigger(event, organizationId, { comment });
}
