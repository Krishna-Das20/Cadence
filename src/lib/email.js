import { Resend } from "resend";

// Initialize Resend clients for both domains from environment variables
const resendPrimary = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const resendSecondary = process.env.RESEND_API_KEY_2
  ? new Resend(process.env.RESEND_API_KEY_2)
  : null;

/**
 * Send email using Resend API with automatic fallback
 * Tries primary domain first, falls back to secondary if primary fails
 * 
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of the email
 * @param {string} textContent - Plain text content (optional)
 * @returns {Promise<object>} - Resend response data
 */
export async function sendMail(to, subject, htmlContent, textContent = "") {
  if (!resendPrimary && !resendSecondary) {
    console.warn("[Email] No Resend API keys configured. Set RESEND_API_KEY in .env");
    return null;
  }

  const emailOptions = {
    to: to,
    subject: subject,
    html: htmlContent,
    text: textContent || htmlContent.replace(/<[^>]+>/g, ""),
    reply_to: "fedkiit@gmail.com",
  };

  // 1. Try Primary Sender
  if (resendPrimary && process.env.EMAIL_FROM) {
    try {
      console.log(`[Email] Sending via PRIMARY: ${process.env.EMAIL_FROM}`);
      const { data, error } = await resendPrimary.emails.send({
        ...emailOptions,
        from: process.env.EMAIL_FROM,
      });

      if (!error && data) {
        console.log(`[Email] SUCCESS via PRIMARY:`, data.id);
        return data;
      }
      console.error(`[Email] PRIMARY failed:`, error?.message || "Unknown error");
    } catch (err) {
      console.error(`[Email] PRIMARY exception:`, err.message);
    }
  }

  // 2. Try Secondary (Fallback) Sender
  if (resendSecondary && process.env.EMAIL_FROM_2) {
    try {
      console.log(`[Email] Sending via SECONDARY: ${process.env.EMAIL_FROM_2}`);
      const { data, error } = await resendSecondary.emails.send({
        ...emailOptions,
        from: process.env.EMAIL_FROM_2,
      });

      if (!error && data) {
        console.log(`[Email] SUCCESS via SECONDARY:`, data.id);
        return data;
      }
      console.error(`[Email] SECONDARY failed:`, error?.message || "Unknown error");
      throw new Error(`Email failed: ${error?.message || "Secondary sender failed"}`);
    } catch (err) {
      console.error(`[Email] SECONDARY exception:`, err.message);
      throw err;
    }
  }

  throw new Error("[Email] All email senders failed or not configured");
}
