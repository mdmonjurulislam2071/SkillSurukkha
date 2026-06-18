"use client";

import { useEffect, useState } from "react";
import { FiArrowLeft, FiCheckCircle, FiCreditCard, FiLock } from "react-icons/fi";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function readSession() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("skillshurokkha_session") || "null");
  } catch {
    return null;
  }
}

export default function CheckoutPage() {
  const [details, setDetails] = useState({ provider: "", providerSessionId: "", reference: "", amount: "" });
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDetails({
      provider: params.get("provider") || "",
      providerSessionId: params.get("session") || "",
      reference: params.get("reference") || "",
      amount: params.get("amount") || "",
    });
    setSession(readSession());
  }, []);
  const { provider, providerSessionId, reference, amount } = details;
  const isDevelopment = provider === "dev_gateway";

  const confirmPayment = async () => {
    try {
      setStatus("loading");
      setMessage("");
      if (!session?.token) throw new Error("Please sign in as the client before confirming this development payment.");
      if (!isDevelopment || !providerSessionId || !reference) throw new Error("Invalid development payment session.");
      const result = await api("/payments/development/confirm", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ providerSessionId, reference }),
      });
      setStatus("success");
      setMessage(result.message || "Escrow funded successfully.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5faf7] px-6 py-12 text-[#073b32]">
      <section className="mx-auto flex min-h-[calc(100vh-96px)] max-w-xl items-center">
        <div className="w-full rounded-[28px] bg-white p-8 shadow-card sm:p-10">
          <div className="mb-8 flex items-start justify-between gap-6">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.32em] text-emerald-600">Development Checkout</p>
              <h1 className="text-4xl font-black">Fund escrow</h1>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-5 text-3xl text-emerald-700"><FiLock /></div>
          </div>

          <div className="rounded-[20px] bg-slate-50 p-5">
            <div className="mb-4 flex items-center gap-3 text-lg font-black"><FiCreditCard /> Development payment</div>
            <p className="text-sm font-bold text-slate-500">Amount: {amount ? `৳${Number(amount).toLocaleString()}` : "Not available"}</p>
            <p className="mt-2 break-all text-sm font-bold text-slate-400">Session: {providerSessionId || "Missing"}</p>
            <p className="mt-2 break-all text-sm font-bold text-slate-400">Reference: {reference || "Missing"}</p>
          </div>

          <p className="mt-6 text-base leading-8 text-slate-600">
            This is a local development checkout. Confirming here marks escrow as funded for testing the hiring flow. Real gateways can replace this later.
          </p>

          {message && (
            <div className={`mt-5 rounded-2xl p-4 text-sm font-black ${status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {message}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={confirmPayment}
              disabled={status === "loading" || status === "success"}
              className="inline-flex items-center gap-2 rounded-full bg-[#0c3b32] px-6 py-4 font-black text-white disabled:bg-slate-300"
            >
              <FiCheckCircle /> {status === "loading" ? "Confirming..." : status === "success" ? "Confirmed" : "Confirm development payment"}
            </button>
            <button
              onClick={() => { window.location.href = "/#jobs"; }}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-6 py-4 font-black text-slate-700"
            >
              <FiArrowLeft /> Back
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
