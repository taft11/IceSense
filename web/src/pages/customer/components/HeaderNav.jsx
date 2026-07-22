import { ChevronDown, Info, LogOut, MapPin, ShoppingCart, ShieldCheck } from 'lucide-react';

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
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Bella Erin Tube Ice Logo" className="h-14 w-auto" />
        </div>

        <nav className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onViewChange('order')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeView === 'order' ? 'bg-[#4091c9] text-white shadow-sm' : 'text-gray-700 hover:bg-blue-50 hover:text-[#4091c9]'}`}
          >
            Order Ice
          </button>
          <button
            type="button"
            onClick={() => onViewChange('orders')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeView === 'orders' ? 'bg-[#4091c9] text-white shadow-sm' : 'text-gray-700 hover:bg-blue-50 hover:text-[#4091c9]'}`}
          >
            My Orders
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={onToggleAccountMenu}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${activeView === 'account' ? 'bg-[#4091c9] text-white shadow-sm' : 'text-gray-700 hover:bg-blue-50 hover:text-[#4091c9]'}`}
            >
              My Account
              <ChevronDown className="h-4 w-4" />
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                <button
                  type="button"
                  onClick={() => onSelectAccountSection('profile')}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-[#4091c9]"
                >
                  <Info className="h-4 w-4" /> Profile
                </button>
                <button
                  type="button"
                  onClick={() => onSelectAccountSection('addresses')}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-[#4091c9]"
                >
                  <MapPin className="h-4 w-4" /> Addresses
                </button>
                <button
                  type="button"
                  onClick={() => onSelectAccountSection('password')}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-[#4091c9]"
                >
                  <ShieldCheck className="h-4 w-4" /> Change Password
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#4091c9] hover:text-[#4091c9]"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
            {cartItemCount > 0 && (
              <span className="rounded-full bg-[#4091c9] px-2 py-0.5 text-xs text-white">{cartItemCount}</span>
            )}
          </button>
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </nav>
      </div>
    </header>
  );
}
