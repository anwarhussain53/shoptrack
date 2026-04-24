"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type View = "login" | "signup" | "reset";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function LoginPage() {
  const [view, setView]         = useState<View>("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [shop, setShop]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [showPass, setShowPass] = useState(false);

  function validate() {
    if (!email.trim())                { setError("Email is required."); return false; }
    if (!emailRegex.test(email))      { setError("Enter a valid email address."); return false; }
    if (view !== "reset" && !password.trim())    { setError("Password is required."); return false; }
    if (view !== "reset" && password.length < 6) { setError("Password must be at least 6 characters."); return false; }
    if (view === "signup" && !shop.trim())        { setError("Shop name is required."); return false; }
    return true;
  }

  async function handleSubmit() {
    setError("");
    setSuccess("");
    if (!validate()) return;
    setLoading(true);

    try {
      if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setError("Invalid email or password. Please try again."); return; }
        window.location.href = "/dashboard";

      } else if (view === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) { setError(error.message); return; }

        // Create the shop record
        if (data.user) {
          await supabase.from("shops").insert({
            name:     shop.trim(),
            owner_id: data.user.id,
          });
        }
        window.location.href = "/dashboard";

      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) { setError(error.message); return; }
        setSuccess("Password reset email sent. Check your inbox.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function switchView(v: View) {
    setView(v);
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setShop("");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-1/2 bg-zinc-900 border-r border-zinc-800 flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 12 L4 5 L8 3 L12 5 L14 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="8" cy="12" r="2" fill="white"/>
              <circle cx="4" cy="12" r="1.5" fill="white"/>
              <circle cx="12" cy="12" r="1.5" fill="white"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">ShopTrack</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            The shop management tool<br />
            <span className="text-orange-500">built for real mechanics.</span>
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed mb-10">
            Track every job, text every customer automatically,
            and get paid faster — all from one screen.
          </p>
          <div className="space-y-4">
            {[
              { title: "7-stage repair workflow",   desc: "Every job has a clear status from check-in to completion." },
              { title: "Automatic SMS updates",     desc: "Customers get a text on every status change. Zero manual work." },
              { title: "One-click invoices",        desc: "Generate a professional PDF invoice from any completed job." },
            ].map((f) => (
              <div key={f.title} className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{f.title}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-zinc-800 rounded-xl p-5">
          <p className="text-zinc-300 text-sm leading-relaxed mb-3">
            "Since using ShopTrack, my customers stopped calling to ask about their cars.
            The automatic texts do the work for me."
          </p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-semibold">JR</div>
            <div>
              <div className="text-xs font-medium text-white">Jose Rodriguez</div>
              <div className="text-xs text-zinc-500">Owner, JR Auto · San Antonio, TX</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 bg-orange-500 rounded-md flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 12 L4 5 L8 3 L12 5 L14 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="8" cy="12" r="2" fill="white"/>
                <circle cx="4" cy="12" r="1.5" fill="white"/>
                <circle cx="12" cy="12" r="1.5" fill="white"/>
              </svg>
            </div>
            <span className="text-white font-semibold tracking-tight">ShopTrack</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-white mb-1">
              {view === "login"  && "Welcome back"}
              {view === "signup" && "Create your account"}
              {view === "reset"  && "Reset your password"}
            </h2>
            <p className="text-sm text-zinc-400">
              {view === "login"  && "Sign in to your ShopTrack dashboard."}
              {view === "signup" && "Get your shop set up in under 2 minutes."}
              {view === "reset"  && "We'll send a reset link to your email."}
            </p>
          </div>

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2.5 mb-4">{error}</div>
          )}
          {success && (
            <div className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs rounded-lg px-3 py-2.5 mb-4">{success}</div>
          )}

          <div className="space-y-4">

            {view === "signup" && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Shop name</label>
                <input type="text" placeholder="e.g. Downtown Auto Repair"
                  value={shop} onChange={(e) => setShop(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Email address</label>
              <input type="email" placeholder="you@yourshop.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {view !== "reset" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-zinc-400">Password</label>
                  {view === "login" && (
                    <button onClick={() => switchView("reset")} className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder={view === "signup" ? "At least 6 characters" : "••••••••"}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <button onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                    {showPass
                      ? <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                      : <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/></svg>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-6 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="10"/>
                </svg>
                {view === "login" ? "Signing in…" : view === "signup" ? "Creating account…" : "Sending…"}
              </>
            ) : (
              <>
                {view === "login"  && "Sign in to dashboard →"}
                {view === "signup" && "Create account →"}
                {view === "reset"  && "Send reset link →"}
              </>
            )}
          </button>

          <div className="mt-5 text-center text-xs text-zinc-500">
            {view === "login" && (
              <>Don&apos;t have an account?{" "}
                <button onClick={() => switchView("signup")} className="text-orange-400 hover:text-orange-300 transition-colors">Sign up free</button>
              </>
            )}
            {view === "signup" && (
              <>Already have an account?{" "}
                <button onClick={() => switchView("login")} className="text-orange-400 hover:text-orange-300 transition-colors">Sign in</button>
              </>
            )}
            {view === "reset" && (
              <>Remembered it?{" "}
                <button onClick={() => switchView("login")} className="text-orange-400 hover:text-orange-300 transition-colors">Back to sign in</button>
              </>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-600">Trusted by independent shops across Texas</p>
          </div>

        </div>
      </div>
    </div>
  );
}
