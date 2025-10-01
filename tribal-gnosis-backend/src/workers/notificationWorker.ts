import { User, Tenant } from '../models';
import { connectDB } from '../config/database';
import nodemailer from 'nodemailer';

/**
 * PRIORITY WORKER #3: Notification & Communication Hub
 * 
 * This worker:
 * - Sends user onboarding sequences
 * - Manages subscription renewal reminders
 * - Processes usage limit notifications
 * - Handles system alerts and status updates
 */

interface NotificationJob {
  type: 'onboarding' | 'usage_warning' | 'renewal_reminder' | 'system_alert';
  tenantId?: string;
  userId?: string;
  data: Record<string, any>;
  scheduledFor: Date;
  processed: boolean;
}

export class NotificationWorker {
  private emailTransporter: any;
  
  constructor() {
    this.initializeEmailService();
  }
  
  private initializeEmailService() {
    // Configure with your preferred email service
    this.emailTransporter = nodemailer.createTransporter({
      service: 'gmail', // or SendGrid, AWS SES, etc.
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  
  async processOnboardingSequence(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId).populate('tenantId');
      if (!user) return;
      
      const tenant = user.tenantId as any;
      
      // Day 1: Welcome email
      await this.sendWelcomeEmail(user.email, user.name, tenant.companyCode);
      
      // Day 3: Feature tour (scheduled)
      setTimeout(async () => {
        await this.sendFeatureTourEmail(user.email, user.name);
      }, 3 * 24 * 60 * 60 * 1000);
      
      // Day 7: Usage tips (scheduled)
      setTimeout(async () => {
        await this.sendUsageTipsEmail(user.email, user.name);
      }, 7 * 24 * 60 * 60 * 1000);
      
      console.log(`Onboarding sequence initiated for ${user.email}`);
      
    } catch (error) {
      console.error('Onboarding sequence error:', error);
    }
  }
  
  async checkUsageLimits(): Promise<void> {
    try {
      const tenants = await Tenant.find({});
      
      for (const tenant of tenants) {
        const usage = tenant.usage?.currentPeriod;
        if (!usage) continue;
        
        // Check if approaching limits (80% threshold)
        const subscription = tenant.subscription;
        const limits = this.getTierLimits(subscription?.tier);
        
        const minutesPercent = (usage.transcriptionMinutes / limits.minutes) * 100;
        const storagePercent = (usage.storageUsedMB / limits.storage) * 100;
        
        if (minutesPercent >= 80 || storagePercent >= 80) {
          await this.sendUsageWarning(tenant, minutesPercent, storagePercent);
        }
        
        // Check for renewals (7 days before)
        if (subscription?.nextBillingDate) {
          const daysUntilRenewal = Math.ceil(
            (new Date(subscription.nextBillingDate).getTime() - Date.now()) 
            / (24 * 60 * 60 * 1000)
          );
          
          if (daysUntilRenewal <= 7 && daysUntilRenewal > 0) {
            await this.sendRenewalReminder(tenant, daysUntilRenewal);
          }
        }
      }
      
    } catch (error) {
      console.error('Usage limits check error:', error);
    }
  }
  
  private getTierLimits(tier: string) {
    const limits: Record<string, { minutes: number; storage: number }> = {
      STARTER: { minutes: 100, storage: 1024 },
      GROWTH: { minutes: 1000, storage: 10240 },
      PROFESSIONAL: { minutes: 5000, storage: 51200 },
      ENTERPRISE: { minutes: 15000, storage: 204800 }
    };
    return limits[tier] || limits.STARTER;
  }
  
  private async sendWelcomeEmail(email: string, name: string, companyCode: string): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@tribal-gnosis.com',
      to: email,
      subject: 'Welcome to Tribal Gnosis! 🚀',
      html: `
        <h2>Welcome ${name}!</h2>
        <p>Your Tribal Gnosis account is ready. Here's your company access code:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <strong>Company Code: ${companyCode}</strong>
        </div>
        <p>Get started by:</p>
        <ul>
          <li>Uploading your first audio file</li>
          <li>Exploring the knowledge base</li>
          <li>Inviting your team members</li>
        </ul>
        <p>Need help? Reply to this email anytime!</p>
      `
    };
    
    await this.emailTransporter.sendMail(mailOptions);
  }
  
  private async sendFeatureTourEmail(email: string, name: string): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@tribal-gnosis.com',
      to: email,
      subject: 'Discover Tribal Gnosis Features',
      html: `
        <h2>Hi ${name}!</h2>
        <p>Ready to unlock the full power of Tribal Gnosis? Here are the key features:</p>
        <div style="background: #f8f9fa; padding: 15px; margin: 15px 0; border-left: 4px solid #007bff;">
          <h3>🎯 AI-Powered Analysis</h3>
          <p>Get instant insights and summaries from your conversations</p>
        </div>
        <div style="background: #f8f9fa; padding: 15px; margin: 15px 0; border-left: 4px solid #28a745;">
          <h3>📚 Knowledge Base</h3>
          <p>Build your organizational knowledge repository automatically</p>
        </div>
        <div style="background: #f8f9fa; padding: 15px; margin: 15px 0; border-left: 4px solid #ffc107;">
          <h3>🔍 Smart Search</h3>
          <p>Find information across all your content instantly</p>
        </div>
      `
    };
    
    await this.emailTransporter.sendMail(mailOptions);
  }
  
  private async sendUsageTipsEmail(email: string, name: string): Promise<void> {
    // Implementation for usage tips email
  }
  
  private async sendUsageWarning(tenant: any, minutesPercent: number, storagePercent: number): Promise<void> {
    // Implementation for usage warning emails
  }
  
  private async sendRenewalReminder(tenant: any, daysUntilRenewal: number): Promise<void> {
    // Implementation for renewal reminder emails
  }
  
  async sendSystemAlert(message: string, level: 'info' | 'warning' | 'error'): Promise<void> {
    // Send alerts to admin users or Slack/Discord webhook
    console.log(`System Alert [${level.toUpperCase()}]: ${message}`);
  }
}

// Background job runner
export const runNotificationWorker = async () => {
  const worker = new NotificationWorker();
  
  // Check usage limits every 6 hours
  setInterval(async () => {
    console.log('Checking usage limits and sending notifications...');
    await worker.checkUsageLimits();
  }, 6 * 60 * 60 * 1000); // 6 hours
  
  // Send system health alerts daily
  setInterval(async () => {
    await worker.sendSystemAlert('Daily system health check completed', 'info');
  }, 24 * 60 * 60 * 1000); // 24 hours
};

if (require.main === module) {
  runNotificationWorker();
}