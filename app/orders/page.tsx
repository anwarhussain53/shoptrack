"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Status =
  | "Checked in"
  | "Diagnosing"
  | "Waiting approval"
  | "Waiting parts"
  | "In repair"
  | "Ready pickup"
  | "Completed";

const STATUSES: Status[] = [
  "Checked in",
  "Diagnosing",
  "Waiting approval",
  "Waiting parts",
  "In repair",
  "Ready pickup",
  "Completed",
];

const statusStyle: Record<Status, string> = {
  "Checked in":       "bg-emerald-950 text-emerald-400 border-emerald-800",
  "Diagnosing":       "bg-blue-950 text-blue-400 border-blue-800",
  "Waiting approval": "bg-amber-950 text-amber-400 border-amber-800",
  "Waiting parts":    "bg-pink-950 text-pink-400 border-pink-800",
  "In repair":        "bg-violet-950 text-violet-400 border-violet-800",
  "Ready pickup":     "bg-green-950 text-green-400 border-green-800",
  "Completed":        "bg-zinc-800 text-zinc-400 border-zinc-700",
};

type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  vehicle_id: string | null;
  problem: string;
  notes: string;
  status: Status;
  mechanic: string;
  created_at: string;
  est_completion: string | null;
  shop_id: string;
  vehicle_label?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
};

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

function generateOrderNumber(count: number): string {
  return `RO-${String(count + 1).padStart(3, "0")}`;
}

