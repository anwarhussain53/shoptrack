export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-500 rounded-md flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 12 L4 5 L8 3 L12 5 L14 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="8" cy="12" r="2" fill="white"/>
              <circle cx="4" cy="12" r="1.5" fill="white"/>
              <circle cx="12" cy="12" r="1.5" fill="white"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">ShopTrack</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-zinc-400 text-sm hover:text-white transition-colors">Features</a>
          <a href="#" className="text-zinc-400 text-sm hover:text-white transition-colors">Pricing</a>
          <a href="/login" className="text-sm text-white border border-zinc-700 px-4 py-2 rounded-lg hover:border-zinc-500 transition-colors">
            Sign in
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">

        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
          Built for independent auto repair shops
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight max-w-3xl mb-6">
          Run your shop.<br />
          <span className="text-orange-500">Stop chasing customers.</span>
        </h1>

        <p className="text-zinc-400 text-lg max-w-xl mb-10 leading-relaxed">
          ShopTrack manages your repair jobs, texts customers automatically on every update, and generates invoices — so you can focus on fixing cars.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <a href="/dashboard" className="bg-orange-500 hover:bg-orange-400 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm">
            Go to dashboard →
          </a>
          <a href="#" className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm">
            See how it works
          </a>
        </div>

        {/* Stats row */}
        <div className="flex gap-10 mt-16 pt-10 border-t border-zinc-800">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">7</div>
            <div className="text-xs text-zinc-500 mt-1">repair stages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">0</div>
            <div className="text-xs text-zinc-500 mt-1">"is my car ready?" calls</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">Auto</div>
            <div className="text-xs text-zinc-500 mt-1">SMS on every update</div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-t border-zinc-800 px-8 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl mx-auto w-full">
        <div>
          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center mb-3">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="2" stroke="#f97316" strokeWidth="1.2"/><path d="M5 7h6M5 10h4" stroke="#f97316" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </div>
          <div className="text-white font-medium text-sm mb-1">Repair order tracking</div>
          <div className="text-zinc-500 text-xs leading-relaxed">Every job has a status. Every status change is logged. Nothing falls through the cracks.</div>
        </div>
        <div>
          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center mb-3">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="#f97316" strokeWidth="1.2"/><path d="M1 7h14" stroke="#f97316" strokeWidth="1.2"/></svg>
          </div>
          <div className="text-white font-medium text-sm mb-1">Automatic SMS alerts</div>
          <div className="text-zinc-500 text-xs leading-relaxed">Customers get a text the moment their car moves to a new stage — no manual work needed.</div>
        </div>
        <div>
          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center mb-3">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#f97316" strokeWidth="1.2"/><path d="M5 6h6M5 9h4" stroke="#f97316" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </div>
          <div className="text-white font-medium text-sm mb-1">Instant invoices</div>
          <div className="text-zinc-500 text-xs leading-relaxed">Generate a professional PDF invoice from every completed repair order in one click.</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-8 py-5 flex items-center justify-between">
        <span className="text-zinc-600 text-xs">© 2026 ShopTrack</span>
        <span className="text-zinc-600 text-xs">Built for the shops that keep the world moving</span>
      </footer>

    </main>
  );
}
