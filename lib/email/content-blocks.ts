// ---------------------------------------------------------------------------
// Reusable email content blocks (headings, paragraphs, buttons, dividers).
// ---------------------------------------------------------------------------
import { BRAND_COLOR, BRAND_DARK, INK, MUTED, BORDER } from "./email-layout"

export function h1(text: string): string {
  return `<h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;color:${INK};margin:0 0 12px;font-weight:700;">${text}</h1>`
}

export function p(text: string, color: string = MUTED, size = 15): string {
  return `<p style="font-family:Arial,Helvetica,sans-serif;font-size:${size}px;line-height:1.6;color:${color};margin:0 0 14px;">${text}</p>`
}

export function muted(text: string): string {
  return `<p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${MUTED};margin:4px 0 12px;">${text}</p>`
}

export function button(href: string, label: string): string {
  const base = "https://hercirclefoundation.app"
  const url = /^https?:\/\//i.test(href)
    ? href
    : href.startsWith("/")
      ? `${base}${href}`
      : `${base}/${href}`
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    <tr>
      <td align="center" bgcolor="${BRAND_COLOR}" style="border-radius:6px;">
        <a href="${url}" target="_blank" class="hc-btn" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;display:inline-block;padding:13px 26px;border-radius:6px;">${label}</a>
      </td>
    </tr>
  </table>`
}

export function divider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;"><tr><td style="border-bottom:1px solid ${BORDER};"></td></tr></table>`
}

export function heroBanner(title: string, subtitle?: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:-28px -28px 22px;width:calc(100% + 56px);">
    <tr>
      <td class="hc-hero" align="center" bgcolor="${BRAND_DARK}" style="padding:32px 24px;border-radius:0;">
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:26px;color:#ffffff;margin:0 0 8px;font-weight:700;">${title}</h1>
        ${subtitle ? `<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#f3e5f5;margin:0;">${subtitle}</p>` : ""}
      </td>
    </tr>
  </table>`
}

export function statChips(items: { label: string; value: string; accent?: boolean }[]): string {
  const cells = items
    .map((it) => {
      const color = it.accent ? BRAND_COLOR : INK
      return `<td valign="top" width="169" class="hc-col" style="padding:6px; text-align:center;">
        <div style="border:1px solid ${BORDER};border-radius:10px;padding:16px 10px;background:#fff;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:${color};">${it.value}</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};margin-top:4px;">${it.label}</div>
        </div>
      </td>`
    })
    .join("")
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 6px;"><tr>${cells}</tr></table>`
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}