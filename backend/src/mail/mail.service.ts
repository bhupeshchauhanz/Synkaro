import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { otpEmailTemplate } from './templates/otp.template';
import { welcomeEmailTemplate } from './templates/welcome.template';
import { resetEmailTemplate } from './templates/reset.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.config.get<string>('GMAIL_USER'),
        pass: this.config.get<string>('GMAIL_APP_PASSWORD'),
      },
    });
    this.from =
      this.config.get<string>('MAIL_FROM') ??
      `Synkaro <${this.config.get<string>('GMAIL_USER') ?? 'no-reply@synkaro.app'}>`;
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    await this.send(email, 'Your Synkaro verification code', otpEmailTemplate(otp));
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL') ?? 'https://synkaro.bhupeshchauhan.in';
    await this.send(email, 'Welcome to Synkaro', welcomeEmailTemplate(name, appUrl));
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    await this.send(email, 'Reset your Synkaro password', resetEmailTemplate(resetUrl));
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.error(`Failed to send mail to ${to}: ${msg}`);
      throw err;
    }
  }
}
