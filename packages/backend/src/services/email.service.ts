import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private n8nWebhookUrl: string | null = null;

  constructor() {
    this.n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || null;

    if (this.n8nWebhookUrl) {
      logger.info('✅ Service d\'envoi d\'email configuré avec N8n webhook');
    } else {
      this.initializeTransporter();
    }
  }

  private initializeTransporter() {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    if (!emailUser || !emailPassword) {
      logger.warn('⚠️  EMAIL_USER ou EMAIL_PASSWORD non configurés - les emails seront loggés seulement');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });

      logger.info('✅ Service d\'envoi d\'email configuré avec succès (Gmail SMTP)');
    } catch (error) {
      logger.error('❌ Erreur lors de la configuration du service email:', error);
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<void> {
    const from = options.from || process.env.EMAIL_USER || 'noreply@example.com';

    // Option 1: N8n Webhook (prioritaire)
    if (this.n8nWebhookUrl) {
      return this.sendViaN8nWebhook({ ...options, from });
    }

    // Option 2: Gmail SMTP
    if (this.transporter) {
      return this.sendViaSmtp({ ...options, from });
    }

    // Option 3: Mode simulation (log seulement)
    logger.info('=== EMAIL À ENVOYER (MODE SIMULATION) ===');
    logger.info(`De: ${from}`);
    logger.info(`À: ${options.to}`);
    logger.info(`Sujet: ${options.subject}`);
    logger.info(`Contenu HTML: ${options.html.substring(0, 500)}...`);
    logger.info('==========================================');
  }

  private async sendViaN8nWebhook(options: {
    to: string;
    subject: string;
    html: string;
    from: string;
  }): Promise<void> {
    try {
      const response = await fetch(this.n8nWebhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: options.to,
          subject: options.subject,
          html: options.html,
          from: options.from,
        }),
      });

      if (!response.ok) {
        throw new Error(`N8n webhook réponse: ${response.status} ${response.statusText}`);
      }

      logger.info(`✅ Email envoyé via N8n à ${options.to}`);
    } catch (error) {
      logger.error(`❌ Erreur lors de l'envoi via N8n à ${options.to}:`, error);
      throw new Error(`Erreur lors de l'envoi de l'email via N8n: ${error}`);
    }
  }

  private async sendViaSmtp(options: {
    to: string;
    subject: string;
    html: string;
    from: string;
  }): Promise<void> {
    try {
      const info = await this.transporter!.sendMail({
        from: `"DPE Matching" <${options.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      logger.info(`✅ Email envoyé via Gmail SMTP à ${options.to} - Message ID: ${info.messageId}`);
    } catch (error) {
      logger.error(`❌ Erreur lors de l'envoi via SMTP à ${options.to}:`, error);
      throw new Error(`Erreur lors de l'envoi de l'email via SMTP: ${error}`);
    }
  }
}

export const emailService = new EmailService();
