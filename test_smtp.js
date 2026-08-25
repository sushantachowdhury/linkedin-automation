import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load active environment variables
dotenv.config({ path: path.resolve('.env') });

async function verifySMTP() {
  console.log('=== SMTP EMAIL CONFIGURATION VERIFICATION ===\n');

  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const to = process.env.EMAIL_TO;

  console.log(`Configured Parameters:`);
  console.log(`- SMTP Host: ${host || 'Not set'}`);
  console.log(`- SMTP Port: ${port || 'Not set'}`);
  console.log(`- SMTP User: ${user || 'Not set'}`);
  console.log(`- SMTP Password: ${pass ? '••••••••' : 'Not set'}`);
  console.log(`- Recipient Email: ${to || 'Not set'}\n`);

  if (!host || !port || !user || !pass || !to) {
    console.error('❌ Error: Missing configuration parameters in .env file.');
    console.log('Please configure them in the dashboard Settings panel or edit the .env file directly.');
    process.exit(1);
  }

  const numericPort = parseInt(port);
  const secure = numericPort === 465;

  console.log(`1. Initializing SMTP connection to ${host}:${port} (SSL/TLS: ${secure ? 'Yes' : 'No'})...`);
  
  const transporter = nodemailer.createTransport({
    host,
    port: numericPort,
    secure,
    auth: { user, pass },
    // Increase connection timeout
    connectionTimeout: 10000, 
    greetingTimeout: 10000
  });

  try {
    // Verify connection configuration
    console.log('2. Verifying credentials and server handshake...');
    await transporter.verify();
    console.log('✅ Connection verified successfully! Handshake complete.');

    // Send a test email
    console.log(`\n3. Sending a test email to ${to}...`);
    const info = await transporter.sendMail({
      from: `"LinkedIn Automation Test" <${user}>`,
      to,
      subject: '🧪 SMTP Alert Connection Test - Successful!',
      text: 'Congratulations! Your automated LinkedIn publishing pipeline email alerts are successfully configured.',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f1f5f9; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
          <h2 style="color: #10b981; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-top: 0;">🧪 SMTP Setup Successful</h2>
          <p style="font-size: 16px; line-height: 1.6;">Hello Sushanta Chowdhury,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #94a3b8;">This is a test notification confirming that your SMTP server is fully integrated with your publishing pipeline.</p>
          
          <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #e2e8f0; font-family: monospace;">
              Connection Status: VERIFIED<br>
              Server: ${host}:${port}<br>
              Sender: ${user}<br>
              Recipient: ${to}
            </p>
          </div>
          
          <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid #334155; padding-top: 15px; text-align: center;">
            Sushanta Chowdhury - Automated LinkedIn Publishing Pipeline
          </p>
        </div>
      `
    });

    console.log(`✅ Test email successfully sent! Message ID: ${info.messageId}`);
    console.log(`Check your inbox at "${to}" to confirm receipt.`);
  } catch (err) {
    console.error('\n❌ SMTP Verification Failed!');
    console.error(`Error Details: ${err.message}`);
    
    console.log('\nCommon troubleshooting steps:');
    if (host.includes('gmail.com')) {
      console.log('- For Gmail: You must use an "App Password", not your primary account password.');
      console.log('  Ensure 2-Step Verification is enabled, then go to Google Account Security -> App Passwords.');
    }
    console.log('- Verify that the port (587 for TLS, 465 for SSL) is correct and matches your SSL configuration.');
    console.log('- Make sure firewalls or local antivirus settings are not blocking port outgoing connections.');
  }
}

verifySMTP();
