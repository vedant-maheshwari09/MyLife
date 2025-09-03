import nodemailer from 'nodemailer';

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getCodeExpiryTime(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 15); // 15 minutes from now
  return expiry;
}

// Create a transporter using Gmail SMTP
// For development, we'll still log to console, but this sets up the structure for real email
let transporter: nodemailer.Transporter | null = null;

function createTransporter() {
  if (!transporter) {
    // For development - we'll still use console logging
    // To use real Gmail, you would need:
    // 1. A Gmail account with "App Password" enabled
    // 2. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables
    
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });
    }
  }
  return transporter;
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    const transport = createTransporter();
    
    if (transport) {
      // Send real email
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'MyLife - Email Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ea580c;">MyLife Email Verification</h2>
            <p>Thank you for signing up for MyLife! Please use the verification code below to complete your registration:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #ea580c; font-size: 32px; letter-spacing: 4px; margin: 0;">${code}</h1>
            </div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">MyLife - Personal Organization App</p>
          </div>
        `
      };
      
      await transport.sendMail(mailOptions);
      console.log(`✅ Verification email sent to: ${email}`);
      return true;
    } else {
      // Development mode - log to console
      console.log("\n" + "=".repeat(60));
      console.log("📧 EMAIL VERIFICATION CODE");
      console.log("=".repeat(60));
      console.log(`To: ${email}`);
      console.log(`Verification Code: ${code}`);
      console.log(`Expires in: 15 minutes`);
      console.log("=".repeat(60) + "\n");
      console.log("💡 To enable real email sending:");
      console.log("1. Create a Gmail App Password");
      console.log("2. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables");
      
      return true;
    }
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<boolean> {
  try {
    const transport = createTransporter();
    
    if (transport) {
      // Send real email
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'MyLife - Password Reset Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ea580c;">MyLife Password Reset</h2>
            <p>You requested to reset your password. Please use the verification code below to reset your password:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #ea580c; font-size: 32px; letter-spacing: 4px; margin: 0;">${code}</h1>
            </div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">MyLife - Personal Organization App</p>
          </div>
        `
      };
      
      await transport.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to: ${email}`);
      return true;
    } else {
      // Development mode - log to console
      console.log("\n" + "=".repeat(60));
      console.log("🔑 PASSWORD RESET CODE");
      console.log("=".repeat(60));
      console.log(`To: ${email}`);
      console.log(`Reset Code: ${code}`);
      console.log(`Expires in: 15 minutes`);
      console.log("=".repeat(60) + "\n");
      console.log("💡 To enable real email sending:");
      console.log("1. Create a Gmail App Password");
      console.log("2. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables");
      
      return true;
    }
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}

export async function sendTodoReminderEmail(email: string, todoTitle: string, dueDate?: Date, dueTime?: string): Promise<boolean> {
  try {
    const transport = createTransporter();
    
    let dueDateText = "";
    if (dueDate) {
      const dateStr = dueDate.toLocaleDateString();
      dueDateText = dueTime ? `Due: ${dateStr} at ${dueTime}` : `Due: ${dateStr}`;
    }
    
    if (transport) {
      // Send real email
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: `⏰ Reminder: ${todoTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 24px;">⏰ Todo Reminder</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="color: #333; margin-top: 0;">Don't forget:</h2>
              <p style="font-size: 18px; color: #555; margin: 15px 0;"><strong>${todoTitle}</strong></p>
              ${dueDateText ? `<p style="color: #666; margin: 10px 0;">${dueDateText}</p>` : ""}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666;">This is a friendly reminder from your MyLife app.</p>
              <p style="color: #999; font-size: 14px;">Mark this task as complete when you're done!</p>
            </div>
          </div>
        `
      };
      
      await transport.sendMail(mailOptions);
      console.log(`✅ Todo reminder email sent to: ${email} for task: ${todoTitle}`);
      return true;
    } else {
      // Development mode - log to console
      console.log("\n" + "=".repeat(60));
      console.log("⏰ TODO REMINDER");
      console.log("=".repeat(60));
      console.log(`To: ${email}`);
      console.log(`Task: ${todoTitle}`);
      if (dueDateText) console.log(`${dueDateText}`);
      console.log("=".repeat(60) + "\n");
      return true;
    }
  } catch (error) {
    console.error('Error sending todo reminder email:', error);
    return false;
  }
}