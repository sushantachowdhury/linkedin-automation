import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { logEvent } from './store.js';

// Ensure logs directory exists for local previews
const logsDir = path.resolve('logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export async function sendReviewAlert(settings, post) {
  const approvalLink = `http://localhost:${settings.PORT || 5000}/?date=${post.date}`;
  let whatsappMsg;
  let emailHtml;
  let emailText;
  let subject;

  const activePayload = post.messagePayload || post.payload;

  if (post.draftOptions && Array.isArray(post.draftOptions) && post.draftOptions.length > 0 && !activePayload) {
    // Alert for choosing one of the 3 alternatives
    subject = `📝 Action Required: Select LinkedIn Post Draft - ${post.date}`;
    whatsappMsg = `LinkedIn post drafts are ready for selection.\nTopic: "${post.title}"\nSelect a draft here: ${approvalLink}`;
    
    const draftRender = post.draftOptions.map((opt, idx) => `
      <div style="background-color: #1e293b; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6; margin: 15px 0;">
        <h4 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Option ${idx + 1}</h4>
        <pre style="margin: 0; white-space: pre-wrap; font-family: inherit; font-size: 13.5px; line-height: 1.5; color: #e2e8f0;">${opt}</pre>
      </div>
    `).join('');

    emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f1f5f9; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        <h2 style="color: #8b5cf6; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-top: 0;">LinkedIn Post - Select Draft Option</h2>
        <p style="font-size: 16px; line-height: 1.6;">Hello Sushanta,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #94a3b8;">Your automated publishing pipeline has drafted 3 alternatives for today's topic: <strong>"${post.title}"</strong>.</p>
        <p style="font-size: 15px; line-height: 1.6; color: #94a3b8;">Please review the draft options below and click the link to select your preferred one:</p>
        
        ${draftRender}

        <div style="text-align: center; margin-top: 30px;">
          <a href="${approvalLink}" style="background-color: #8b5cf6; color: #ffffff; padding: 12px 24px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block; transition: background-color 0.2s;">
            Go to Dashboard & Select Option
          </a>
        </div>
        
        <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid #334155; padding-top: 15px; text-align: center;">
          Sushanta Chowdhury - LinkedIn Automation Pipeline
        </p>
      </div>
    `;

    emailText = `LinkedIn Post Draft Options are ready for ${post.date}.\nTopic: "${post.title}"\n\nPlease open the dashboard to select one of the 3 draft options.\n\nReview Link: ${approvalLink}`;
  } else {
    // Normal single post alert
    subject = `📝 Action Required: LinkedIn Post Review - ${post.date}`;
    whatsappMsg = `LinkedIn post review is ready for approval.\nTopic: "${post.title}"\nReview Link: ${approvalLink}`;
    
    emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f1f5f9; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        <h2 style="color: #8b5cf6; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-top: 0;">LinkedIn Post Review</h2>
        <p style="font-size: 16px; line-height: 1.6;">Hello Sushanta,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #94a3b8;">Your automated publishing pipeline has drafted a new post for today. Please review the details below:</p>
        
        <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #38bdf8; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Topic</h4>
          <p style="margin: 0; font-size: 16px; font-weight: 600;">${post.title}</p>
        </div>

        <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; max-height: 250px; overflow-y: auto;">
          <h4 style="margin: 0 0 10px 0; color: #a78bfa; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Message Draft</h4>
          <pre style="margin: 0; white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.6; color: #e2e8f0;">${activePayload}</pre>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${approvalLink}" style="background-color: #8b5cf6; color: #ffffff; padding: 12px 24px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block; transition: background-color 0.2s;">
            Approve & Edit in Dashboard
          </a>
        </div>
        
        <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid #334155; padding-top: 15px; text-align: center;">
          Sushanta Chowdhury - LinkedIn Automation Pipeline
        </p>
      </div>
    `;

    emailText = `LinkedIn Post Review Ready for ${post.date}.\nTopic: ${post.title}\n\nDraft Content:\n${activePayload}\n\nReview Link: ${approvalLink}`;
  }

  logEvent('ALERT_INFO', `Triggering alerts for date ${post.date}...`);

  // 1. Send Email
  await sendEmail(settings, {
    subject,
    html: emailHtml,
    text: emailText,
    date: post.date
  });

  // 2. Send WhatsApp
  await sendWhatsApp(settings, whatsappMsg, post.date);
}

/**
 * Send email & WhatsApp alerts for successful publishing
 * @param {Object} settings 
 * @param {Object} post 
 */
