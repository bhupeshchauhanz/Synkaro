import { baseTemplate } from './base.template';

export function otpEmailTemplate(otp: string): string {
  const content = `
    <h1 style="font-size:26px;font-weight:800;margin:0 0 6px 0;color:#fafafa;letter-spacing:-0.03em;">
      Verify your email
    </h1>
    <p style="font-size:15px;line-height:1.7;color:#a1a1aa;margin:0 0 32px 0;">
      Enter this code to complete your sign-up. Almost there!
    </p>

    <!-- OTP Code Box -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:40px 24px;text-align:center;">
          <p style="margin:0 0 16px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;font-weight:600;">
            Your verification code
          </p>
          <div class="code-display" style="font-size:52px;font-weight:800;letter-spacing:18px;color:#fafafa;font-family:'Courier New','JetBrains Mono',monospace;">
            ${otp}
          </div>
          <p style="margin:20px 0 0 0;font-size:12px;color:#71717a;">
            Expires in <span style="color:#ffffff;font-weight:600;">10 minutes</span>
          </p>
        </td>
      </tr>
    </table>

    <!-- Security tip -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0 0 0;">
      <tr>
        <td style="padding:14px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:12px;vertical-align:top;">
                <span style="font-size:14px;">🔒</span>
              </td>
              <td>
                <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                  <strong style="color:#fafafa;">Security:</strong> Never share this code.
                  Synkaro will never ask for it via DM, phone, or any other channel.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="font-size:11px;color:#52525b;margin:20px 0 0 0;line-height:1.6;text-align:center;">
      Didn't request this? You can safely ignore this email.
    </p>`;
  return baseTemplate(content, { preheader: `Your Synkaro code: ${otp}` });
}
