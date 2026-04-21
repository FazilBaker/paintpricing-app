import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = "PaintPricing <hello@paintpricing.com>";

export async function sendWelcomeEmail(to: string, businessName: string) {
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to,
    replyTo: "contact@paintpricing.com",
    subject: "Welcome to PaintPricing — you're all set!",
    html: welcomeHtml(businessName),
  });
}

function welcomeHtml(businessName: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px 40px;">

    <!-- Logo / wordmark -->
    <div style="margin-bottom:32px;">
      <span style="font-size:20px;font-weight:700;color:#1E3A5F;letter-spacing:-0.3px;">PaintPricing</span>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:12px;padding:40px 36px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1E3A5F;line-height:1.25;">
        You're all set, ${businessName}!
      </h1>
      <p style="margin:0 0 24px;font-size:16px;color:#475569;line-height:1.6;">
        Your account is ready. You can now create professional painting quotes in minutes — with branded PDFs your clients will actually trust.
      </p>

      <!-- What's included -->
      <div style="background:#F8FAFC;border-radius:8px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">What's included in your free trial</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#1E293B;">✓ &nbsp;3 free quote unlocks</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#1E293B;">✓ &nbsp;Branded PDF generation</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#1E293B;">✓ &nbsp;Interior &amp; exterior estimates</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#1E293B;">✓ &nbsp;Shareable quote links for clients</td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <a href="https://app.paintpricing.com/quotes/new"
         style="display:block;text-align:center;background:#F5A623;color:#1E3A5F;font-weight:700;font-size:16px;padding:14px 32px;border-radius:6px;text-decoration:none;">
        Create your first quote →
      </a>
    </div>

    <!-- Footer -->
    <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">
      Questions? Reply to this email — we read every one.<br>
      <a href="https://paintpricing.com" style="color:#94A3B8;">paintpricing.com</a>
    </p>

  </div>
</body>
</html>`;
}
