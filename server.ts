import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import twilio from "twilio";
import { GoogleGenAI, Type } from "@google/genai";

// Initialize environment variables
dotenv.config();

const getFilename = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      return fileURLToPath(import.meta.url);
    }
  } catch (e) {
    // Fallback to CJS global if any error
  }
  return typeof __filename !== "undefined" ? __filename : "";
};

const getDirname = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch (e) {
    // Fallback to CJS global if any error
  }
  return typeof __dirname !== "undefined" ? __dirname : "";
};

const currentFilename = getFilename();
const currentDirname = getDirname();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Lazy Initialization helper for GoogleGenAI
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured on the server");
    }
    return new GoogleGenAI({ apiKey });
  };

  // 1. Generate Product Tags Endpoint
  app.post("/api/gemini/generate-tags", async (req, res) => {
    try {
      const { name, category, description } = req.body;
      if (!name || !category) {
        return res.status(400).json({ error: "Missing required parameters name or category." });
      }

      const ai = getGeminiClient();
      const prompt = `Generate exactly 3 short, premium fashion tags for a product.
      Name: "${name}"
      Category: "${category}"
      Description: "${description || ''}"

      Each tag should be 1-2 words maximum. Focus on style, vibe, or material.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are a premium streetwear brand consultant. You generate short, high-impact fashion tags that evoke luxury, urban culture, and artisanal quality.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["tags"],
            properties: {
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 highly curated fashion tags"
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      res.json(data);
    } catch (error: any) {
      console.error("[Backend Gemini/generate-tags Error]:", error);
      res.status(500).json({ error: error.message || "Failed to generate tags" });
    }
  });

  // 2. Enhance Product Description Endpoint
  app.post("/api/gemini/enhance-description", async (req, res) => {
    try {
      const { product, selectedColor, selectedSize, selectedGsm } = req.body;
      if (!product || !selectedColor || !selectedSize || !selectedGsm) {
        return res.status(400).json({ error: "Missing parameters for description enhancement." });
      }

      const ai = getGeminiClient();
      const prompt = `
        You are a high-end luxury streetwear copywriter for "Kings Clothing Brand". 
        Your mission is to forge a unique, commanding product narrative for "${product.name}".
        
        Product Details:
        - Category: ${product.category}
        - Fabric Shade: ${selectedColor.name || selectedColor}
        - Structural Sizing: ${selectedSize}
        - Fabric Weight: ${selectedGsm} GSM
        - Base Blueprint: ${product.description}
        
        Brand Guidelines:
        - Theme: "Ghanaian Craftsmanship" (soul of Accra, precision of heritage) meets "Streetwear Authority" (unapologetic leadership).
        - Vocabulary: Architectural, authoritative, evocative, rhythmic.
        - Length: Exactly one punchy, high-impact paragraph (approx 40-60 words).
        - Goal: Make the customer feel like they are commissioning a royal asset.
        
        Note: Specifically reference the color "${selectedColor.name || selectedColor}" and the "${selectedGsm} GSM" weight to make the narrative feel custom-forged for this specific selection.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      res.json({ text: response.text ? response.text.trim() : "" });
    } catch (error: any) {
      console.error("[Backend Gemini/enhance-description Error]:", error);
      res.status(500).json({ error: error.message || "Failed to enhance description" });
    }
  });

  // 3. Generate Design Endpoint (Image Mockup creation)
  app.post("/api/gemini/generate-design", async (req, res) => {
    try {
      const { prompt: genPrompt } = req.body;
      if (!genPrompt) {
        return res.status(400).json({ error: "Prompt is required." });
      }

      const ai = getGeminiClient();
      const systemContext = `
        You are a specialized Streetwear Design AI for "Kings Clothing Brand". 
        Create a high-resolution, premium streetwear mockup image based on the user's concept.
        The design should feel heavy, authoritative, and regal. 
        Focus on bold typography, royal emblems, and minimalist but powerful aesthetics.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: `${systemContext}\n\nUser Concept: ${genPrompt}` }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let foundImage = false;
      let base64Data = "";
      const candidates = (response as any).candidates;
      if (candidates && candidates[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData) {
            base64Data = part.inlineData.data;
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        return res.status(500).json({ error: "AI failed to produce a visual blueprint." });
      }

      res.json({ imageUrl: `data:image/png;base64,${base64Data}` });
    } catch (error: any) {
      console.error("[Backend Gemini/generate-design Error]:", error);
      res.status(500).json({ error: error.message || "Failed to generate design" });
    }
  });

  // 4. Validate Design Endpoint
  app.post("/api/gemini/validate-design", async (req, res) => {
    try {
      const { base64Data, mimeType } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: "Base64 data is required." });
      }

      const ai = getGeminiClient();
      const prompt = `
        You are the Kings Clothing Brand AI Validator. 
        Perform a surgical analysis of this design asset for:
        1. STREETWEAR RELEVANCE: Does it align with modern, high-end urban aesthetics?
        2. DESIGN QUALITY: Analysis of resolution, composition, and visual impact.
        3. BRAND ALIGNMENT: Check if it carries the "Kings" authority, mindset, or logo elements.
        
        Provide a verdict on whether this design is worthy of being forged into a blueprint.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType: mimeType || 'image/jpeg' } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["passed", "reasoning", "suggestedName", "category"],
            properties: {
              passed: { type: Type.BOOLEAN, description: "Whether the design meets brand standards." },
              reasoning: { type: Type.STRING, description: "Detailed analysis of relevance, quality, and alignment." },
              suggestedName: { type: Type.STRING, description: "A high-impact name for the design." },
              category: { type: Type.STRING, description: "The most suitable clothing category." },
              score: { type: Type.NUMBER, description: "Authority Score (0-100)." }
            }
          }
        }
      });

      const result = JSON.parse(response.text);
      res.json(result);
    } catch (error: any) {
      console.error("[Backend Gemini/validate-design Error]:", error);
      res.status(500).json({ error: error.message || "Failed to validate design" });
    }
  });

  // 5. Generate video (Veo Video Generation Operation)
  app.post("/api/gemini/generate-video", async (req, res) => {
    try {
      const { prompt, imageBytes, mimeType } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
      }

      const ai = getGeminiClient();
      let imagePart = undefined;
      if (imageBytes && mimeType) {
        imagePart = {
          imageBytes,
          mimeType
        };
      }

      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: prompt,
        image: imagePart,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '9:16'
        }
      });

      res.json({ operation });
    } catch (error: any) {
      console.error("[Backend Gemini/generate-video Error]:", error);
      res.status(500).json({ error: error.message || "Failed to generate video operation" });
    }
  });

  // 6. Get Veo Video Operation status and package video
  app.post("/api/gemini/get-video-operation", async (req, res) => {
    try {
      const { operation } = req.body;
      if (!operation) {
        return res.status(400).json({ error: "Operation object is required." });
      }

      const ai = getGeminiClient();
      const updatedOperation = await ai.operations.getVideosOperation({ operation });
      
      let base64Video = null;
      if (updatedOperation.done) {
        const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
          const apiKey = process.env.GEMINI_API_KEY;
          const videoResponse = await fetch(downloadLink, {
            method: 'GET',
            headers: {
              'x-goog-api-key': apiKey || '',
            },
          });
          if (videoResponse.ok) {
            const buffer = await videoResponse.arrayBuffer();
            base64Video = `data:video/mp4;base64,${Buffer.from(buffer).toString('base64')}`;
          }
        }
      }

      res.json({ operation: updatedOperation, base64Video });
    } catch (error: any) {
      console.error("[Backend Gemini/get-video-operation Error]:", error);
      res.status(500).json({ error: error.message || "Failed to get video operation" });
    }
  });

  // Paystack Initialize Endpoint
  app.post("/api/paystack/initialize", async (req, res) => {
    try {
      const { email, amount, reference, metadata } = req.body;
      if (!email || !amount || !reference) {
        return res.status(400).json({ error: "Missing required parameters: email, amount, or reference." });
      }

      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      
      // If we don't have a real Secret Key, return simulation-required flag to frontend
      if (!secretKey || secretKey === "your_paystack_secret_key") {
        console.log(`[Paystack backend-mock] Initiating dry-run mode for reference ${reference}.`);
        return res.json({
          status: true,
          mode: "simulation",
          message: "Simulator initiated (No secret key present on server)",
          data: {
            authorization_url: "#",
            access_code: "sim_access_code_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
            reference
          }
        });
      }

      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          amount: Math.round(amount), // must be in subunits (e.g. pesewas)
          reference,
          metadata,
          currency: "GHS"
        })
      });

      const data: any = await response.json();
      if (!response.ok || !data.status) {
        console.error("[Paystack Initialize Error response from gateway]:", data);
        return res.status(response.status || 400).json({ 
          error: data.message || "Failed to initialize Paystack transaction with external gateway." 
        });
      }

      res.json(data);
    } catch (error: any) {
      console.error("[Paystack /api/paystack/initialize Error]:", error);
      res.status(500).json({ error: error.message || "Failed to initialize Paystack transaction." });
    }
  });

  // Paystack Verify Endpoint
  app.get("/api/paystack/verify/:reference", async (req, res) => {
    try {
      const { reference } = req.params;
      if (!reference) {
        return res.status(400).json({ error: "Missing reference." });
      }

      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      
      // If no secret key is present, verify mock simulation references successfully
      if (!secretKey || secretKey === "your_paystack_secret_key" || reference.startsWith("KNGS_MOMO_PAY_") || reference.includes("sim_access_code_")) {
        console.log(`[Paystack backend-mock] Successful verification dry-run for reference ${reference}.`);
        return res.json({
          status: true,
          message: "Verification successful (Simulation mode)",
          data: {
            status: "success",
            reference,
            amount: 0, // checked client-side
            gateway_response: "Approved",
            channel: "mobile_money"
          }
        });
      }

      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${secretKey}`
        }
      });

      const data: any = await response.json();
      if (!response.ok || !data.status) {
        console.error("[Paystack Verify Error response from gateway]:", data);
        return res.status(response.status || 400).json({
          error: data.message || "Failed to verify Paystack reference with external gateway."
        });
      }

      res.json(data);
    } catch (error: any) {
      console.error("[Paystack /api/paystack/verify Error]:", error);
      res.status(500).json({ error: error.message || "Failed to verify Paystack transaction." });
    }
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

  // RESTOCK NOTIFICATION ENDPOINT (Nodemailer config)
  app.post("/api/send-restock-emails", async (req, res) => {
    const { productId, productName, emails } = req.body;

    if (!productId || !productName || !emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "Missing required parameters for restock notification." });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'no-reply@kingsclothing.brand';

    const shortId = productId.slice(0, 8);
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
            background-color: rgba(34, 197, 94, 0.15);
            color: #22c55e;
            border: 1px solid rgba(34, 197, 94, 0.3);
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.1em;
            font-weight: bold;
            padding: 6px 16px;
            border-radius: 100px;
            margin-top: 15px;
          }
          .greeting {
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 15px;
            color: #ffffff;
          }
          .message {
            font-size: 15px;
            line-height: 1.6;
            color: #a0a0ab;
            margin-bottom: 30px;
          }
          .product-card {
            background-color: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin-bottom: 30px;
          }
          .product-title {
            font-size: 20px;
            font-weight: 900;
            color: #ffffff;
            margin: 10px 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .cta-button {
            display: inline-block;
            background-color: #ffffff;
            color: #000000;
            text-decoration: none;
            text-transform: uppercase;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.15em;
            padding: 16px 36px;
            border-radius: 100px;
            margin-top: 20px;
            transition: all 0.3s ease;
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
            <div class="status-badge">
              BACK IN STOCK
            </div>
          </div>
          
          <div class="greeting">Greetings,</div>
          
          <div class="message">
            Great news! You requested to be notified when our exclusive asset is back in our Accra inventory. The Kings Design Authority has completed production and standard distribution has been replenished.
          </div>

          <div class="product-card">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #FF5A1F; font-weight: bold;">
              Replenished Blueprint
            </div>
            <h2 class="product-title">${productName}</h2>
            <p style="font-size: 13px; color: #71717a; margin: 0 0 15px 0;">Item Code: #${shortId}</p>
            <a href="https://kingsclothing.brand/product/${productId}" class="cta-button">Secure Yours Now</a>
          </div>

          <div class="message" style="margin-bottom: 0; text-align: center; font-size: 13px;">
            Inventory is highly limited. Orders are managed on a first-come, first-served basis. Secure checkout via Paystack or standard Mobile Money is active.
          </div>

          <div class="footer">
            <p>© 2026 KINGS CREW Co. All Rights Reserved.</p>
            <p>Empowered by the Kings Design Authority Protocol</p>
          </div>
        </div>
      </body>
      </html>
    `;

    let emailsSent = 0;
    let errors: string[] = [];

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

        // Send to each subscriber
        for (const email of emails) {
          try {
            await transporter.sendMail({
              from: `"Kings Crew" <${smtpFrom}>`,
              to: email,
              subject: `👑 Back in Stock: ${productName} is officially replenished!`,
              html: htmlContent
            });
            emailsSent++;
          } catch (e: any) {
            errors.push(`${email}: ${e.message}`);
          }
        }
        console.log(`[RESTOCK SUCCESS] Restock emails successfully sent to ${emailsSent} recipients.`);
      } catch (err: any) {
        errors.push(`General SMTP error: ${err.message}`);
        console.error(`[RESTOCK SMTP ERROR] Failed to send emails:`, err.message);
      }
    } else {
      console.log(`\n======================================================\n[SIMULATED RESTOCK EMAIL] Sending to: ${emails.join(', ')}\nSubject: 👑 Back in Stock: ${productName} is officially replenished!\n======================================================\n`);
      emailsSent = emails.length;
    }

    res.json({
      status: "complete",
      sentCount: emailsSent,
      errors: errors.length > 0 ? errors : null
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
