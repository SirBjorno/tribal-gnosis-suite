// Email service for user management
// This is a placeholder implementation - in production, you would integrate with
// a service like SendGrid, AWS SES, Mailgun, or similar

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

class EmailService {
  
  async sendInvitationEmail(
    email: string, 
    token: string, 
    companyName: string, 
    inviterName: string, 
    role: string
  ): Promise<boolean> {
    try {
      const inviteLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${token}`;
      
      const template = this.getInvitationTemplate({
        email,
        companyName,
        inviterName,
        role,
        inviteLink
      });

      // In development, log the invitation details
      if (process.env.NODE_ENV === 'development') {
        console.log('=== EMAIL INVITATION ===');
        console.log(`To: ${email}`);
        console.log(`Subject: ${template.subject}`);
        console.log(`Invite Link: ${inviteLink}`);
        console.log(`Company: ${companyName}`);
        console.log(`Invited by: ${inviterName}`);
        console.log(`Role: ${role}`);
        console.log('========================');
        return true;
      }

      // TODO: Implement actual email sending
      // Example with SendGrid:
      // await sgMail.send({
      //   to: email,
      //   from: process.env.FROM_EMAIL,
      //   subject: template.subject,
      //   html: template.html,
      //   text: template.text
      // });

      return true;

    } catch (error) {
      console.error('Failed to send invitation email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, name: string, companyName: string): Promise<boolean> {
    try {
      const template = this.getWelcomeTemplate({ name, companyName });

      if (process.env.NODE_ENV === 'development') {
        console.log('=== WELCOME EMAIL ===');
        console.log(`To: ${email}`);
        console.log(`Subject: ${template.subject}`);
        console.log(`Name: ${name}`);
        console.log(`Company: ${companyName}`);
        console.log('=====================');
        return true;
      }

      // TODO: Implement actual email sending
      return true;

    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    try {
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      const template = this.getPasswordResetTemplate({ email, resetLink });

      if (process.env.NODE_ENV === 'development') {
        console.log('=== PASSWORD RESET EMAIL ===');
        console.log(`To: ${email}`);
        console.log(`Subject: ${template.subject}`);
        console.log(`Reset Link: ${resetLink}`);
        console.log('============================');
        return true;
      }

      // TODO: Implement actual email sending
      return true;

    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }

  private getInvitationTemplate(params: {
    email: string;
    companyName: string;
    inviterName: string;
    role: string;
    inviteLink: string;
  }): EmailTemplate {
    const { companyName, inviterName, role, inviteLink } = params;

    const subject = `You're invited to join ${companyName} on Tribal Gnosis`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invitation to ${companyName}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧠 Tribal Gnosis</h1>
        </div>
        <div class="content">
          <h2>You're invited to join ${companyName}!</h2>
          <p>Hi there,</p>
          <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on Tribal Gnosis as a <strong>${role}</strong>.</p>
          <p>Tribal Gnosis is an AI-powered transcription and knowledge management platform that helps teams capture, analyze, and organize their conversations and content.</p>
          <p>Click the button below to accept your invitation and create your account:</p>
          <p style="text-align: center;">
            <a href="${inviteLink}" class="button">Accept Invitation</a>
          </p>
          <p><strong>What you can do as a ${role}:</strong></p>
          <ul>
            ${this.getRoleFeatures(role)}
          </ul>
          <p>This invitation will expire in 7 days. If you have any questions, feel free to reach out to ${inviterName} or our support team.</p>
          <p>Welcome to the team!</p>
        </div>
        <div class="footer">
          <p>© 2025 Tribal Gnosis. All rights reserved.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const text = `
You're invited to join ${companyName} on Tribal Gnosis!

${inviterName} has invited you to join ${companyName} as a ${role}.

Accept your invitation: ${inviteLink}

This invitation expires in 7 days.

© 2025 Tribal Gnosis
    `;

    return { subject, html, text };
  }

  private getWelcomeTemplate(params: { name: string; companyName: string }): EmailTemplate {
    const { name, companyName } = params;

    const subject = `Welcome to Tribal Gnosis, ${name}!`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to Tribal Gnosis</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Tribal Gnosis!</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>Welcome to <strong>${companyName}</strong> on Tribal Gnosis! We're excited to have you on board.</p>
          <p>Here's what you can do to get started:</p>
          <ul>
            <li>Complete your profile setup</li>
            <li>Upload your first audio or video for transcription</li>
            <li>Explore the AI-powered analysis features</li>
            <li>Build your knowledge base</li>
            <li>Invite team members to collaborate</li>
          </ul>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
          </p>
          <p>If you need any help getting started, check out our documentation or contact support.</p>
          <p>Happy transcribing!</p>
        </div>
        <div class="footer">
          <p>© 2025 Tribal Gnosis. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const text = `
Welcome to Tribal Gnosis, ${name}!

Welcome to ${companyName} on Tribal Gnosis! We're excited to have you on board.

Get started: ${process.env.FRONTEND_URL}/dashboard

© 2025 Tribal Gnosis
    `;

    return { subject, html, text };
  }

  private getPasswordResetTemplate(params: { email: string; resetLink: string }): EmailTemplate {
    const { resetLink } = params;

    const subject = 'Reset Your Tribal Gnosis Password';
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>Hi there,</p>
          <p>We received a request to reset your password for your Tribal Gnosis account.</p>
          <p>Click the button below to create a new password:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
        <div class="footer">
          <p>© 2025 Tribal Gnosis. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const text = `
Reset Your Tribal Gnosis Password

We received a request to reset your password.

Reset your password: ${resetLink}

This link expires in 1 hour.

If you didn't request this reset, please ignore this email.

© 2025 Tribal Gnosis
    `;

    return { subject, html, text };
  }

  private getRoleFeatures(role: string): string {
    const features = {
      admin: [
        'Full access to all transcription and analysis features',
        'Manage team members and permissions',
        'View usage analytics and billing information',
        'Configure integrations and settings',
        'Export data and reports'
      ],
      analyst: [
        'Create and edit transcriptions',
        'Run AI analysis on content',
        'Manage knowledge base entries',
        'View team usage statistics',
        'Export transcriptions and analyses'
      ],
      user: [
        'Create transcriptions',
        'View transcription results',
        'Access analysis results',
        'Search knowledge base',
        'Basic collaboration features'
      ]
    };

    const roleFeatures = features[role as keyof typeof features] || features.user;
    return roleFeatures.map(feature => `<li>${feature}</li>`).join('');
  }
}

export const emailService = new EmailService();
export const sendInvitationEmail = emailService.sendInvitationEmail.bind(emailService);
export const sendWelcomeEmail = emailService.sendWelcomeEmail.bind(emailService);
export const sendPasswordResetEmail = emailService.sendPasswordResetEmail.bind(emailService);
export default emailService;