export default function OrdersPage() {
  const [orders, setOrders]             = useState<Order[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | "All">("All");
  const [showAdd, setShowAdd]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [shopId, setShopId]             = useState<string | null>(null);
  const [smsLog, setSmsLog]             = useState("");
  const [form, setForm]                 = useState({
    customer: "", phone: "", email: "", vehicle: "", problem: "", mechanic: "",
  });
  const [formError, setFormError] = useState("");

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

      const { data, error } = await supabase
        .from("repair_orders")
        .select(`*, customers (name, phone, email), vehicles (year, make, model)`)
        .eq("shop_id", shopData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((o: any) => ({
        ...o,
        customer_name:  o.customers?.name  || "Unknown",
        customer_phone: o.customers?.phone || "",
        customer_email: o.customers?.email || "",
        vehicle_label:  o.vehicles
          ? `${o.vehicles.year} ${o.vehicles.make} ${o.vehicles.model}`
          : o.vehicle_label || "Unknown vehicle",
      }));

      setOrders(mapped);
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = orders.filter(
    (o) => filterStatus === "All" || o.status === filterStatus
  );

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {} as Record<Status, number>);

  async function updateStatus(orderId: string, newStatus: Status) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const { error } = await supabase
      .from("repair_orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (error) { console.error(error); return; }

    await supabase.from("status_history").insert({
      repair_order_id: orderId,
      old_status: order.status,
      new_status: newStatus,
      changed_by: "owner",
      sms_sent: true,
    });

    setOrders((prev) =>
      prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o)
    );
    if (selected?.id === orderId) {
      setSelected((prev) => prev ? { ...prev, status: newStatus } : prev);
    }

    const firstName = order.customer_name?.split(" ")[0] || "there";
    const vehicle   = order.vehicle_label || "your vehicle";
    const messages: Partial<Record<Status, string>> = {
      "Diagnosing":       `Hi ${firstName}! Your ${vehicle} is now being diagnosed. We'll update you shortly.`,
      "Waiting approval": `Hi ${firstName}! We've finished diagnosing your ${vehicle}. Please call us to approve the estimate.`,
      "Waiting parts":    `Hi ${firstName}! Parts have been ordered for your ${vehicle}. We'll begin repairs as soon as they arrive.`,
      "In repair":        `Hi ${firstName}! Great news — we're actively working on your ${vehicle} right now.`,
      "Ready pickup":     `Hi ${firstName}! Your ${vehicle} is ready for pickup! We're open until 6pm. See you soon.`,
      "Completed":        `Hi ${firstName}! Thanks for choosing us. Your ${vehicle} repair is complete. Drive safe!`,
    };
    if (messages[newStatus]) setSmsLog(messages[newStatus]!);
  }

  async function handleAdd() {
    if (!form.customer.trim()) { setFormError("Customer name is required."); return; }
    if (!form.phone.trim())    { setFormError("Phone number is required."); return; }
    if (form.phone.replace(/\D/g, "").length !== 10) { setFormError("Enter a valid 10-digit phone number."); return; }
    if (form.email.trim() && !emailRegex.test(form.email.trim())) { setFormError("Enter a valid email or leave it blank."); return; }
    if (!form.vehicle.trim())  { setFormError("Vehicle is required."); return; }
    if (!form.problem.trim())  { setFormError("Problem description is required."); return; }
    if (!shopId)               { setFormError("Shop not found. Please reload."); return; }

    setSaving(true);
    try {
      // Find or create customer
      let customerId: string;
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("shop_id", shopId)
        .eq("phone", form.phone.trim())
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update email if provided and customer exists
        if (form.email.trim()) {
          await supabase.from("customers").update({ email: form.email.trim() }).eq("id", customerId);
        }
      } else {
        const { data: newCustomer, error: custError } = await supabase
          .from("customers")
          .insert({
            shop_id: shopId,
            name:    form.customer.trim(),
            phone:   form.phone.trim(),
            email:   form.email.trim() || null,
            status:  "New",
          })
          .select()
          .single();
        if (custError) throw custError;
        customerId = newCustomer.id;
      }

      // Create repair order
      const orderNumber = generateOrderNumber(orders.length);
      const { data: newOrder, error: orderError } = await supabase
        .from("repair_orders")
        .insert({
          shop_id:       shopId,
          customer_id:   customerId,
          order_number:  orderNumber,
          problem:       form.problem.trim(),
          status:        "Checked in",
          mechanic:      form.mechanic.trim() || "Unassigned",
          vehicle_label: form.vehicle.trim(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      await supabase.from("status_history").insert({
        repair_order_id: newOrder.id,
        old_status: null,
        new_status: "Checked in",
        changed_by: "owner",
        sms_sent: true,
      });

      const enriched: Order = {
        ...newOrder,
        customer_name:  form.customer.trim(),
        customer_phone: form.phone.trim(),
        customer_email: form.email.trim(),
        vehicle_label:  form.vehicle.trim(),
      };

      setOrders([enriched, ...orders]);
      setForm({ customer: "", phone: "", email: "", vehicle: "", problem: "", mechanic: "" });
      setFormError("");
      setShowAdd(false);
      setSmsLog(`Hi ${form.customer.split(" ")[0]}! Your ${form.vehicle} has been checked in at our shop. We'll keep you updated every step of the way.`);
    } catch (err: any) {
      setFormError(err.message || "Failed to create repair order.");
    } finally {
      setSaving(false);
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
            { label: "Repair orders", href: "/orders",    active: true,  icon: "M4 2h8l2 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" },
            { label: "Customers",     href: "/customers", active: false, icon: "M8 7a3 3 0 100-6 3 3 0 000 6zM2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z" },
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
            <h1 className="text-lg font-semibold text-white">Repair orders</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {orders.filter(o => o.status !== "Completed").length} active · {orders.filter(o => o.status === "Completed").length} completed
            </p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            New repair order
          </button>
        </div>

        <div className="px-8 py-8">
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap mb-6">
            <button onClick={() => setFilterStatus("All")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filterStatus === "All" ? "bg-white text-zinc-900 border-white font-medium" : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
              }`}>All ({orders.length})</button>
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  filterStatus === s ? `${statusStyle[s]} font-medium` : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                }`}>{s} {counts[s] > 0 && `(${counts[s]})`}</button>
            ))}
          </div>

          {/* SMS log */}
          {smsLog && (
            <div className="mb-6 bg-emerald-950 border border-emerald-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span className="text-xs font-medium text-emerald-400">SMS sent automatically</span>
                </div>
                <button onClick={() => setSmsLog("")} className="text-zinc-600 hover:text-zinc-400 text-xs">dismiss</button>
              </div>
              <p className="text-xs text-emerald-300/80 leading-relaxed">{smsLog}</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin text-orange-500" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/>
              </svg>
              <span className="ml-3 text-zinc-400 text-sm">Loading repair orders…</span>
            </div>
          )}

          {!loading && orders.length === 0 && (
            <div className="text-center py-20 border border-zinc-800 rounded-xl">
              <div className="text-zinc-500 text-sm mb-3">No repair orders yet</div>
              <button onClick={() => setShowAdd(true)}
                className="bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
                Check in first vehicle
              </button>
            </div>
          )}

          {!loading && orders.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-500 font-medium px-6 py-3">Order</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Customer</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Vehicle</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Problem</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Status</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Mechanic</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-zinc-500 text-sm py-12">No orders for this status</td></tr>
                  )}
                  {filtered.map((order, i) => (
                    <tr key={order.id} onClick={() => setSelected(order)}
                      className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors cursor-pointer ${i === filtered.length - 1 ? "border-b-0" : ""}`}>
                      <td className="px-6 py-4"><span className="text-xs font-mono text-zinc-400">{order.order_number}</span></td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${avatarColor(order.customer_name || "")}`}>
                            {initials(order.customer_name || "?")}
                          </div>
                          <span className="text-sm font-medium text-white">{order.customer_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-400">{order.vehicle_label}</td>
                      <td className="px-4 py-4 max-w-[180px]"><span className="text-sm text-zinc-400 truncate block">{order.problem}</span></td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusStyle[order.status]}`}>{order.status}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-400">{order.mechanic}</td>
                      <td className="px-4 py-4 text-xs text-zinc-600">
                        {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Order detail slide-over ── */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)}/>
          <div className="relative w-[420px] bg-zinc-900 border-l border-zinc-800 h-full overflow-y-auto z-50 p-6">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <div className="mb-5 mt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-zinc-500">{selected.order_number}</span>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusStyle[selected.status]}`}>{selected.status}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${avatarColor(selected.customer_name || "")}`}>
                  {initials(selected.customer_name || "?")}
                </div>
                <div>
                  <div className="text-base font-semibold text-white">{selected.customer_name}</div>
                  <div className="text-xs text-zinc-500">{selected.customer_phone} · {selected.vehicle_label}</div>
                  {selected.customer_email && <div className="text-xs text-zinc-500">{selected.customer_email}</div>}
                </div>
              </div>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden mb-5">
              {[
                { label: "Problem reported", value: selected.problem },
                { label: "Mechanic notes",   value: selected.notes || "No notes yet" },
                { label: "Assigned to",      value: selected.mechanic },
                { label: "Opened",           value: new Date(selected.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
              ].map((row) => (
                <div key={row.label} className="px-4 py-3 border-b border-zinc-800 last:border-b-0">
                  <div className="text-xs text-zinc-500 mb-0.5">{row.label}</div>
                  <div className="text-sm text-white">{row.value}</div>
                </div>
              ))}
            </div>

            <div className="mb-5">
              <div className="text-xs text-zinc-500 mb-2">Update status</div>
              <div className="space-y-1.5">
                {STATUSES.map((s, idx) => {
                  const currentIdx = STATUSES.indexOf(selected.status);
                  const isPast    = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const isNext    = idx === currentIdx + 1;
                  return (
                    <button key={s}
                      onClick={() => isNext && updateStatus(selected.id, s)}
                      disabled={!isNext}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                        isCurrent ? `${statusStyle[s]} border` :
                        isPast    ? "text-zinc-600 cursor-default" :
                        isNext    ? "border border-zinc-700 text-zinc-300 hover:border-orange-500 hover:text-orange-400 cursor-pointer" :
                        "text-zinc-700 cursor-default"
                      }`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                        isCurrent ? "bg-white/20" : isPast ? "bg-zinc-800 text-zinc-600" : isNext ? "border border-zinc-600" : "border border-zinc-800"
                      }`}>
                        {isPast ? "✓" : idx + 1}
                      </span>
                      <span>{s}</span>
                      {isNext    && <span className="ml-auto text-xs text-zinc-500">Click to advance →</span>}
                      {isCurrent && <span className="ml-auto text-xs opacity-60">Current</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-zinc-600 mt-2">Advancing status logs a record and sends an SMS to the customer.</p>
            </div>

            <div className="space-y-2">
              <button className="w-full bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-medium py-2.5 rounded-lg">Generate invoice</button>
              <button className="w-full bg-zinc-800 hover:bg-zinc-700 transition-colors text-white text-sm font-medium py-2.5 rounded-lg">Edit details</button>
            </div>
          </div>
        </div>
      )}

      {/* ── New order modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAdd(false)}/>
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md z-50 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white mb-1">New repair order</h2>
            <p className="text-xs text-zinc-500 mb-5">A check-in SMS will be sent to the customer automatically.</p>

            {formError && (
              <div className="bg-red-950 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 mb-4">{formError}</div>
            )}

            <div className="space-y-4">
              {/* Customer name */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Customer name</label>
                <input type="text" placeholder="e.g. Mike Johnson"
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: formatName(e.target.value) })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Customer phone</label>
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

              {/* Email — optional */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Customer email <span className="text-zinc-600">(optional)</span></label>
                <input type="email" placeholder="e.g. mike@gmail.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                />
                {form.email && !emailRegex.test(form.email) && (
                  <p className="text-xs text-red-400 mt-1">Enter a valid email or leave it blank</p>
                )}
                {form.email && emailRegex.test(form.email) && (
                  <p className="text-xs text-emerald-500 mt-1">Valid email</p>
                )}
              </div>

              {/* Vehicle */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Vehicle (year / make / model)</label>
                <input type="text" placeholder="e.g. 2019 Honda Civic"
                  value={form.vehicle}
                  onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Problem */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Problem reported</label>
                <input type="text" placeholder="What did the customer say?"
                  value={form.problem}
                  onChange={(e) => setForm({ ...form, problem: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Mechanic */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Assign mechanic <span className="text-zinc-600">(optional)</span></label>
                <input type="text" placeholder="e.g. Carlos"
                  value={form.mechanic}
                  onChange={(e) => setForm({ ...form, mechanic: formatName(e.target.value) })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAdd(false); setFormError(""); setForm({ customer: "", phone: "", email: "", vehicle: "", problem: "", mechanic: "" }); }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300 text-sm font-medium py-2.5 rounded-lg">Cancel</button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 transition-colors text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                {saving ? (
                  <><svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="7"/></svg>Saving…</>
                ) : "Check in vehicle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
