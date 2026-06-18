const crypto = require("crypto");

const providerLabels = {
  dev_gateway: "Development payment - test only",
  stripe: "Card / Apple Pay / Google Pay",
  paypal: "PayPal",
  adyen: "Global checkout",
  wise: "International bank transfer",
  sslcommerz: "SSLCommerz / local cards and mobile banking",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  bank_transfer: "Bank transfer - admin verification",
  manual: "Manual payment - admin verification",
};

function enabledProviders() {
  const configured = (process.env.PAYMENT_PROVIDERS || "bank_transfer").split(",").map((item) => item.trim()).filter(Boolean);
  return configured
    .filter((id) => providerLabels[id])
    .map((id) => ({ id, label: providerLabels[id] || id.replace(/_/g, " "), mode: providerMode(id), ready: providerReady(id) }));
}

function providerMode(provider) {
  if (provider === "dev_gateway") return "development_checkout";
  if (["manual", "bank_transfer"].includes(provider)) return "manual_review";
  return "hosted_checkout";
}

function providerCheckoutUrl(provider) {
  return process.env[`PAYMENT_${provider.toUpperCase()}_CHECKOUT_URL`];
}

function frontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean)[0] || "http://localhost:3000";
}

function normalizeCheckoutUrl(url) {
  if (!url) return url;
  const value = String(url);
  if (!value.includes(",")) return value;
  const origin = frontendUrl();
  const checkoutPath = value.match(/https?:\/\/[^/]+(\/checkout\?.*)$/);
  return checkoutPath ? `${origin}${checkoutPath[1]}` : value.split(",").map((item) => item.trim()).filter(Boolean)[0];
}

function providerReady(provider) {
  if (provider === "dev_gateway") return process.env.NODE_ENV !== "production" || process.env.PAYMENT_ENABLE_DEVELOPMENT_GATEWAY === "true";
  if (provider === "bkash") return Boolean(process.env.BKASH_BASE_URL && process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET && process.env.BKASH_USERNAME && process.env.BKASH_PASSWORD && process.env.BKASH_CALLBACK_URL);
  return Boolean(providerCheckoutUrl(provider));
}

function makeReference(projectId) {
  return `ESC-${projectId}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function makeProviderSessionId(provider) {
  return `${provider}_${crypto.randomBytes(16).toString("hex")}`;
}

async function bkashRequest(path, { token, body }) {
  const baseUrl = process.env.BKASH_BASE_URL.replace(/\/$/, "");
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-APP-Key": process.env.BKASH_APP_KEY,
  };
  if (token) headers.Authorization = token;
  else {
    headers.username = process.env.BKASH_USERNAME;
    headers.password = process.env.BKASH_PASSWORD;
  }
  const response = await fetch(`${baseUrl}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.statusCode && data.statusCode !== "0000") throw Object.assign(new Error(data.statusMessage || data.message || "bKash request failed."), { status: 502, data });
  return data;
}

async function createBkashPayment(project, reference) {
  const tokenData = await bkashRequest("/tokenized/checkout/token/grant", {
    body: { app_key: process.env.BKASH_APP_KEY, app_secret: process.env.BKASH_APP_SECRET },
  });
  const idToken = tokenData.id_token;
  const payment = await bkashRequest("/tokenized/checkout/create", {
    token: idToken,
    body: {
      mode: "0011",
      payerReference: String(project.client_id),
      callbackURL: process.env.BKASH_CALLBACK_URL,
      amount: Number(project.budget).toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: reference,
    },
  });
  if (!payment.bkashURL || !payment.paymentID) throw Object.assign(new Error("bKash did not return a checkout URL."), { status: 502 });
  return { checkoutUrl: payment.bkashURL, providerSessionId: payment.paymentID };
}

async function executeBkashPayment(paymentID) {
  const tokenData = await bkashRequest("/tokenized/checkout/token/grant", {
    body: { app_key: process.env.BKASH_APP_KEY, app_secret: process.env.BKASH_APP_SECRET },
  });
  return bkashRequest("/tokenized/checkout/execute", { token: tokenData.id_token, body: { paymentID } });
}

async function createPaymentSession({ project, provider }) {
  const available = enabledProviders().map((item) => item.id);
  if (!available.includes(provider)) throw Object.assign(new Error("This payment provider is not enabled."), { status: 400 });
  const mode = providerMode(provider);
  if (mode === "hosted_checkout" && !providerReady(provider)) {
    throw Object.assign(new Error(`${providerLabels[provider] || provider} is not configured with real payment credentials.`), { status: 400 });
  }
  const reference = makeReference(project.id);
  let providerSessionId = makeProviderSessionId(provider);
  let checkoutUrl = null;
  if (provider === "dev_gateway") {
    checkoutUrl = `${frontendUrl()}/checkout?provider=dev_gateway&session=${encodeURIComponent(providerSessionId)}&reference=${encodeURIComponent(reference)}&amount=${encodeURIComponent(project.budget)}`;
  }
  if (provider === "bkash") {
    const bkash = await createBkashPayment(project, reference);
    providerSessionId = bkash.providerSessionId;
    checkoutUrl = bkash.checkoutUrl;
  }
  const hostedCheckoutUrl = providerCheckoutUrl(provider);
  if (mode === "hosted_checkout" && provider !== "bkash" && !hostedCheckoutUrl) {
    throw Object.assign(new Error(`${providerLabels[provider] || provider} is not configured with a real checkout URL.`), { status: 400 });
  }
  if (!checkoutUrl && mode === "hosted_checkout") {
    checkoutUrl = `${hostedCheckoutUrl}?session=${encodeURIComponent(providerSessionId)}&reference=${encodeURIComponent(reference)}&amount=${encodeURIComponent(project.budget)}`;
  }
  return {
    provider,
    reference,
    providerSessionId,
    checkoutUrl,
    status: "pending",
    mode,
  };
}

function verifyWebhookSignature(provider, rawBody, signature) {
  const secret = process.env[`PAYMENT_${provider.toUpperCase()}_WEBHOOK_SECRET`] || process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature || "")));
}

module.exports = { createPaymentSession, enabledProviders, executeBkashPayment, frontendUrl, normalizeCheckoutUrl, verifyWebhookSignature };
