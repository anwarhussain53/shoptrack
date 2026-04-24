"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type LineItem = { id?: string; description: string; type: "labor" | "parts"; amount: number };

type Invoice = {
  id: string;
  invoice_number: string;
  repair_order_id: string;
  customer_id: string;
  shop_id: string;
  tax_rate: number;
  paid: boolean;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
  vehicle_label?: string;
  order_number?: string;
  items: LineItem[];
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

const subtotal = (items: LineItem[]) => items.reduce((s, i) => s + i.amount, 0);
const total = (inv: Invoice) => {
  const sub = subtotal(inv.items);
  return sub + sub * inv.tax_rate;
};

export default function InvoicesPage() {
  const [invoices, setInvoices]     = useState<Invoice[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Invoice | null>(null);
  const [filter, setFilter]         = useState<"All" | "Paid" | "Unpaid">("All");
  const [printMode, setPrintMode]   = useState(false);
  const [shopId, setShopId]         = useState<string | null>(null);
  const [shopName, setShopName]     = useState("Downtown Auto Repair");

  // New invoice modal
  const [showCreate, setShowCreate] = useState(false);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder]     = useState<string>("");
  const [newItems, setNewItems]     = useState<LineItem[]>([{ description: "", type: "labor", amount: 0 }]);
  const [createError, setCreateError] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data: shopData } = await supabase
        .from("shops").select("id, name").eq("owner_id", user.id).single();
      if (!shopData) { setLoading(false); return; }
      setShopId(shopData.id);
      setShopName(shopData.name || "My Shop");

      const { data, error } = await supabase
        .from("invoices")
        .select(`*, customers (name, phone), repair_orders (order_number, vehicle_label)`)
        .eq("shop_id", shopData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load line items for each invoice
      const invoiceIds = (data || []).map((inv: any) => inv.id);
      let allItems: any[] = [];
      if (invoiceIds.length > 0) {
        const { data: itemsData } = await supabase
          .from("invoice_items")
          .select("*")
          .in("invoice_id", invoiceIds);
        allItems = itemsData || [];
      }

      const mapped: Invoice[] = (data || []).map((inv: any) => ({
        ...inv,
        customer_name:  inv.customers?.name  || "Unknown",
        customer_phone: inv.customers?.phone || "",
        order_number:   inv.repair_orders?.order_number || "—",
        vehicle_label:  inv.repair_orders?.vehicle_label || "—",
        items: allItems.filter((item: any) => item.invoice_id === inv.id),
      }));

      setInvoices(mapped);
    } catch (err) {
      console.error("Error loading invoices:", err);
    } finally {
      setLoading(false);
    }
  }

  async function openCreateModal() {
    if (!shopId) return;
    // Load completed/ready orders that don't have invoices yet
    const { data: orders } = await supabase
      .from("repair_orders")
      .select("id, order_number, vehicle_label, customer_id, customers (name, phone)")
      .eq("shop_id", shopId)
      .in("status", ["Ready pickup", "Completed"])
      .order("created_at", { ascending: false });

    // Filter out orders that already have invoices
    const { data: existingInvoices } = await supabase
      .from("invoices")
      .select("repair_order_id")
      .eq("shop_id", shopId);

    const invoicedOrderIds = new Set((existingInvoices || []).map((i: any) => i.repair_order_id));
    const available = (orders || []).filter((o: any) => !invoicedOrderIds.has(o.id));

    setCompletedOrders(available);
    setSelectedOrder(available.length > 0 ? available[0].id : "");
    setNewItems([{ description: "", type: "labor", amount: 0 }]);
    setCreateError("");
    setShowCreate(true);
  }

  function addItem() {
    setNewItems([...newItems, { description: "", type: "labor", amount: 0 }]);
  }

  function removeItem(idx: number) {
    if (newItems.length <= 1) return;
    setNewItems(newItems.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: string, value: any) {
    setNewItems(newItems.map((item, i) =>
      i === idx ? { ...item, [field]: field === "amount" ? parseFloat(value) || 0 : value } : item
    ));
  }

  async function handleCreateInvoice() {
    if (!selectedOrder) { setCreateError("Select a repair order."); return; }
    if (newItems.some(i => !i.description.trim())) { setCreateError("All items need a description."); return; }
    if (newItems.some(i => i.amount <= 0)) { setCreateError("All items need an amount greater than $0."); return; }
    if (!shopId) return;

    setCreateSaving(true);
    try {
      const order = completedOrders.find((o: any) => o.id === selectedOrder);
      if (!order) throw new Error("Order not found");

      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`;

      const { data: newInvoice, error: invError } = await supabase
        .from("invoices")
        .insert({
          shop_id:         shopId,
          repair_order_id: selectedOrder,
          customer_id:     order.customer_id,
          invoice_number:  invoiceNumber,
          tax_rate:        0.0825,
          paid:            false,
        })
        .select()
        .single();

      if (invError) throw invError;

      // Insert line items
      const itemsToInsert = newItems.map(item => ({
        invoice_id:  newInvoice.id,
        description: item.description.trim(),
        type:        item.type,
        amount:      item.amount,
      }));

      const { error: itemsError } = await supabase.from("invoice_items").insert(itemsToInsert);
      if (itemsError) throw itemsError;

      const enriched: Invoice = {
        ...newInvoice,
        customer_name:  order.customers?.name  || "Unknown",
        customer_phone: order.customers?.phone || "",
        order_number:   order.order_number,
        vehicle_label:  order.vehicle_label || "—",
        items: newItems,
      };

      setInvoices([enriched, ...invoices]);
      setShowCreate(false);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create invoice.");
    } finally {
      setCreateSaving(false);
    }
  }

  async function markPaid(id: string, method: string) {
    const { error } = await supabase
      .from("invoices")
      .update({ paid: true, payment_method: method, paid_at: new Date().toISOString() })
      .eq("id", id);

    if (error) { console.error(error); return; }

    setInvoices(prev => prev.map(inv =>
      inv.id === id ? { ...inv, paid: true, payment_method: method, paid_at: new Date().toISOString() } : inv
    ));
    if (selected?.id === id) {
      setSelected(prev => prev ? { ...prev, paid: true, payment_method: method } : prev);
    }
  }

  const filtered = invoices.filter(inv =>
    filter === "All" ? true : filter === "Paid" ? inv.paid : !inv.paid
  );

  const totalRevenue     = invoices.filter(i => i.paid).reduce((s, i) => s + total(i), 0);
  const totalOutstanding = invoices.filter(i => !i.paid).reduce((s, i) => s + total(i), 0);
  const paidCount        = invoices.filter(i => i.paid).length;
  const unpaidCount      = invoices.filter(i => !i.paid).length;

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
            { label: "Invoices",      href: "/invoices",  active: true,  icon: "M4 1h8a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1zM5 5h6M5 8h6M5 11h3" },
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
              <div className="text-xs font-medium text-white truncate">{shopName}</div>
              <div className="text-xs text-zinc-500 truncate">Dallas, TX</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="ml-56">
        <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
          <div>
            <h1 className="text-lg font-semibold text-white">Invoices</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{paidCount} paid · {unpaidCount} outstanding</p>
          </div>
          <button onClick={openCreateModal}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            New invoice
          </button>
        </div>

        <div className="px-8 py-8">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-500 mb-2">Total invoices</div>
              <div className="text-3xl font-bold text-white">{invoices.length}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-500 mb-2">Revenue collected</div>
              <div className="text-3xl font-bold text-green-400">${totalRevenue.toFixed(2)}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-500 mb-2">Outstanding</div>
              <div className="text-3xl font-bold text-red-400">${totalOutstanding.toFixed(2)}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-500 mb-2">Avg invoice</div>
              <div className="text-3xl font-bold text-white">
                ${invoices.length ? Math.round(invoices.reduce((s, i) => s + total(i), 0) / invoices.length) : 0}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            {(["All", "Paid", "Unpaid"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-4 py-1.5 rounded-full border transition-colors ${
                  filter === f ? "bg-white text-zinc-900 border-white font-medium" : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                }`}>{f}</button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin text-orange-500" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/>
              </svg>
              <span className="ml-3 text-zinc-400 text-sm">Loading invoices…</span>
            </div>
          )}

          {!loading && invoices.length === 0 && (
            <div className="text-center py-20 border border-zinc-800 rounded-xl">
              <div className="text-zinc-500 text-sm mb-1">No invoices yet</div>
              <div className="text-zinc-600 text-xs mb-4">Complete a repair order first, then generate an invoice</div>
              <button onClick={openCreateModal}
                className="bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
                Create first invoice
              </button>
            </div>
          )}

          {!loading && invoices.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-500 font-medium px-6 py-3">Invoice</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Customer</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Vehicle</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Date</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Payment</th>
                    <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3">Total</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv, i) => (
                    <tr key={inv.id} onClick={() => { setSelected(inv); setPrintMode(false); }}
                      className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors cursor-pointer ${i === filtered.length - 1 ? "border-b-0" : ""}`}>
                      <td className="px-6 py-4"><span className="text-xs font-mono text-zinc-400">{inv.invoice_number}</span></td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${avatarColor(inv.customer_name || "")}`}>
                            {initials(inv.customer_name || "?")}
                          </div>
                          <span className="text-sm font-medium text-white">{inv.customer_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-400">{inv.vehicle_label}</td>
                      <td className="px-4 py-4 text-sm text-zinc-400">{new Date(inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                      <td className="px-4 py-4">{inv.payment_method ? <span className="text-xs text-zinc-300">{inv.payment_method}</span> : <span className="text-xs text-zinc-600">—</span>}</td>
                      <td className="px-4 py-4 text-right"><span className="text-sm font-semibold text-white">${total(inv).toFixed(2)}</span></td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${inv.paid ? "bg-emerald-950 text-emerald-400 border-emerald-800" : "bg-red-950 text-red-400 border-red-800"}`}>
                          {inv.paid ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Invoice slide-over ── */}
      {selected && !printMode && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)}/>
          <div className="relative w-[440px] bg-zinc-900 border-l border-zinc-800 h-full overflow-y-auto z-50 p-6">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <div className="mb-6 mt-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-zinc-500">{selected.invoice_number}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${selected.paid ? "bg-emerald-950 text-emerald-400 border-emerald-800" : "bg-red-950 text-red-400 border-red-800"}`}>
                  {selected.paid ? "Paid" : "Unpaid"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${avatarColor(selected.customer_name || "")}`}>
                  {initials(selected.customer_name || "?")}
                </div>
                <div>
                  <div className="text-base font-semibold text-white">{selected.customer_name}</div>
                  <div className="text-xs text-zinc-500">{selected.customer_phone} · {selected.vehicle_label}</div>
                </div>
              </div>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden mb-5">
              {[
                { label: "Repair order", value: selected.order_number || "—" },
                { label: "Invoice date", value: new Date(selected.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                { label: "Vehicle",      value: selected.vehicle_label || "—" },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center px-4 py-3 border-b border-zinc-800 last:border-b-0">
                  <span className="text-xs text-zinc-500">{row.label}</span>
                  <span className="text-sm text-white font-medium">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Line items */}
            <div className="mb-5">
              <div className="text-xs text-zinc-500 mb-2">Line items</div>
              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 last:border-b-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded border flex-shrink-0 ${item.type === "labor" ? "bg-blue-950 text-blue-400 border-blue-800" : "bg-amber-950 text-amber-400 border-amber-800"}`}>
                        {item.type}
                      </span>
                      <span className="text-sm text-zinc-300 truncate">{item.description}</span>
                    </div>
                    <span className="text-sm font-medium text-white ml-4 flex-shrink-0">${item.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 border-t border-zinc-700 bg-zinc-800/50">
                  <span className="text-xs text-zinc-400">Subtotal</span>
                  <span className="text-sm text-white">${subtotal(selected.items).toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 border-t border-zinc-800">
                  <span className="text-xs text-zinc-400">Tax ({(selected.tax_rate * 100).toFixed(2)}%)</span>
                  <span className="text-sm text-white">${(subtotal(selected.items) * selected.tax_rate).toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-3 border-t border-zinc-700 bg-zinc-800/80">
                  <span className="text-sm font-semibold text-white">Total</span>
                  <span className="text-base font-bold text-white">${total(selected).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {!selected.paid && (
                <div className="mb-1">
                  <label className="block text-xs text-zinc-400 mb-1.5">Payment method</label>
                  <select id="pay-method"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors mb-3">
                    <option>Cash</option>
                    <option>Debit card</option>
                    <option>Credit card</option>
                    <option>Check</option>
                    <option>Other</option>
                  </select>
                  <button onClick={() => {
                      const method = (document.getElementById("pay-method") as HTMLSelectElement).value;
                      markPaid(selected.id, method);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 transition-colors text-white text-sm font-medium py-2.5 rounded-lg">
                    Mark as paid
                  </button>
                </div>
              )}

              {selected.paid && selected.payment_method && (
                <div className="flex items-center justify-between bg-zinc-800 rounded-lg px-4 py-3">
                  <span className="text-xs text-zinc-400">Payment received via</span>
                  <span className="text-sm font-medium text-emerald-400">{selected.payment_method}</span>
                </div>
              )}

              <button onClick={() => setPrintMode(true)}
                className="w-full bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-medium py-2.5 rounded-lg">
                Print / save as PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print view ── */}
      {selected && printMode && (
        <div className="fixed inset-0 z-50 bg-white text-zinc-900 overflow-auto p-12">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-start mb-10">
              <div>
                <div className="text-xl font-bold text-zinc-900">{shopName}</div>
                <div className="text-sm text-zinc-500 mt-1">Dallas, TX</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-zinc-900">{selected.invoice_number}</div>
                <div className="text-sm text-zinc-500 mt-1">{new Date(selected.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                <div className={`inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full ${selected.paid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {selected.paid ? "PAID" : "UNPAID"}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Bill to</div>
              <div className="text-base font-semibold text-zinc-900">{selected.customer_name}</div>
              <div className="text-sm text-zinc-500">{selected.customer_phone}</div>
              <div className="text-sm text-zinc-500 mt-1">Vehicle: {selected.vehicle_label}</div>
              <div className="text-sm text-zinc-500">Repair order: {selected.order_number}</div>
            </div>

            <table className="w-full mb-2 text-sm">
              <thead>
                <tr className="border-b-2 border-zinc-200">
                  <th className="text-left py-2 text-zinc-500 font-medium">Description</th>
                  <th className="text-left py-2 text-zinc-500 font-medium">Type</th>
                  <th className="text-right py-2 text-zinc-500 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map((item, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td className="py-3 text-zinc-800">{item.description}</td>
                    <td className="py-3 text-zinc-500 capitalize">{item.type}</td>
                    <td className="py-3 text-right font-medium text-zinc-900">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-zinc-200 pt-3 space-y-1 max-w-xs ml-auto">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Subtotal</span><span>${subtotal(selected.items).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Tax ({(selected.tax_rate * 100).toFixed(2)}%)</span><span>${(subtotal(selected.items) * selected.tax_rate).toFixed(2)}</span>
              </div>
              {selected.payment_method && (
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>Payment method</span><span>{selected.payment_method}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-zinc-900 border-t border-zinc-300 pt-2 mt-2">
                <span>Total</span><span>${total(selected).toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-zinc-100 text-center text-xs text-zinc-400">
              Thank you for choosing {shopName} · Payment due within 30 days
            </div>

            <div className="flex gap-3 mt-8 justify-center">
              <button onClick={() => window.print()} className="bg-zinc-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-zinc-700 transition-colors">Print / save PDF</button>
              <button onClick={() => setPrintMode(false)} className="bg-zinc-100 text-zinc-700 text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-zinc-200 transition-colors">Back</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create invoice modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)}/>
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg z-50 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white mb-1">Create invoice</h2>
            <p className="text-xs text-zinc-500 mb-5">Select a completed repair order and add line items.</p>

            {createError && (
              <div className="bg-red-950 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 mb-4">{createError}</div>
            )}

            {completedOrders.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-zinc-500 text-sm mb-2">No completed orders without invoices</div>
                <div className="text-zinc-600 text-xs">Advance a repair order to "Ready pickup" or "Completed" first.</div>
              </div>
            ) : (
              <>
                {/* Select repair order */}
                <div className="mb-5">
                  <label className="block text-xs text-zinc-400 mb-1.5">Repair order</label>
                  <select value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors">
                    {completedOrders.map((o: any) => (
                      <option key={o.id} value={o.id}>
                        {o.order_number} — {o.customers?.name} — {o.vehicle_label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Line items */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-400">Line items</span>
                    <button onClick={addItem} className="text-xs text-orange-400 hover:text-orange-300 transition-colors">+ Add item</button>
                  </div>
                  <div className="space-y-3">
                    {newItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <select value={item.type} onChange={(e) => updateItem(idx, "type", e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-2 py-2.5 w-20 flex-shrink-0 focus:outline-none focus:border-orange-500">
                          <option value="labor">Labor</option>
                          <option value="parts">Parts</option>
                        </select>
                        <input type="text" placeholder="Description" value={item.description}
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                          className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                        <input type="number" placeholder="$0" value={item.amount || ""}
                          onChange={(e) => updateItem(idx, "amount", e.target.value)}
                          className="w-20 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                        {newItems.length > 1 && (
                          <button onClick={() => removeItem(idx)} className="text-zinc-600 hover:text-red-400 transition-colors px-1 py-2.5">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals preview */}
                <div className="bg-zinc-800 rounded-lg px-4 py-3 mb-5">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Subtotal</span><span>${subtotal(newItems).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Tax (8.25%)</span><span>${(subtotal(newItems) * 0.0825).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-white border-t border-zinc-700 pt-2 mt-1">
                    <span>Total</span><span>${(subtotal(newItems) + subtotal(newItems) * 0.0825).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowCreate(false)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300 text-sm font-medium py-2.5 rounded-lg">Cancel</button>
                  <button onClick={handleCreateInvoice} disabled={createSaving}
                    className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 transition-colors text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                    {createSaving ? (
                      <><svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="7"/></svg>Creating…</>
                    ) : "Create invoice"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
