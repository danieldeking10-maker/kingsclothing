const json = (body: unknown, init: ResponseInit = {}) =>
  Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });

const getSecretKey = () => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || !secretKey.startsWith("sk_")) {
    return null;
  }
  return secretKey;
};

const parseJsonBody = async (req: Request) => {
  try {
    return await req.json();
  } catch {
    return null;
  }
};

const initializeTransaction = async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, { status: 405 });
  }

  const body = await parseJsonBody(req);
  const email = body?.email;
  const amount = Number(body?.amount);
  const reference = body?.reference;
  const metadata = body?.metadata;

  if (typeof email !== "string" || !email.includes("@") || !Number.isFinite(amount) || amount <= 0 || typeof reference !== "string") {
    return json({ error: "Missing or invalid payment parameters." }, { status: 400 });
  }

  const secretKey = getSecretKey();
  if (!secretKey) {
    return json(
      { error: "Payment gateway not configured. Please contact support.", code: "GATEWAY_NOT_CONFIGURED" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount),
        reference,
        metadata,
        currency: "GHS",
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.status) {
      return json(
        { error: data?.message || "Payment gateway temporarily unavailable.", code: "GATEWAY_UNAVAILABLE" },
        { status: response.ok ? 502 : response.status },
      );
    }

    return json(data);
  } catch {
    return json(
      { error: "Payment gateway temporarily unavailable. Please try again.", code: "GATEWAY_UNAVAILABLE" },
      { status: 502 },
    );
  }
};

const verifyTransaction = async (_req: Request, reference: string | undefined) => {
  if (!reference) {
    return json({ error: "Missing payment reference." }, { status: 400 });
  }

  const secretKey = getSecretKey();
  if (!secretKey) {
    return json(
      { error: "Payment verification service not configured.", code: "VERIFICATION_NOT_CONFIGURED" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.status) {
      return json(
        { error: data?.message || "Payment verification temporarily unavailable.", code: "VERIFICATION_UNAVAILABLE" },
        { status: response.ok ? 502 : response.status },
      );
    }

    return json(data);
  } catch {
    return json(
      { error: "Payment verification temporarily unavailable. Please try again.", code: "VERIFICATION_UNAVAILABLE" },
      { status: 502 },
    );
  }
};

export default async (req: Request) => {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const action = parts[2];

  if (action === "initialize") {
    return initializeTransaction(req);
  }

  if (action === "verify") {
    return verifyTransaction(req, parts.slice(3).join("/"));
  }

  return json({ error: "Payment endpoint not found." }, { status: 404 });
};

export const config = {
  path: ["/api/paystack/initialize", "/api/paystack/verify/:reference"],
};
