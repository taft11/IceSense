import { ChevronDown, Info, LogOut, MapPin, ShoppingCart, ShieldCheck, UserCircle2 } from 'lucide-react';

export default function HeaderNav({
  activeView,
  onViewChange,
  accountMenuOpen,
  onToggleAccountMenu,
  onSelectAccountSection,
  onOpenCart,
  cartItemCount,
  onLogout,
  loggingOut,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 p-2 shadow-sm">
            <img src="/logo.png" alt="Bella Erin Tube Ice Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Bella Erin</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Ice Delivery</p>
          </div>
        </div>

        <nav className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onViewChange('order')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeView === 'order' ? 'bg-[#4091c9] text-white shadow-sm' : 'text-slate-700 hover:bg-sky-50 hover:text-[#4091c9]'}`}
          >
            Order Ice
          </button>
          <button
            type="button"
            onClick={() => onViewChange('orders')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeView === 'orders' ? 'bg-[#4091c9] text-white shadow-sm' : 'text-slate-700 hover:bg-sky-50 hover:text-[#4091c9]'}`}
          >
            My Orders
          </button>
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#4091c9] hover:text-[#4091c9]"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
            {cartItemCount > 0 && (
              <span className="rounded-full bg-[#4091c9] px-2 py-0.5 text-xs font-semibold text-white">{cartItemCount}</span>
            )}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={onToggleAccountMenu}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${activeView === 'account' ? 'bg-[#4091c9] text-white shadow-sm' : 'text-slate-700 hover:bg-sky-50 hover:text-[#4091c9]'}`}
            >
              <UserCircle2 className="h-4 w-4" />
              My Account
              <ChevronDown className="h-4 w-4" />
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-[24px] border border-slate-200 bg-white p-2 shadow-xl">
                <div className="rounded-2xl bg-sky-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4091c9]">Account center</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Manage profile, addresses, and delivery access.</p>
                </div>
                <div className="mt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => onSelectAccountSection('profile')}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-sky-50 hover:text-[#4091c9]"
                  >
                    <Info className="h-4 w-4" /> Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectAccountSection('addresses')}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-sky-50 hover:text-[#4091c9]"
                  >
                    <MapPin className="h-4 w-4" /> Addresses
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectAccountSection('password')}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-sky-50 hover:text-[#4091c9]"
                  >
                    <ShieldCheck className="h-4 w-4" /> Change Password
                  </button>
                </div>
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <button
                    type="button"
                    onClick={onLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {loggingOut ? 'Signing out...' : 'Sign Out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
