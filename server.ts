import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import twilio from "twilio";

// Initialize environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Notification Endpoint for Order Status Updates
  app.post("/api/notify", async (req, res) => {
    const { orderId, customerName, customerEmail, momoNumber, status, items, totalAmount } = req.body;

    if (!orderId || !customerName || !customerEmail || !status) {
      return res.status(400).json({ error: "Missing required order parameters for notification." });
    }

    const shortOrderId = orderId.slice(0, 8);
    const smsBody = status === 'processing' 
      ? `Kings Crew: Order #${shortOrderId} is now PROCESSING! Payment confirmed, production has commenced.`
      : `Kings Crew: Order #${shortOrderId} is now SHIPPED! Stay alert for delivery instructions.`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #050505;
            color: #ffffff;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #0E0E10;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }
          .header {
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 25px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: #FF5A1F; /* Royal Accent */
            margin: 0;
          }
          .status-badge {
            display: inline-block;
            background-color: rgba(255, 90, 31, 0.15);
            color: #FF5A1F;
            border: 1px solid rgba(255, 90, 31, 0.3);
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.1em;
            font-weight: bold;
            padding: 6px 16px;
            border-radius: 100px;
            margin-top: 15px;
          }
          .status-shipped {
            background-color: rgba(34, 197, 94, 0.15);
            color: #22c55e;
            border: 1px solid rgba(34, 197, 94, 0.3);
          }
          .greeting {
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 15px;
          }
          .message {
            font-size: 15px;
            line-height: 1.6;
            color: #a0a0ab;
            margin-bottom: 30px;
          }
          .order-details {
            background-color: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
          }
          .detail-title {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #71717a;
            margin-bottom: 10px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          }
          .item-row:last-child {
            border-bottom: none;
          }
          .item-name {
            color: #ffffff;
            font-weight: 500;
          }
          .item-details {
            font-size: 12px;
            color: #71717a;
          }
          .item-price {
            color: #a0a0ab;
          }
          .total-section {
            display: flex;
            justify-content: space-between;
            font-size: 16px;
            font-weight: bold;
            padding-top: 15px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            margin-top: 15px;
          }
          .total-label {
            color: #ffffff;
          }
          .total-value {
            color: #FF5A1F;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #52525b;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 25px;
            margin-top: 40px;
          }
          .footer p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">KINGS CREW</h1>
            <div class="status-badge ${status === 'shipped' ? 'status-shipped' : ''}">
              ORDER ${status === 'processing' ? 'PROCESSING' : 'SHIPPED'}
            </div>
          </div>
          
          <div class="greeting">Hi ${customerName},</div>
          
          <div class="message">
            ${status === 'processing' 
              ? `Verification protocol complete! Your deposit has been confirmed. Order <strong>#${shortOrderId}</strong> is official, and our elite design authority is currently crafting, printing, and sizing your selection.` 
              : `Status upgraded! Order <strong>#${shortOrderId}</strong> has been transferred to our sovereign logistics team and is officially <strong>SHIPPED</strong>. Prepare your wardrobe for arrival.`}
          </div>

          ${items && items.length > 0 ? `
            <div class="order-details">
              <div class="detail-title">Manifest Summary</div>
              ${items.map((item: any) => `
                <div class="item-row">
                  <div>
                    <div class="item-name">${item.name}</div>
                    <div class="item-details">Size: ${item.size || 'N/A'} | Color: ${item.color || 'N/A'} (x${item.quantity})</div>
                  </div>
                  <div class="item-price">₵${(item.price * item.quantity).toFixed(2)}</div>
                </div>
              `).join('')}
              
              ${totalAmount ? `
                <div class="total-section">
                  <span class="total-label">Total Volume</span>
                  <span class="total-value">₵${totalAmount.toFixed(2)}</span>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <div class="message" style="margin-bottom: 0;">
            If you have any questions, feel free to track progress on your private agent portal or reach out to us at support@kingsclothing.brand.
          </div>

          <div class="footer">
            <p>© 2026 KINGS CREW Co. All Rights Reserved.</p>
            <p>Empowered by the Kings Design Authority Protocol</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 1. Send SMS via Twilio
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;

    let smsDispatched = false;
    let smsError = null;

    if (twilioAccountSid && twilioAuthToken && twilioFromNumber) {
      try {
        const twilioClient = twilio(twilioAccountSid, twilioAuthToken);
        const validatedTo = momoNumber.startsWith('+') ? momoNumber : `+233${momoNumber.replace(/^0/, '')}`; // Standardize GHA momo format with Twilio
        
        await twilioClient.messages.create({
          body: smsBody,
          to: validatedTo,
          from: twilioFromNumber
        });
        smsDispatched = true;
        console.log(`[SMS SUCCESS] SMS notification successfully sent to ${validatedTo}`);
      } catch (err: any) {
        smsError = err.message;
        console.error(`[SMS ERROR] Failed to send SMS to ${momoNumber}:`, err.message);
      }
    } else {
      smsError = "Twilio credentials missing. SMS content logged under simulation environment.";
      console.log(`\n======================================================\n[SIMULATED SMS] Send to ${momoNumber}:\n"${smsBody}"\n======================================================\n`);
    }

    // 2. Send email via SMTP (Nodemailer)
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'no-reply@kingsclothing.brand';

    let emailDispatched = false;
    let emailError = null;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        await transporter.sendMail({
          from: `"Kings Crew" <${smtpFrom}>`,
          to: customerEmail,
          subject: status === 'processing' 
            ? `👑 Kings Crew - Order #${shortOrderId} is now Processing`
            : `🚀 Kings Crew - Order #${shortOrderId} has Shipped!`,
          html: htmlContent
        });
        emailDispatched = true;
        console.log(`[EMAIL SUCCESS] Email notification successfully sent to ${customerEmail}`);
      } catch (err: any) {
        emailError = err.message;
        console.error(`[EMAIL ERROR] Failed to send email to ${customerEmail}:`, err.message);
      }
    } else {
      emailError = "SMTP configurations missing. Email content logged under simulation environment.";
      console.log(`\n======================================================\n[SIMULATED EMAIL] Send to ${customerEmail}:\nSubject: ${status === 'processing' ? `👑 Kings Crew - Order #${shortOrderId} is now Processing` : `🚀 Kings Crew - Order #${shortOrderId} has Shipped!`}\nBody:\n${htmlContent.replace(/<[^>]*>/g, '').trim().slice(0, 500)}...\n======================================================\n`);
    }

    res.json({
      status: "complete",
      sms: {
        dispatched: smsDispatched,
        error: smsError,
        recipient: momoNumber
      },
      email: {
        dispatched: emailDispatched,
        error: emailError,
        recipient: customerEmail
      }
    });
  });

  // AI Verification Endpoint (Placeholder)
  app.post("/api/verify-design", async (req, res) => {
    // This will be implemented with Gemini API on the frontend
    // but we can have a backend endpoint if needed for persistence
    res.json({ status: "pending", message: "AI verification logic handled on client" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
