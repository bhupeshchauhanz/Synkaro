import { baseTemplate, buttonHtml } from './base.template';

export function resetEmailTemplate(resetUrl: string): string {
  const content = `
    <h1 style="font-size:26px;font-weight:800;margin:0 0 8px 0;color:#fafafa;letter-spacing:-0.03em;">
      Reset your password
    </h1>
    <p style="font-size:15px;line-height:1.7;color:#a1a1aa;margin:0 0 28px 0;">
      Someone requested a password reset for your Synkaro account. Tap below to choose a new one.
    </p>

    <div style="margin:0 0 28px 0;text-align:center;">
      ${buttonHtml('Reset my password', resetUrl)}
    </div>

    <!-- Timer -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px 0;">
      <tr>
        <td style="text-align:center;padding:14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;">
          <p style="margin:0;font-size:12px;color:#71717a;">
            ⏱ This link expires in <strong style="color:#fafafa;">30 minutes</strong>
          </p>
        </td>
      </tr>
    </table>

    <p style="font-size:12px;color:#71717a;margin:0 0 8px 0;line-height:1.6;">
      If the button doesn't work, copy and paste this:
    </p>
    <p style="font-size:11px;color:#a1a1aa;margin:0 0 24px 0;word-break:break-all;font-family:'Courier New','JetBrains Mono',monospace;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:10px 14px;">
      ${resetUrl}
    </p>

    <p style="font-size:12px;color:#52525b;margin:0;line-height:1.6;text-align:center;">
      Didn't request this? Ignore this email — your account is safe.
    </p>`;
  return baseTemplate(content, { preheader: 'Reset your Synkaro password (expires in 30 min)' });
}
