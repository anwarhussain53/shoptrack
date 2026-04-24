"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase();

const avatarColor = (name: string) => {
  const colors = [
    "bg-orange-500/20 text-orange-400",
    "bg-blue-500/20 text-blue-400",
    "bg-violet-500/20 text-violet-400",
    "bg-emerald-500/20 text-emerald-400",
    "bg-pink-500/20 text-pink-400",
    "bg-amber-500/20 text-amber-400",
  ];
  return colors[name.charCodeAt(0) % colors.length];
};

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatName(raw: string): string {
  return raw.replace(/[^a-zA-Z\s\-']/g, "");
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
  shop_id: string;
};

export default function CustomersPage() {
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<Customer | null>(null);
  const [editing, setEditing]       = useState(false);
  const [editForm, setEditForm]     = useState({ name: "", phone: "", email: "" });
  const [editError, setEditError]   = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState({ name: "", phone: "", email: "" });
  const [formError, setFormError]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [shopId, setShopId]         = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data: shopData } = await supabase
        .from("shops").select("id").eq("owner_id", user.id).single();
      if (!shopData) { setLoading(false); return; }
      setShopId(shopData.id);

      const { data: customerData, error } = await supabase
        .from("customers")
        .select("*")
        .eq("shop_id", shopData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(customerData || []);
    } catch (err) {
      console.error("Error loading customers:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd() {
    if (!form.name.trim())  { setFormError("Name is required."); return; }
    if (!form.phone.trim()) { setFormError("Phone is required."); return; }
    if (form.phone.replace(/\D/g, "").length !== 10) { setFormError("Enter a valid 10-digit phone number."); return; }
    if (!form.email.trim()) { setFormError("Email is required."); return; }
    if (!emailRegex.test(form.email.trim())) { setFormError("Enter a valid email address."); return; }
    if (!shopId) { setFormError("Shop not found. Please reload."); return; }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({ shop_id: shopId, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), status: "New" })
        .select().single();
      if (error) throw error;
      setCustomers([data, ...customers]);
      setForm({ name: "", phone: "", email: "" });
      setFormError("");
      setShowAdd(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to save customer.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    if (!selected) return;
    setEditForm({ name: selected.name, phone: selected.phone, email: selected.email || "" });
    setEditError("");
    setEditing(true);
  }

  async function handleEditSave() {
    if (!editForm.name.trim()) { setEditError("Name is required."); return; }
    if (!editForm.phone.trim()) { setEditError("Phone is required."); return; }
    if (editForm.phone.replace(/\D/g, "").length !== 10) { setEditError("Enter a valid 10-digit phone number."); return; }
    if (editForm.email.trim() && !emailRegex.test(editForm.email.trim())) { setEditError("Enter a valid email or leave it blank."); return; }
    if (!selected) return;

    setEditSaving(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name:  editForm.name.trim(),
          phone: editForm.phone.trim(),
          email: editForm.email.trim() || null,
        })
        .eq("id", selected.id);

      if (error) throw error;

      const updated = { ...selected, name: editForm.name.trim(), phone: editForm.phone.trim(), email: editForm.email.trim() };
      setCustomers(customers.map((c) => c.id === selected.id ? updated : c));
      setSelected(updated);
      setEditing(false);
    } catch (err: any) {
      setEditError(err.message || "Failed to update customer.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (!error) {
      setCustomers(customers.filter((c) => c.id !== id));
      setSelected(null);
      setEditing(false);
    }
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
            { label: "Customers",     href: "/customers", active: true,  icon: "M8 7a3 3 0 100-6 3 3 0 000 6zM2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z" },
            { label: "Vehicles",      href: "/vehicles",  active: false, icon: "M2 10L4 4h8l2 6M1 10h14M4 13a1 1 0 100-2 1 1 0 000 2zM12 13a1 1 0 100-2 1 1 0 000 2z" },
            { label: "Invoices",      href: "/invoices",  active: false, icon: "M4 1h8a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1zM5 5h6M5 8h6M5 11h3" },
            { label: "Settings",      href: "/settings",  active: false, icon: "M8 10a2 2 0 100-4 2 2 0 000 4zM8 1v2M8 13v2M1 8h2M13 8h2" },
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
        <div className="px-4 py-4 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-semibold flex-shrink-0">DA</div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-white truncate">Downtown Auto</div>
              <div className="text-xs text-zinc-500 truncate">Dallas, TX</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="ml-56">
        <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
          <div>
            <h1 className="text-lg font-semibold text-white">Customers</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{customers.length} total customers on file</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            Add customer
          </button>
        </div>

        <div className="px-8 py-8">
          <div className="relative mb-6 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Search by name, phone, or email…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total customers", value: customers.length },
              { label: "New customers",   value: customers.filter(c => c.status === "New").length },
              { label: "Active customers",value: customers.filter(c => c.status === "Active").length },
              { label: "With email",      value: customers.filter(c => c.email).length },
            ].map((s) => (
              <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-zinc-500 mb-1">{s.label}</div>
                <div className="text-2xl font-bold text-white">{s.value}</div>
              </div>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin text-orange-500" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/>
              </svg>
              <span className="ml-3 text-zinc-400 text-sm">Loading customers…</span>
            </div>
          )}

          {!loading && customers.length === 0 && (
            <div className="text-center py-20 border border-zinc-800 rounded-xl">
              <div className="text-zinc-500 text-sm mb-3">No customers yet</div>
              <button onClick={() => setShowAdd(true)}
                className="bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
                Add your first customer
              </button>
            </div>
          )}

          {!loading && customers.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-500 font-medium px-6 py-3">Customer</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Phone</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Email</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Added</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-zinc-500 text-sm py-12">No customers match your search</td></tr>
                  )}
                  {filtered.map((c, i) => (
                    <tr key={c.id} onClick={() => { setSelected(c); setEditing(false); }}
                      className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors cursor-pointer ${i === filtered.length - 1 ? "border-b-0" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${avatarColor(c.name)}`}>
                            {initials(c.name)}
                          </div>
                          <div className="text-sm font-medium text-white">{c.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-400">{c.phone}</td>
                      <td className="px-4 py-4 text-sm text-zinc-400">{c.email || <span className="text-zinc-600">No email</span>}</td>
                      <td className="px-4 py-4 text-xs text-zinc-500">
                        {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                          c.status === "New" ? "bg-blue-950 text-blue-400 border-blue-800" : "bg-emerald-950 text-emerald-400 border-emerald-800"
                        }`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Customer detail slide-over ── */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setSelected(null); setEditing(false); }}/>
          <div className="relative w-96 bg-zinc-900 border-l border-zinc-800 h-full overflow-y-auto z-50 p-6">
            <button onClick={() => { setSelected(null); setEditing(false); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <div className="flex items-center gap-3 mb-6 mt-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold flex-shrink-0 ${avatarColor(selected.name)}`}>
                {initials(selected.name)}
              </div>
              <div>
                <div className="text-base font-semibold text-white">{selected.name}</div>
                <div className="text-xs text-zinc-500">{selected.email || "No email on file"}</div>
              </div>
            </div>

            {/* ── Read mode ── */}
            {!editing && (
              <>
                <div className="border border-zinc-800 rounded-xl overflow-hidden mb-6">
                  {[
                    { label: "Phone",    value: selected.phone },
                    { label: "Email",    value: selected.email || "—" },
                    { label: "Status",   value: selected.status },
                    { label: "Customer since", value: new Date(selected.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center px-4 py-3 border-b border-zinc-800 last:border-b-0">
                      <span className="text-xs text-zinc-500">{row.label}</span>
                      <span className="text-sm font-medium text-white">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <button className="w-full bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-medium py-2.5 rounded-lg">
                    New repair order
                  </button>
                  <button onClick={startEdit}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 transition-colors text-white text-sm font-medium py-2.5 rounded-lg">
                    Edit customer info
                  </button>
                  <button className="w-full bg-zinc-800 hover:bg-zinc-700 transition-colors text-white text-sm font-medium py-2.5 rounded-lg">
                    View repair orders
                  </button>
                  <button onClick={() => handleDelete(selected.id)}
                    className="w-full bg-red-950 hover:bg-red-900 border border-red-800 transition-colors text-red-400 text-sm font-medium py-2.5 rounded-lg">
                    Delete customer
                  </button>
                </div>
              </>
            )}

            {/* ── Edit mode ── */}
            {editing && (
              <>
                {editError && (
                  <div className="bg-red-950 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 mb-4">{editError}</div>
                )}

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Full name</label>
                    <input type="text" value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: formatName(e.target.value) })}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Phone number</label>
                    <input type="tel" value={editForm.phone} maxLength={14}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setEditForm({ ...editForm, phone: formatPhone(digits) });
                      }}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    {editForm.phone && editForm.phone.replace(/\D/g, "").length < 10 && (
                      <p className="text-xs text-red-400 mt-1">{10 - editForm.phone.replace(/\D/g, "").length} more digit{10 - editForm.phone.replace(/\D/g, "").length !== 1 ? "s" : ""} needed</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Email address</label>
                    <input type="email" value={editForm.email} placeholder="Add email address"
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    {editForm.email && !emailRegex.test(editForm.email) && (
                      <p className="text-xs text-red-400 mt-1">Enter a valid email</p>
                    )}
                    {editForm.email && emailRegex.test(editForm.email) && (
                      <p className="text-xs text-emerald-500 mt-1">Valid email</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setEditing(false)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300 text-sm font-medium py-2.5 rounded-lg">
                    Cancel
                  </button>
                  <button onClick={handleEditSave} disabled={editSaving}
                    className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 transition-colors text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                    {editSaving ? (
                      <><svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="7"/></svg>Saving…</>
                    ) : "Save changes"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Add customer modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAdd(false)}/>
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md z-50">
            <h2 className="text-base font-semibold text-white mb-5">Add new customer</h2>

            {formError && (
              <div className="bg-red-950 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 mb-4">{formError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Full name</label>
                <input type="text" placeholder="e.g. Mike Johnson"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: formatName(e.target.value) })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Phone number</label>
                <input type="tel" placeholder="e.g. (555) 842-1193"
                  value={form.phone} maxLength={14}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setForm({ ...form, phone: formatPhone(digits) });
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                />
                {form.phone && form.phone.replace(/\D/g, "").length < 10 && (
                  <p className="text-xs text-red-400 mt-1">{10 - form.phone.replace(/\D/g, "").length} more digit{10 - form.phone.replace(/\D/g, "").length !== 1 ? "s" : ""} needed</p>
                )}
                {form.phone.replace(/\D/g, "").length === 10 && (
                  <p className="text-xs text-emerald-500 mt-1">Valid phone number</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Email address</label>
                <input type="email" placeholder="e.g. mike@gmail.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                />
                {form.email && !emailRegex.test(form.email) && (
                  <p className="text-xs text-red-400 mt-1">Enter a valid email</p>
                )}
                {form.email && emailRegex.test(form.email) && (
                  <p className="text-xs text-emerald-500 mt-1">Valid email</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAdd(false); setFormError(""); setForm({ name: "", phone: "", email: "" }); }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300 text-sm font-medium py-2.5 rounded-lg">Cancel</button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 transition-colors text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                {saving ? (
                  <><svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="7"/></svg>Saving…</>
                ) : "Add customer"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
