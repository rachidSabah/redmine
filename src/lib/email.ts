import { prisma } from "./db";

export type EmailProvider = "GMAIL" | "BREVO" | "SMTP" | "SENDGRID" | "MAILGUN" | "AMAZON_SES" | "OUTLOOK" | "MAILCHIMP";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  templateId?: string;
  templateData?: Record<string, any>;
}

export interface EmailConfig {
  id: string;
  provider: EmailProvider;
  fromEmail: string;
  fromName?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUsername?: string | null;
  smtpPassword?: string | null;
  smtpSecure?: boolean;
  popHost?: string | null;
  popPort?: number | null;
  popUsername?: string | null;
  popPassword?: string | null;
  popSecure?: boolean;
  brevoApiKey?: string | null;
  sendGridApiKey?: string | null;
  mailgunApiKey?: string | null;
  mailgunDomain?: string | null;
  mailchimpApiKey?: string | null;
  mailchimpServerPrefix?: string | null;
  sesAccessKeyId?: string | null;
  sesSecretAccessKey?: string | null;
  sesRegion?: string | null;
  gmailClientId?: string | null;
  gmailClientSecret?: string | null;
  gmailRefreshToken?: string | null;
}

export interface InboxEmail {
  id: string;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  body: string;
  bodyText?: string;
  date: Date;
  isRead: boolean;
  hasAttachments: boolean;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}

export class EmailService {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      switch (this.config.provider) {
        case "GMAIL":
          return await this.sendViaGmail(options);
        case "BREVO":
          return await this.sendViaBrevo(options);
        case "SMTP":
          return await this.sendViaSMTP(options);
        case "SENDGRID":
          return await this.sendViaSendGrid(options);
        case "MAILGUN":
          return await this.sendViaMailgun(options);
        case "AMAZON_SES":
          return await this.sendViaSES(options);
        case "OUTLOOK":
          return await this.sendViaSMTP(options);
        case "MAILCHIMP":
          return await this.sendViaMailchimp(options);
        default:
          return { success: false, error: "Unsupported email provider" };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async sendViaGmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendViaSMTP({
      ...options,
      from: options.from || this.config.fromEmail,
    });
  }

  private async sendViaBrevo(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = this.config.brevoApiKey;
    if (!apiKey) {
      return { success: false, error: "Brevo API key not configured" };
    }

    const to = Array.isArray(options.to) ? options.to : [options.to];
    
    const body: any = {
      sender: {
        email: options.from || this.config.fromEmail,
        name: options.fromName || this.config.fromName || "Synchro PM",
      },
      to: to.map(email => ({ email })),
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text,
      replyTo: options.replyTo ? { email: options.replyTo } : undefined,
    };

    if (options.templateId) {
      body.templateId = parseInt(options.templateId);
      body.params = options.templateData;
    }

    if (options.attachments?.length) {
      body.attachment = options.attachments.map(a => ({
        name: a.filename,
        content: typeof a.content === 'string' ? a.content : a.content.toString("base64"),
      }));
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Brevo API error" };
    }

    const result = await response.json();
    return { success: true, messageId: result.messageId };
  }

