"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const statusStyle: Record<string, string> = {
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
  problem: string;
  status: string;
  mechanic: string;
  created_at: string;
  vehicle_label?: string;
  customer_name?: string;
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

export default function Dashboard() {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [invoiceCount, setInvoiceCount]   = useState(0);
  const [revenue, setRevenue]     = useState(0);
  const [loading, setLoading]     = useState(true);
  const [shopName, setShopName]   = useState("My Shop");
  const [shopInitials, setShopInitials] = useState("MS");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data: shopData } = await supabase
        .from("shops").select("id, name").eq("owner_id", user.id).single();
      if (!shopData) { setLoading(false); return; }

      setShopName(shopData.name || "My Shop");
      setShopInitials(shopData.name ? shopData.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) : "MS");

      const { data: orderData } = await supabase
        .from("repair_orders")
        .select("*, customers (name)")
        .eq("shop_id", shopData.id)
        .neq("status", "Completed")
        .order("created_at", { ascending: false });

      const mapped = (orderData || []).map((o: any) => ({
        ...o,
        customer_name: o.customers?.name || "Unknown",
      }));
      setOrders(mapped);

      const { count: custCount } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopData.id);
      setCustomerCount(custCount || 0);

      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("id, paid, invoice_items (amount)")
        .eq("shop_id", shopData.id);

      setInvoiceCount((invoiceData || []).length);
      const totalRev = (invoiceData || [])
        .filter((inv: any) => inv.paid)
        .reduce((sum: number, inv: any) => {
          const sub = (inv.invoice_items || []).reduce((s: number, i: any) => s + (i.amount || 0), 0);
          return sum + sub + sub * 0.0825;
        }, 0);
      setRevenue(totalRev);
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  const openCount  = orders.length;
  const awaitCount = orders.filter(o => o.status === "Waiting approval").length;
  const readyCount = orders.filter(o => o.status === "Ready pickup").length;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });

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
            { label: "Dashboard",     href: "/dashboard", active: true,  icon: "M3 4h10v1H3zM3 7.5h10v1H3zM3 11h6v1H3z" },
            { label: "Repair orders", href: "/orders",    active: false, icon: "M4 2h8l2 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" },
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
            <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-semibold flex-shrink-0">{shopInitials}</div>
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
            <h1 className="text-lg font-semibold text-white">Dashboard</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{today}</p>
          </div>
          <a href="/orders" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            New repair order
          </a>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin text-orange-500" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/>
            </svg>
            <span className="ml-3 text-zinc-400 text-sm">Loading dashboard…</span>
          </div>
        ) : (
          <div className="px-8 py-8">

            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="text-xs text-zinc-500 mb-2">Open jobs</div>
                <div className="text-3xl font-bold text-white">{openCount}</div>
                <div className="text-xs text-zinc-600 mt-1">across all stages</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="text-xs text-zinc-500 mb-2">Awaiting approval</div>
                <div className={`text-3xl font-bold ${awaitCount > 0 ? "text-amber-400" : "text-white"}`}>{awaitCount}</div>
                <div className="text-xs text-zinc-600 mt-1">need customer sign-off</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="text-xs text-zinc-500 mb-2">Ready for pickup</div>
                <div className={`text-3xl font-bold ${readyCount > 0 ? "text-green-400" : "text-white"}`}>{readyCount}</div>
                <div className="text-xs text-zinc-600 mt-1">cars waiting collection</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="text-xs text-zinc-500 mb-2">Total customers</div>
                <div className="text-3xl font-bold text-white">{customerCount}</div>
                <div className="text-xs text-zinc-600 mt-1">on file</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="text-xs text-zinc-500 mb-2">Revenue collected</div>
                <div className="text-2xl font-bold text-green-400">${revenue.toFixed(2)}</div>
                <div className="text-xs text-zinc-600 mt-1">from paid invoices</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="text-xs text-zinc-500 mb-2">Total invoices</div>
                <div className="text-2xl font-bold text-white">{invoiceCount}</div>
                <div className="text-xs text-zinc-600 mt-1">created all time</div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-medium text-white">Active repair orders</h2>
                <a href="/orders" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">View all →</a>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-zinc-500 text-sm mb-2">No active jobs right now</div>
                  <a href="/orders" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">Create your first repair order →</a>
                </div>
              ) : (
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
                    {orders.slice(0, 10).map((job, i) => (
                      <tr key={job.id}
                        onClick={() => window.location.href = "/orders"}
                        className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors cursor-pointer ${
                          i === Math.min(orders.length, 10) - 1 ? "border-b-0" : ""
                        }`}>
                        <td className="px-6 py-4"><span className="text-xs font-mono text-zinc-400">{job.order_number}</span></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${avatarColor(job.customer_name || "")}`}>
                              {initials(job.customer_name || "?")}
                            </div>
                            <span className="text-sm font-medium text-white">{job.customer_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-400">{job.vehicle_label || "—"}</td>
                        <td className="px-4 py-4 max-w-[180px]"><span className="text-sm text-zinc-400 truncate block">{job.problem}</span></td>
                        <td className="px-4 py-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusStyle[job.status] || ""}`}>{job.status}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-400">{job.mechanic}</td>
                        <td className="px-4 py-4 text-xs text-zinc-600">
                          {new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
