import { baseTemplate, gradientButtonHtml } from './base.template';

export function welcomeEmailTemplate(name: string, appUrl: string): string {
  const content = `
    <h1 style="font-size:28px;font-weight:800;margin:0 0 8px 0;color:#fafafa;letter-spacing:-0.035em;">
      Welcome to Synkaro, ${name} 🎬
    </h1>
    <p style="font-size:15px;line-height:1.8;color:#a1a1aa;margin:0 0 28px 0;">
      Your private space to watch movies, YouTube, and video-call together — perfectly synced.
      No lag, no compromises.
    </p>

    <!-- Premium badge -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.12);border-radius:16px;margin:0 0 28px 0;">
      <tr>
        <td style="padding:24px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:14px;vertical-align:top;">
                <span style="font-size:28px;">🎬</span>
              </td>
              <td>
                <p style="margin:0 0 4px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.15em;color:#ffffff;font-weight:700;">
                  Everything Free — Unlimited Access
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#fafafa;">
                  All features are free. Unlimited watch time, HD calls,
                  movie uploads, all themes, encrypted chat — no limits.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- What you can do -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 32px 0;">
      <tr>
        <td style="padding:16px 20px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
          <p style="margin:0 0 12px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#71717a;font-weight:600;">
            Get started in seconds
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
                <span style="color:#ffffff;font-weight:600;">1.</span> Create a room — couples or friends
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
                <span style="color:#ffffff;font-weight:600;">2.</span> Share the 6-char invite code
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
                <span style="color:#ffffff;font-weight:600;">3.</span> Upload a movie or paste YouTube — watch synced
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
                <span style="color:#ffffff;font-weight:600;">4.</span> Video call while watching together
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div style="margin:32px 0;text-align:center;">
      ${gradientButtonHtml('Open Synkaro', `${appUrl}/dashboard`)}
    </div>

    <p style="font-size:12px;color:#52525b;margin:0;line-height:1.6;text-align:center;">
      Questions? Reply to this email — goes straight to the founder.
    </p>`;
  return baseTemplate(content, { preheader: `Welcome to Synkaro, ${name} — all features are free!` });
}
