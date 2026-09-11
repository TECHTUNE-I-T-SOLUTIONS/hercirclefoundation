// ---------------------------------------------------------------------------
// Responsive email header/footer + shell. Built with tables and inline styles
// for maximum email-client compatibility, plus mobile-first @media rules.
// All images use the public HerCircle logo/links.
// ---------------------------------------------------------------------------
import { EMAIL_BRAND, PUBLIC_LINKS } from "./constants"

export const BRAND_COLOR = "#c2185b" // primary pink
export const BRAND_DARK = "#880e4f"
export const INK = "#1f2937"
export const MUTED = "#6b7280"
export const BORDER = "#e5e7eb"
export const BG_LIGHT = "#f8f5f2"
export const BG_WHITE = "#ffffff"

/** Absolute URL helper for image/banner assets. */
export function assetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return `${EMAIL_BRAND.website}${path}`
}

/** Standard header: centered logo + brand, subtle nav links (desktop row,
 *  hidden on narrow screens). */
export function renderHeader(): string {
  const nav = PUBLIC_LINKS.map(
    (l) =>
      `<a href="${l.href}" target="_blank" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#f3e5f5;margin:0 8px;text-decoration:none;">${l.label}</a>`,
  ).join("")

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_DARK};">
    <tr>
      <td align="center" style="padding:20px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <a href="${EMAIL_BRAND.website}" target="_blank">
                <img src="${assetUrl("/logo.png")}" width="76" height="95" alt="${EMAIL_BRAND.name}" style="display:block;border:0;outline:none;text-decoration:none;" />
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:10px;">
              <span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${EMAIL_BRAND.name}</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:12px;padding-bottom:4px;">
              <div class="hc-nav" style="text-align:center;line-height:2;">
                ${nav}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
}

/** Standard footer with brand blurb, quick links, department mailboxes, socials
 *  and an unsubscribe note. Columns stack on mobile. */
export function renderFooter(): string {
  const quickLinks = [
    "https://hercirclefoundation.app/about",
    "https://hercirclefoundation.app/gallery",
    "https://hercirclefoundation.app/partner",
    "https://hercirclefoundation.app/blog",
    "https://hercirclefoundation.app/events",
    "https://hercirclefoundation.app/donate",
  ]
    .map((href) => {
      const label = href.split("/").pop() || "Home"
      return `<a href="${href}" target="_blank" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED};text-decoration:none;display:block;padding:3px 0;">${label.charAt(0).toUpperCase() + label.slice(1)}</a>`
    })
    .join("")

  const mailboxes = [
    "support", "finance", "donations", "programs",
    "partnerships",
  ]
    .map(
      (k) =>
        `<a href="mailto:${k}@hercirclefoundation.app" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED};text-decoration:none;display:block;padding:2px 0;">${k}@hercirclefoundation.app</a>`,
    )
    .join("")

  return footerHtml(quickLinks, mailboxes)
}

function footerHtml(quickLinks: string, mailboxes: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG_LIGHT};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
          <tr>
            <td align="left" style="padding:0 8px 20px; border-bottom:1px solid ${BORDER};">
              <a href="${EMAIL_BRAND.website}" target="_blank" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:${BRAND_COLOR};text-decoration:none;">${EMAIL_BRAND.name}</a>
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED};margin:6px 0 0;">Breaking period poverty &amp; empowering young women through menstrual health education.</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top" width="50%" class="hc-col" style="padding:0 8px;">
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:${INK};text-transform:uppercase;letter-spacing:0.5px;">Explore</span>
                    ${quickLinks}
                  </td>
                  <td valign="top" width="50%" class="hc-col" style="padding:0 8px;">
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:${INK};text-transform:uppercase;letter-spacing:0.5px;">Departments</span>
                    ${mailboxes}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:20px;border-top:1px solid ${BORDER};">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 6px;"><a href="${EMAIL_BRAND.social.instagram}" target="_blank" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};text-decoration:none;">Instagram</a></td>
                  <td style="padding:0 6px;"><a href="${EMAIL_BRAND.social.facebook}" target="_blank" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};text-decoration:none;">Facebook</a></td>
                  <td style="padding:0 6px;"><a href="${EMAIL_BRAND.social.twitter}" target="_blank" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};text-decoration:none;">Twitter</a></td>
                </tr>
              </table>
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};margin:12px 0 4px;">You are receiving this email because you subscribed to HerCircle Foundation updates.</p>
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};margin:2px 0;">&copy; ${new Date().getFullYear()} ${EMAIL_BRAND.name} &middot; ${EMAIL_BRAND.address}</p>
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};margin:2px 0;"><a href="${EMAIL_BRAND.website}/contact" target="_blank" style="color:${BRAND_COLOR};text-decoration:none;">Unsubscribe or update preferences</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
}

/** Full responsive shell: header + content + footer, with mobile media query. */
export function renderShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${EMAIL_BRAND.name}</title>
    <style type="text/css">
      /* Outlook/background resets */
      #outlook a { padding: 0; }
      body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
      .hc-nav a { display: inline-block; margin: 0 4px; }
      /* Mobile responsive rules */
      @media only screen and (max-width: 640px) {
        .hc-col { display: block !important; width: 100% !important; padding: 8px 0 !important; }
        .hc-hero { padding: 24px 16px !important; }
        .hc-pad { padding: 20px 16px !important; }
        .hc-btn { display: block !important; width: 100% !important; }
        .hc-nav a { display: inline-block; margin: 2px 4px; font-size: 11px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:${BG_LIGHT};">
    <center role="presentation" style="width:100%;table-layout:fixed;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_LIGHT};">
        <tr>
          <td align="center" style="padding:0;">
            <!-- Hide webmail wizard + add snippet-friendly width -->
            ${renderHeader()}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:${BG_WHITE};">
              <tr>
                <td class="hc-pad" style="padding:28px 28px;">
                  ${content}
                </td>
              </tr>
            </table>
            ${renderFooter()}
          </td>
        </tr>
      </table>
    </center>
  </body>
</html>`
}