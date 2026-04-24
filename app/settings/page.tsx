"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState("");
  const [error, setError]         = useState("");
  const [shopId, setShopId]       = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [form, setForm]           = useState({
    name: "", address: "", phone: "", email: "",
  });

  // Password change
  const [passForm, setPassForm]       = useState({ current: "", newPass: "", confirm: "" });
  const [passError, setPassError]     = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [passSaving, setPassSaving]   = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setUserEmail(user.email || "");

      const { data: shopData } = await supabase
        .from("shops").select("*").eq("owner_id", user.id).single();

      if (shopData) {
        setShopId(shopData.id);
        setForm({
          name:    shopData.name    || "",
          address: shopData.address || "",
          phone:   shopData.phone   || "",
          email:   shopData.email   || "",
        });
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveShop() {
    if (!form.name.trim()) { setError("Shop name is required."); return; }
    if (!shopId) return;

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { error: updateError } = await supabase
        .from("shops")
        .update({
          name:    form.name.trim(),
          address: form.address.trim() || null,
          phone:   form.phone.trim() || null,
          email:   form.email.trim() || null,
        })
        .eq("id", shopId);

      if (updateError) throw updateError;
      setSuccess("Shop info saved successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPassError("");
    setPassSuccess("");
    if (!passForm.newPass.trim()) { setPassError("New password is required."); return; }
    if (passForm.newPass.length < 6) { setPassError("Password must be at least 6 characters."); return; }
    if (passForm.newPass !== passForm.confirm) { setPassError("Passwords don't match."); return; }

    setPassSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passForm.newPass });
      if (error) throw error;
      setPassSuccess("Password updated successfully.");
      setPassForm({ current: "", newPass: "", confirm: "" });
      setTimeout(() => setPassSuccess(""), 3000);
    } catch (err: any) {
      setPassError(err.message || "Failed to update password.");
    } finally {
      setPassSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* ── Sidebar ── */}
      <div className="fixed left-0 top-0 h-full w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-zinc-800">
          <div className="w-7 h-7 bg-orange-500 rounded-md flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 12 L4 5 L8 3 L12 5 L14 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="8" cy="12" r="2" fill="white"/>
              <circle cx="4" cy="12" r="1.5" fill="white"/>
              <circle cx="12" cy="12" r="1.5" fill="white"/>
            </svg>
          </div>
          <span className="font-semibold text-white tracking-tight">ShopTrack</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {[
            { label: "Dashboard",     href: "/dashboard", active: false, icon: "M3 4h10v1H3zM3 7.5h10v1H3zM3 11h6v1H3z" },
            { label: "Repair orders", href: "/orders",    active: false, icon: "M4 2h8l2 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" },
            { label: "Customers",     href: "/customers", active: false, icon: "M8 7a3 3 0 100-6 3 3 0 000 6zM2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z" },
            { label: "Vehicles",      href: "/vehicles",  active: false, icon: "M2 10L4 4h8l2 6M1 10h14M4 13a1 1 0 100-2 1 1 0 000 2zM12 13a1 1 0 100-2 1 1 0 000 2z" },
            { label: "Invoices",      href: "/invoices",  active: false, icon: "M4 1h8a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1zM5 5h6M5 8h6M5 11h3" },
            { label: "Settings",      href: "/settings",  active: true,  icon: "M8 10a2 2 0 100-4 2 2 0 000 4zM8 1v2M8 13v2M1 8h2M13 8h2" },
          ].map((item) => (
            <a key={item.label} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                item.active ? "bg-orange-500/15 text-orange-400" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                <path d={item.icon} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="px-3 py-2">
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M6 8h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign out
          </button>
        </div>
        <div className="px-4 py-4 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-semibold flex-shrink-0">
              {form.name ? form.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "MS"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-white truncate">{form.name || "My Shop"}</div>
              <div className="text-xs text-zinc-500 truncate">{userEmail}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="ml-56">
        <div className="px-8 py-5 border-b border-zinc-800">
          <h1 className="text-lg font-semibold text-white">Settings</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Manage your shop profile and account</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin text-orange-500" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/>
            </svg>
            <span className="ml-3 text-zinc-400 text-sm">Loading settings…</span>
          </div>
        ) : (
          <div className="px-8 py-8 max-w-2xl">

            {/* ── Shop info ── */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
              <h2 className="text-sm font-medium text-white mb-4">Shop information</h2>

              {error && <div className="bg-red-950 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>}
              {success && <div className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs rounded-lg px-3 py-2 mb-4">{success}</div>}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Shop name</label>
                  <input type="text" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Address</label>
                  <input type="text" placeholder="123 Main St, Dallas, TX 75201" value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Shop phone</label>
                    <input type="tel" placeholder="(555) 200-4400" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Shop email</label>
                    <input type="email" placeholder="info@yourshop.com" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <button onClick={handleSaveShop} disabled={saving}
                className="mt-5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded-lg flex items-center gap-2">
                {saving ? (
                  <><svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="7"/></svg>Saving…</>
                ) : "Save shop info"}
              </button>
            </div>

            {/* ── Account ── */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
              <h2 className="text-sm font-medium text-white mb-4">Account</h2>
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-lg mb-4">
                <span className="text-xs text-zinc-400">Signed in as</span>
                <span className="text-sm font-medium text-white">{userEmail}</span>
              </div>

              <h3 className="text-xs text-zinc-400 mb-3">Change password</h3>

              {passError && <div className="bg-red-950 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 mb-4">{passError}</div>}
              {passSuccess && <div className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs rounded-lg px-3 py-2 mb-4">{passSuccess}</div>}

              <div className="space-y-3">
                <input type="password" placeholder="New password (min 6 characters)"
                  value={passForm.newPass}
                  onChange={(e) => setPassForm({ ...passForm, newPass: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <input type="password" placeholder="Confirm new password"
                  value={passForm.confirm}
                  onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <button onClick={handleChangePassword} disabled={passSaving}
                className="mt-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded-lg flex items-center gap-2">
                {passSaving ? (
                  <><svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="7"/></svg>Updating…</>
                ) : "Update password"}
              </button>
            </div>

            {/* ── Danger zone ── */}
            <div className="bg-zinc-900 border border-red-900/50 rounded-xl p-6">
              <h2 className="text-sm font-medium text-red-400 mb-2">Danger zone</h2>
              <p className="text-xs text-zinc-500 mb-4">Signing out will end your current session. You can always sign back in.</p>
              <button onClick={handleSignOut}
                className="bg-red-950 hover:bg-red-900 border border-red-800 transition-colors text-red-400 text-sm font-medium px-5 py-2.5 rounded-lg">
                Sign out of ShopTrack
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
