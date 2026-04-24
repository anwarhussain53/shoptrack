"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Vehicle = {
  id: string;
  customer_id: string;
  shop_id: string;
  year: string;
  make: string;
  model: string;
  vin: string;
  plate: string;
  color: string;
  mileage: string;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
};

type CustomerOption = { id: string; name: string; phone: string };

const avatarColor = (label: string) => {
  const colors = [
    "bg-orange-500/20 text-orange-400",
    "bg-blue-500/20 text-blue-400",
    "bg-violet-500/20 text-violet-400",
    "bg-emerald-500/20 text-emerald-400",
    "bg-pink-500/20 text-pink-400",
    "bg-amber-500/20 text-amber-400",
  ];
  return colors[label.charCodeAt(0) % colors.length];
};

export default function VehiclesPage() {
  const [vehicles, setVehicles]       = useState<Vehicle[]>([]);
  const [customers, setCustomers]     = useState<CustomerOption[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<Vehicle | null>(null);
  const [showAdd, setShowAdd]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [shopId, setShopId]           = useState<string | null>(null);
  const [form, setForm]               = useState({
    customer_id: "", year: "", make: "", model: "", vin: "", plate: "", color: "", mileage: "",
  });
  const [formError, setFormError]     = useState("");

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

      const { data: vehicleData, error } = await supabase
        .from("vehicles")
        .select("*, customers (name, phone)")
        .eq("shop_id", shopData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (vehicleData || []).map((v: any) => ({
        ...v,
        customer_name:  v.customers?.name  || "Unknown",
        customer_phone: v.customers?.phone || "",
      }));
      setVehicles(mapped);

      const { data: custData } = await supabase
        .from("customers")
        .select("id, name, phone")
        .eq("shop_id", shopData.id)
        .order("name");
      setCustomers(custData || []);
    } catch (err) {
      console.error("Error loading vehicles:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = vehicles.filter((v) => {
    const label = `${v.year} ${v.make} ${v.model} ${v.plate} ${v.vin} ${v.customer_name}`.toLowerCase();
    return label.includes(search.toLowerCase());
  });

  async function handleAdd() {
    if (!form.customer_id) { setFormError("Select a customer."); return; }
    if (!form.year.trim()) { setFormError("Year is required."); return; }
    if (!form.make.trim()) { setFormError("Make is required."); return; }
    if (!form.model.trim()){ setFormError("Model is required."); return; }
    if (!shopId)           { setFormError("Shop not found."); return; }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .insert({
          shop_id:     shopId,
          customer_id: form.customer_id,
          year:        form.year.trim(),
          make:        form.make.trim(),
          model:       form.model.trim(),
          vin:         form.vin.trim() || null,
          plate:       form.plate.trim() || null,
          color:       form.color.trim() || null,
          mileage:     form.mileage.trim() || null,
        })
        .select("*, customers (name, phone)")
        .single();

      if (error) throw error;

      const enriched: Vehicle = {
        ...data,
        customer_name:  data.customers?.name  || "Unknown",
        customer_phone: data.customers?.phone || "",
      };

      setVehicles([enriched, ...vehicles]);
      setForm({ customer_id: "", year: "", make: "", model: "", vin: "", plate: "", color: "", mileage: "" });
      setFormError("");
      setShowAdd(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to save vehicle.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vehicle? This cannot be undone.")) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (!error) {
      setVehicles(vehicles.filter(v => v.id !== id));
      setSelected(null);
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
            { label: "Customers",     href: "/customers", active: false, icon: "M8 7a3 3 0 100-6 3 3 0 000 6zM2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z" },
            { label: "Vehicles",      href: "/vehicles",  active: true,  icon: "M2 10L4 4h8l2 6M1 10h14M4 13a1 1 0 100-2 1 1 0 000 2zM12 13a1 1 0 100-2 1 1 0 000 2z" },
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
            <h1 className="text-lg font-semibold text-white">Vehicles</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{vehicles.length} vehicles on file</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            Add vehicle
          </button>
        </div>

        <div className="px-8 py-8">

          {/* Search */}
          <div className="relative mb-6 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Search by year, make, model, plate, or owner…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 mb-1">Total vehicles</div>
              <div className="text-2xl font-bold text-white">{vehicles.length}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 mb-1">Unique customers</div>
              <div className="text-2xl font-bold text-white">{new Set(vehicles.map(v => v.customer_id)).size}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 mb-1">Added this month</div>
              <div className="text-2xl font-bold text-white">
                {vehicles.filter(v => new Date(v.created_at).getMonth() === new Date().getMonth()).length}
              </div>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin text-orange-500" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/>
              </svg>
              <span className="ml-3 text-zinc-400 text-sm">Loading vehicles…</span>
            </div>
          )}

          {!loading && vehicles.length === 0 && (
            <div className="text-center py-20 border border-zinc-800 rounded-xl">
              <div className="text-zinc-500 text-sm mb-1">No vehicles on file yet</div>
              <div className="text-zinc-600 text-xs mb-4">Vehicles are also created automatically when you check in a repair order</div>
              <button onClick={() => setShowAdd(true)}
                className="bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
                Add first vehicle
              </button>
            </div>
          )}

          {!loading && vehicles.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-500 font-medium px-6 py-3">Vehicle</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Owner</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Plate</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Color</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Mileage</th>
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-zinc-500 text-sm py-12">No vehicles match your search</td></tr>
                  )}
                  {filtered.map((v, i) => (
                    <tr key={v.id} onClick={() => setSelected(v)}
                      className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors cursor-pointer ${i === filtered.length - 1 ? "border-b-0" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${avatarColor(v.make || "")}`}>
                            {(v.make || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{v.year} {v.make} {v.model}</div>
                            {v.vin && <div className="text-xs text-zinc-500 font-mono">{v.vin}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-400">{v.customer_name}</td>
                      <td className="px-4 py-4 text-sm text-zinc-400 font-mono">{v.plate || "—"}</td>
                      <td className="px-4 py-4 text-sm text-zinc-400">{v.color || "—"}</td>
                      <td className="px-4 py-4 text-sm text-zinc-400">{v.mileage ? `${v.mileage} mi` : "—"}</td>
                      <td className="px-4 py-4 text-xs text-zinc-500">
                        {new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Vehicle detail slide-over ── */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)}/>
          <div className="relative w-96 bg-zinc-900 border-l border-zinc-800 h-full overflow-y-auto z-50 p-6">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <div className="flex items-center gap-3 mb-6 mt-2">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-semibold flex-shrink-0 ${avatarColor(selected.make || "")}`}>
                {(selected.make || "?")[0].toUpperCase()}
              </div>
              <div>
                <div className="text-base font-semibold text-white">{selected.year} {selected.make} {selected.model}</div>
                <div className="text-xs text-zinc-500">Owned by {selected.customer_name}</div>
              </div>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden mb-6">
              {[
                { label: "Year",       value: selected.year || "—" },
                { label: "Make",       value: selected.make || "—" },
                { label: "Model",      value: selected.model || "—" },
                { label: "VIN",        value: selected.vin || "—" },
                { label: "Plate",      value: selected.plate || "—" },
                { label: "Color",      value: selected.color || "—" },
                { label: "Mileage",    value: selected.mileage ? `${selected.mileage} mi` : "—" },
                { label: "Owner",      value: selected.customer_name || "—" },
                { label: "Phone",      value: selected.customer_phone || "—" },
                { label: "Added",      value: new Date(selected.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center px-4 py-3 border-b border-zinc-800 last:border-b-0">
                  <span className="text-xs text-zinc-500">{row.label}</span>
                  <span className={`text-sm font-medium text-white ${row.label === "VIN" || row.label === "Plate" ? "font-mono" : ""}`}>{row.value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <a href="/orders" className="block w-full bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-medium py-2.5 rounded-lg text-center">
                New repair order
              </a>
              <button onClick={() => handleDelete(selected.id)}
                className="w-full bg-red-950 hover:bg-red-900 border border-red-800 transition-colors text-red-400 text-sm font-medium py-2.5 rounded-lg">
                Delete vehicle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add vehicle modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAdd(false)}/>
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md z-50 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white mb-5">Add vehicle</h2>

            {formError && (
              <div className="bg-red-950 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 mb-4">{formError}</div>
            )}

            {customers.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-zinc-500 text-sm mb-2">No customers on file</div>
                <div className="text-zinc-600 text-xs">Add a customer first, then come back to add their vehicle.</div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {/* Customer select */}
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Owner (customer)</label>
                    <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors">
                      <option value="">Select a customer</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year / Make / Model */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Year</label>
                      <input type="text" placeholder="2019" value={form.year} maxLength={4}
                        onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Make</label>
                      <input type="text" placeholder="Honda" value={form.make}
                        onChange={(e) => setForm({ ...form, make: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Model</label>
                      <input type="text" placeholder="Civic" value={form.model}
                        onChange={(e) => setForm({ ...form, model: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* VIN */}
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">VIN <span className="text-zinc-600">(optional)</span></label>
                    <input type="text" placeholder="e.g. 2HGFC2F53KH123456" value={form.vin} maxLength={17}
                      onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm font-mono placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    {form.vin && form.vin.length !== 17 && (
                      <p className="text-xs text-zinc-600 mt-1">VIN should be 17 characters</p>
                    )}
                  </div>

                  {/* Plate + Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">License plate <span className="text-zinc-600">(optional)</span></label>
                      <input type="text" placeholder="MKJ 4892" value={form.plate}
                        onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm font-mono placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Color <span className="text-zinc-600">(optional)</span></label>
                      <input type="text" placeholder="Silver" value={form.color}
                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Mileage */}
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Mileage <span className="text-zinc-600">(optional)</span></label>
                    <input type="text" placeholder="e.g. 62440" value={form.mileage}
                      onChange={(e) => setForm({ ...form, mileage: e.target.value.replace(/\D/g, "") })}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setShowAdd(false); setFormError(""); setForm({ customer_id: "", year: "", make: "", model: "", vin: "", plate: "", color: "", mileage: "" }); }}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300 text-sm font-medium py-2.5 rounded-lg">Cancel</button>
                  <button onClick={handleAdd} disabled={saving}
                    className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 transition-colors text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                    {saving ? (
                      <><svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="7"/></svg>Saving…</>
                    ) : "Add vehicle"}
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
