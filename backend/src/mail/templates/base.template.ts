interface BaseOpts {
  preheader?: string;
}

export function baseTemplate(content: string, opts: BaseOpts = {}): string {
  const preheader = opts.preheader ?? '';
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="x-apple-disable-message-reformatting"/>
<title>Synkaro</title>
<style>
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; padding: 20px 12px !important; }
    .inner { padding: 28px 20px !important; }
    h1 { font-size: 22px !important; }
    .code-display { font-size: 36px !important; letter-spacing: 12px !important; }
  }
  a { color: #ffffff; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Segoe UI','Inter',-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;color:#fafafa;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;">
  <span style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preheader}${'&#847; &zwnj; '.repeat(20)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;">
    <tr>
      <td align="center" style="padding:40px 16px 32px;">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" class="container"
          style="max-width:580px;background:#0a0a0a;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
          <!-- Logo -->
          <tr>
            <td class="inner" style="padding:36px 44px 0 44px;">
              <table role="presentation" cellpadding="0" cellspacing="0" align="left">
                <tr>
                  <!-- Icon: white rounded box with a play triangle (email-safe, no SVG) -->
                  <td style="vertical-align:middle;padding-right:12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td width="40" height="40" style="width:40px;height:40px;background:#ffffff;border-radius:11px;text-align:center;vertical-align:middle;line-height:40px;">
                        <div style="width:0;height:0;border-style:solid;border-width:8px 0 8px 13px;border-color:transparent transparent transparent #000000;display:inline-block;vertical-align:middle;"></div>
                      </td>
                    </tr></table>
                  </td>
                  <!-- Text: Synkaro -->
                  <td style="vertical-align:middle;">
                    <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;font-family:'Segoe UI',Arial,sans-serif;line-height:1;">Synkaro</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td class="inner" style="padding:28px 44px 40px 44px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="inner" style="padding:24px 44px 32px 44px;border-top:1px solid rgba(255,255,255,0.05);background:rgba(0,0,0,0.2);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:16px;">
                          <a href="https://synkaro.bhupeshchauhan.in" style="font-size:12px;color:#71717a;">Website</a>
                        </td>
                        <td style="padding-right:16px;">
                          <a href="https://instagram.com/bhupeshchauhanz" style="font-size:12px;color:#71717a;">Instagram</a>
                        </td>
                        <td>
                          <a href="mailto:support@bhupeshchauhan.in" style="font-size:12px;color:#71717a;">Support</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;line-height:1.6;color:#52525b;">
                      © ${year} Synkaro · Built by <a href="https://bhupeshchauhan.in" style="color:#71717a;">Bhupesh Chauhan</a>
                      <br/>
                      You received this because you signed up at <a href="https://synkaro.bhupeshchauhan.in" style="color:#71717a;">synkaro.bhupeshchauhan.in</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buttonHtml(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td style="border-radius:9999px;background:#ffffff;padding:1px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#000000;border-radius:9999px;">
              <a href="${href}" style="display:inline-block;padding:14px 36px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:-0.01em;">
                ${label}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

export function gradientButtonHtml(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td style="border-radius:9999px;background:#ffffff;">
        <a href="${href}" style="display:inline-block;padding:14px 36px;color:#000000;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:-0.01em;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}
