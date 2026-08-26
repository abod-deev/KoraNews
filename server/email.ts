import nodemailer from 'nodemailer';

// Configure mail transporter with environment variables if available or Ethereal/test fallback
function createTransporter() {
  const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || '587');
  const user = process.env.SMTP_USER || process.env.MAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.MAIL_PASS || process.env.GMAIL_APP_PASSWORD;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }

  if (user && pass && user.includes('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }

  return null;
}

export async function sendVerificationEmail(email: string, code: string, name?: string): Promise<boolean> {
  const transporter = createTransporter();
  
  const htmlContent = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">تأكيد البريد الإلكتروني</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">أهلاً بك${name ? ' ' + name : ''}! نرحب بك في منصتنا الرياضية</p>
      </div>
      
      <div style="padding: 32px 24px; text-align: center;">
        <p style="font-size: 15px; color: #374151; margin-bottom: 24px; line-height: 1.6;">
          شكراً لتسجيلك معنا. لإكمال عملية إنشاء الحساب وتفادي البريد الوهمي، يرجى استخدام رمز التحقق التالي:
        </p>

        <div style="background-color: #f3f4f6; border: 2px dashed #10b981; border-radius: 12px; padding: 20px; display: inline-block; margin: 12px 0 24px 0;">
          <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #059669;">${code}</span>
        </div>

        <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.5;">
          رمز التحقق هذا صالحة لمدة <strong>10 دقائق</strong> فقط.<br>إذا لم تقم بطلب هذا الرمز، يرجى تجاهل هذه الرسالة.
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-t: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af;">
        © ${new Date().getFullYear()} جميع الحقوق محفوظة - المنصة الرياضية
      </div>
    </div>
  `;

  if (!transporter) {
    console.log(`[Email Verification] SMTP not configured. Code for ${email} is: [ ${code} ]`);
    return false; // Return false to indicate no real SMTP sent, so devCode can be shown in preview
  }

  try {
    const fromAddr = process.env.SMTP_FROM || process.env.GMAIL_USER || '"المنصة الرياضية" <noreply@sports-app.com>';
    await transporter.sendMail({
      from: fromAddr,
      to: email,
      subject: `رمز تحقق حسابك الرياضي: ${code}`,
      html: htmlContent
    });
    console.log(`[Email Verification] Email successfully sent to ${email}`);
    return true;
  } catch (err) {
    console.error(`[Email Verification] Failed to send email to ${email}:`, err);
    console.log(`[Email Verification] Fallback code for ${email} is: [ ${code} ]`);
    return false;
  }
}