export async function sendSuccessAlert(settings, post) {
  const shareUrl = post.linkedinPostId ? `https://www.linkedin.com/feed/update/${post.linkedinPostId}` : 'https://www.linkedin.com';
  const whatsappMsg = `🚀 LinkedIn post has been successfully published!\nTopic: "${post.title}"\nView post: ${shareUrl}`;

  logEvent('ALERT_INFO', `Triggering success alerts for date ${post.date}...`);

  await sendEmail(settings, {
    subject: `🚀 Published Successfully: LinkedIn Post - ${post.date}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f1f5f9; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        <h2 style="color: #10b981; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-top: 0;">🚀 Post Published Successfully!</h2>
        <p style="font-size: 16px; line-height: 1.6;">Hello Sushanta,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #94a3b8;">Your scheduled post has been successfully published to LinkedIn:</p>
        
        <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
          <p style="margin: 0; font-size: 16px; font-weight: 600;">${post.title}</p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${shareUrl}" target="_blank" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Published Post
          </a>
        </div>
        
        <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid #334155; padding-top: 15px; text-align: center;">
          Sushanta Chowdhury - LinkedIn Automation Pipeline
        </p>
      </div>
    `,
    text: `LinkedIn post published successfully for ${post.date}.\nTopic: ${post.title}\nView post: ${shareUrl}`,
    date: post.date,
    isSuccess: true
  });

  await sendWhatsApp(settings, whatsappMsg, post.date);
}

/**
 * Send email helper
 */
async function sendEmail(settings, { subject, html, text, date, isSuccess = false }) {
  const host = settings.EMAIL_HOST;
  const port = settings.EMAIL_PORT;
  const user = settings.EMAIL_USER;
  const pass = settings.EMAIL_PASS;
  const to = settings.EMAIL_TO;

  const previewFile = path.join(logsDir, `email_preview_${date}_${isSuccess ? 'success' : 'review'}.html`);

  if (!host || !user || !pass || !to) {
    // Write local HTML file fallback
    fs.writeFileSync(previewFile, html, 'utf-8');
    logEvent('ALERT_WARN', `SMTP email details not configured. Saved preview to: ${previewFile}`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port) || 587,
      secure: parseInt(port) === 465,
      auth: { user, pass }
    });

    await transporter.sendMail({
      from: `"LinkedIn Automation" <${user}>`,
      to,
      subject,
      text,
      html
    });

    logEvent('ALERT_SUCCESS', `Email sent successfully to ${to}`);
  } catch (err) {
    logEvent('ALERT_ERROR', `Failed to send email via SMTP: ${err.message}. Saved preview locally.`);
    fs.writeFileSync(previewFile, html, 'utf-8');
  }
}

function formatWhatsAppNumber(num, defaultCountryCode = '91') {
  if (!num) return '';
  let cleaned = num.toString().trim();
  if (!cleaned.startsWith('whatsapp:')) {
    if (cleaned.startsWith('+')) {
      cleaned = `whatsapp:${cleaned}`;
    } else {
      if (cleaned.length === 10) {
        cleaned = `whatsapp:+${defaultCountryCode}${cleaned}`;
      } else {
        cleaned = `whatsapp:+${cleaned}`;
      }
    }
  }
  return cleaned;
}

/**
 * Send WhatsApp helper
 */
async function sendWhatsApp(settings, body, date) {
  const sid = settings.TWILIO_ACCOUNT_SID;
  const token = settings.TWILIO_AUTH_TOKEN;
  
  const rawFrom = settings.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  const rawTo = settings.TWILIO_WHATSAPP_TO || '8017129474';
  
  const from = formatWhatsAppNumber(rawFrom);
  const to = formatWhatsAppNumber(rawTo);

  const rawNumberOnly = to.replace('whatsapp:', '');
  const updatedBody = `${body}\n\n(Confirmed to: ${rawNumberOnly})`;

  const previewFile = path.join(logsDir, `whatsapp_preview_${date}.json`);

  if (!sid || !token) {
    // Write local JSON preview fallback
    fs.writeFileSync(previewFile, JSON.stringify({ to, from, body: updatedBody, timestamp: new Date().toISOString() }, null, 2), 'utf-8');
    logEvent('ALERT_WARN', `Twilio API credentials not configured. Saved WhatsApp preview to: ${previewFile}`);
    return;
  }

  try {
    const client = twilio(sid, token);
    const message = await client.messages.create({
      body: updatedBody,
      from,
      to
    });
    logEvent('ALERT_SUCCESS', `WhatsApp alert sent successfully to ${to} (SID: ${message.sid})`);
  } catch (err) {
    logEvent('ALERT_ERROR', `Failed to send WhatsApp alert via Twilio: ${err.message}. Saved preview locally.`);
    fs.writeFileSync(previewFile, JSON.stringify({ to, from, body: updatedBody, error: err.message }, null, 2), 'utf-8');
  }
}