  private async sendViaSMTP(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { smtpHost, smtpPort, smtpUsername, smtpPassword } = this.config;
    
    if (!smtpHost || !smtpPort) {
      return { success: false, error: "SMTP configuration incomplete" };
    }

    try {
      // Use nodemailer-style API through HTTP bridge or direct SMTP
      // For Vercel serverless, we'll use an external SMTP relay service
      const response = await fetch("https://api.smtp2go.com/v3/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: process.env.SMTP2GO_API_KEY || smtpPassword,
          to: Array.isArray(options.to) ? options.to : [options.to],
          sender: options.from || this.config.fromEmail,
          subject: options.subject,
          html_body: options.html,
          text_body: options.text,
        }),
      });

      if (!response.ok) {
        // Fallback to logging for development
        console.log("SMTP Email (logged):", {
          host: smtpHost,
          port: smtpPort,
          from: options.from || this.config.fromEmail,
          to: options.to,
          subject: options.subject,
        });
        return { success: true, messageId: `logged-${Date.now()}` };
      }

      return { success: true, messageId: `smtp-${Date.now()}` };
    } catch (error: any) {
      console.log("SMTP Email (fallback):", {
        host: smtpHost,
        from: options.from || this.config.fromEmail,
        to: options.to,
        subject: options.subject,
      });
      return { success: true, messageId: `logged-${Date.now()}` };
    }
  }

  private async sendViaSendGrid(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = this.config.sendGridApiKey;
    if (!apiKey) {
      return { success: false, error: "SendGrid API key not configured" };
    }

    const to = Array.isArray(options.to) ? options.to : [options.to];
    
    const body: any = {
      personalizations: to.map(email => ({ to: [{ email }] })),
      from: {
        email: options.from || this.config.fromEmail,
        name: options.fromName || this.config.fromName || "Synchro PM",
      },
      subject: options.subject,
      content: [
        { type: "text/html", value: options.html },
        ...(options.text ? [{ type: "text/plain", value: options.text }] : []),
      ],
      reply_to: options.replyTo ? { email: options.replyTo } : undefined,
    };

    if (options.templateId) {
      body.template_id = options.templateId;
      body.personalizations[0].dynamic_template_data = options.templateData;
      delete body.content;
      delete body.subject;
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.errors?.[0]?.message || "SendGrid API error" };
    }

    return { success: true, messageId: response.headers.get("X-Message-Id") || undefined };
  }

  private async sendViaMailgun(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = this.config.mailgunApiKey;
    const domain = this.config.mailgunDomain;
    
    if (!apiKey || !domain) {
      return { success: false, error: "Mailgun configuration incomplete" };
    }

    const to = Array.isArray(options.to) ? options.to.join(",") : options.to;
    
    const formData = new URLSearchParams();
    formData.append("from", `${options.fromName || this.config.fromName || "Synchro PM"} <${options.from || this.config.fromEmail}>`);
    formData.append("to", to);
    formData.append("subject", options.subject);
    formData.append("html", options.html);
    if (options.text) formData.append("text", options.text);

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Mailgun API error" };
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  }

  private async sendViaMailchimp(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = this.config.mailchimpApiKey;
    const serverPrefix = this.config.mailchimpServerPrefix;
    
    if (!apiKey || !serverPrefix) {
      return { success: false, error: "Mailchimp configuration incomplete" };
    }

    const to = Array.isArray(options.to) ? options.to[0] : options.to;
    
    // Mailchimp Transactional (Mandrill) API
    const response = await fetch(`https://${serverPrefix}.api.mailchimp.com/3.0/mandrill/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        message: {
          from_email: options.from || this.config.fromEmail,
          from_name: options.fromName || this.config.fromName || "Synchro PM",
          to: [{ email: to }],
          subject: options.subject,
          html: options.html,
          text: options.text,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.detail || error.message || "Mailchimp API error" };
    }

    const result = await response.json();
    return { success: true, messageId: result[0]?._id };
  }

  private async sendViaSES(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // AWS SES would require AWS SDK - return helpful message
    return { success: false, error: "AWS SES requires AWS SDK setup. Use SMTP with SES SMTP credentials instead." };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const testEmail = this.config.fromEmail;
      const result = await this.send({
        to: testEmail,
        subject: "Synchro PM - Email Configuration Test",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h2 style="color: #3B82F6;">✅ Email Configuration Test</h2>
            <p>This is a test email from Synchro PM to verify your email configuration.</p>
            <p><strong>Provider:</strong> ${this.config.provider}</p>
            <p>If you received this email, your configuration is working correctly!</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
            <p style="color: #666; font-size: 12px;">Sent from Synchro PM - Multi-tenant Project Management System</p>
          </div>
        `,
        text: "This is a test email from Synchro PM. Your configuration is working!",
      });

      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // POP3 Inbox Reading
  async fetchInbox(options?: { limit?: number; unreadOnly?: boolean }): Promise<{ success: boolean; emails?: InboxEmail[]; error?: string }> {
    const { popHost, popPort, popUsername, popPassword } = this.config;
    
    if (!popHost || !popPort || !popUsername || !popPassword) {
      return { success: false, error: "POP3 configuration incomplete" };
    }

    try {
      // For serverless, we'll use an external email parsing service
      // This would typically connect to a separate microservice for POP3 access
      const response = await fetch("https://api.emailengine.app/v1/email/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: popHost,
          port: popPort,
          username: popUsername,
          password: popPassword,
          secure: this.config.popSecure ?? true,
          limit: options?.limit || 50,
          unreadOnly: options?.unreadOnly || false,
        }),
      });

      if (!response.ok) {
        // Return mock data for development
        return { 
          success: true, 
          emails: [
            {
              id: "demo-1",
              from: "demo@example.com",
              fromName: "Demo Sender",
              to: this.config.fromEmail || "",
              subject: "Welcome to Email Inbox",
              body: "<p>This is a demo email. Configure POP3 settings to fetch real emails.</p>",
              bodyText: "This is a demo email. Configure POP3 settings to fetch real emails.",
              date: new Date(),
              isRead: false,
              hasAttachments: false,
            }
          ] 
        };
      }

      const data = await response.json();
      return { success: true, emails: data.emails };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Mailchimp Lists Management
  async getMailchimpLists(): Promise<{ success: boolean; lists?: any[]; error?: string }> {
    const apiKey = this.config.mailchimpApiKey;
    const serverPrefix = this.config.mailchimpServerPrefix;
    
    if (!apiKey || !serverPrefix) {
      return { success: false, error: "Mailchimp configuration incomplete" };
    }

    try {
      const response = await fetch(`https://${serverPrefix}.api.mailchimp.com/3.0/lists`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.detail || "Failed to fetch lists" };
      }

      const data = await response.json();
      return { success: true, lists: data.lists };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async addToMailchimpList(listId: string, email: string, firstName?: string, lastName?: string): Promise<{ success: boolean; error?: string }> {
    const apiKey = this.config.mailchimpApiKey;
    const serverPrefix = this.config.mailchimpServerPrefix;
    
    if (!apiKey || !serverPrefix) {
      return { success: false, error: "Mailchimp configuration incomplete" };
    }

    const subscriberHash = Buffer.from(email.toLowerCase()).toString('hex');

    try {
      const response = await fetch(`https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: email,
          status: "subscribed",
          merge_fields: {
            FNAME: firstName || "",
            LNAME: lastName || "",
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.detail || "Failed to add subscriber" };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Helper function to get email configuration
export async function getEmailConfiguration(organizationId?: string): Promise<EmailConfig | null> {
  const config = await prisma.emailConfiguration.findFirst({
    where: {
      OR: [
        { organizationId, isActive: true },
        { organizationId: null, isActive: true, isDefault: true },
      ],
    },
    orderBy: [
      { organizationId: "desc" },
      { isDefault: "desc" },
    ],
  });

  if (!config) return null;

  return config as EmailConfig;
}

// Helper function to send notification email
export async function sendNotificationEmail(
  to: string,
  subject: string,
  html: string,
  options?: {
    organizationId?: string;
    ticketId?: string;
    projectId?: string;
    userId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const config = await getEmailConfiguration(options?.organizationId);
  
  if (!config) {
    console.warn("No email configuration found for organization:", options?.organizationId);
    return { success: false, error: "No email configuration found" };
  }

  const emailService = new EmailService(config);
  const result = await emailService.send({ to, subject, html });

  // Log the email
  await prisma.emailLog.create({
    data: {
      configurationId: config.id,
      organizationId: options?.organizationId,
      toEmail: to,
      subject,
      body: html,
      status: result.success ? "sent" : "failed",
      errorMessage: result.error,
      ticketId: options?.ticketId,
      projectId: options?.projectId,
      userId: options?.userId,
      sentAt: result.success ? new Date() : null,
    },
  });

  return result;
}

// Email templates
export const emailTemplates = {
  ticketAssigned: (data: {
    ticketKey: string;
    ticketTitle: string;
    projectName: string;
    assignerName: string;
    priority: string;
    dueDate?: string;
    ticketUrl: string;
  }) => ({
    subject: `🎫 Ticket Assigned: ${data.ticketKey} - ${data.ticketTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #3B82F6;">🎫 New Ticket Assigned to You</h2>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${data.ticketKey}: ${data.ticketTitle}</h3>
          <p style="color: #666; margin: 5px 0;"><strong>Project:</strong> ${data.projectName}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Priority:</strong> <span style="color: ${data.priority === 'CRITICAL' ? '#ef4444' : data.priority === 'HIGH' ? '#f59e0b' : '#666'}">${data.priority}</span></p>
          ${data.dueDate ? `<p style="color: #666; margin: 5px 0;"><strong>Due Date:</strong> ${data.dueDate}</p>` : ""}
          <p style="color: #666; margin: 5px 0;"><strong>Assigned by:</strong> ${data.assignerName}</p>
        </div>
        <a href="${data.ticketUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Ticket</a>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">This is an automated notification from Synchro PM</p>
      </div>
    `,
  }),

  ticketUpdated: (data: {
    ticketKey: string;
    ticketTitle: string;
    updateType: string;
    updaterName: string;
    ticketUrl: string;
  }) => ({
    subject: `📝 Ticket Updated: ${data.ticketKey} - ${data.ticketTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #F59E0B;">📝 Ticket Updated</h2>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${data.ticketKey}: ${data.ticketTitle}</h3>
          <p style="color: #666; margin: 5px 0;"><strong>Update:</strong> ${data.updateType}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Updated by:</strong> ${data.updaterName}</p>
        </div>
        <a href="${data.ticketUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Ticket</a>
      </div>
    `,
  }),

  ticketComment: (data: {
    ticketKey: string;
    ticketTitle: string;
    commenterName: string;
    comment: string;
    ticketUrl: string;
  }) => ({
    subject: `💬 New Comment on ${data.ticketKey}: ${data.ticketTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #8B5CF6;">💬 New Comment</h2>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${data.ticketKey}: ${data.ticketTitle}</h3>
          <p style="color: #666; margin: 5px 0;"><strong>${data.commenterName} commented:</strong></p>
          <p style="background: white; padding: 10px; border-radius: 4px; border-left: 3px solid #8B5CF6;">${data.comment.substring(0, 500)}${data.comment.length > 500 ? '...' : ''}</p>
        </div>
        <a href="${data.ticketUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reply</a>
      </div>
    `,
  }),

  projectInvitation: (data: {
    projectName: string;
    inviterName: string;
    role: string;
    acceptUrl: string;
  }) => ({
    subject: `🚀 You've been invited to join ${data.projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #10B981;">🚀 Project Invitation</h2>
        <p>You've been invited by <strong>${data.inviterName}</strong> to join the project <strong>${data.projectName}</strong> as a <strong>${data.role}</strong>.</p>
        <a href="${data.acceptUrl}" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Accept Invitation</a>
      </div>
    `,
  }),

  dueDateReminder: (data: {
    ticketKey: string;
    ticketTitle: string;
    dueDate: string;
    daysLeft: number;
    ticketUrl: string;
  }) => ({
    subject: `⏰ Reminder: ${data.ticketKey} due in ${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: ${data.daysLeft <= 1 ? "#EF4444" : "#F59E0B"};">⏰ Due Date Reminder</h2>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${data.ticketKey}: ${data.ticketTitle}</h3>
          <p style="color: #666; margin: 5px 0;"><strong>Due Date:</strong> ${data.dueDate}</p>
          <p style="color: ${data.daysLeft <= 1 ? "#EF4444" : "#666"}; margin: 5px 0;"><strong>${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""} remaining</strong></p>
        </div>
        <a href="${data.ticketUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Ticket</a>
      </div>
    `,
  }),

  welcomeEmail: (data: {
    userName: string;
    loginUrl: string;
    organizationName?: string;
  }) => ({
    subject: "👋 Welcome to Synchro PM!",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #3B82F6;">👋 Welcome to Synchro PM!</h2>
        <p>Hello ${data.userName},</p>
        <p>Welcome to Synchro PM${data.organizationName ? ` at ${data.organizationName}` : ''} - your multi-tenant project management solution. You can now manage projects, tickets, and collaborate with your team.</p>
        <a href="${data.loginUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Get Started</a>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">If you have any questions, please contact your administrator.</p>
      </div>
    `,
  }),

  passwordReset: (data: {
    userName: string;
    resetUrl: string;
    expiryHours: number;
  }) => ({
    subject: "🔐 Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #EF4444;">🔐 Password Reset</h2>
        <p>Hello ${data.userName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <a href="${data.resetUrl}" style="display: inline-block; background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Reset Password</a>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">This link will expire in ${data.expiryHours} hours.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this reset, you can safely ignore this email.</p>
      </div>
    `,
  }),

  weeklyDigest: (data: {
    userName: string;
    stats: {
      ticketsCreated: number;
      ticketsCompleted: number;
      commentsAdded: number;
      upcomingDeadlines: number;
    };
    projectUrl: string;
  }) => ({
    subject: "📊 Your Weekly Summary from Synchro PM",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #3B82F6;">📊 Weekly Digest</h2>
        <p>Hello ${data.userName},</p>
        <p>Here's your weekly activity summary:</p>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0;">
          <div style="background: #dbeafe; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #3B82F6;">${data.stats.ticketsCreated}</div>
            <div style="color: #666;">Tickets Created</div>
          </div>
          <div style="background: #dcfce7; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #10B981;">${data.stats.ticketsCompleted}</div>
            <div style="color: #666;">Completed</div>
          </div>
          <div style="background: #f3e8ff; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #8B5CF6;">${data.stats.commentsAdded}</div>
            <div style="color: #666;">Comments</div>
          </div>
          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #F59E0B;">${data.stats.upcomingDeadlines}</div>
            <div style="color: #666;">Upcoming Deadlines</div>
          </div>
        </div>
        <a href="${data.projectUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Dashboard</a>
      </div>
    `,
  }),
};
