import { CalendarDays, CheckCircle, Clock3, Info, Minus, Plus, ShoppingCart, Snowflake, X } from 'lucide-react';
import { PRODUCTS } from '../data/products';

export default function CartSidebar({
  isOpen,
  onClose,
  cartItems,
  cartSubtotal,
  cartItemCount,
  orderStatus,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onConfirmCheckout,
  onCancelCheckout,
  getRemainingStock,
  deliveryDate,
  onDeliveryDateChange,
  deliverySlot,
  onDeliverySlotChange,
  deliveryQuickOptions,
  earliestDeliveryDate,
  maxDeliveryDate,
  deliveryDateHeading,
  isDeliveryExpanded,
  onToggleDelivery,
  isCheckoutConfirmOpen,
  hasAddress,
}) {
  return (
    <div className={`fixed inset-0 z-40 transition ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/50 transition ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {isCheckoutConfirmOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-full bg-sky-100 p-2 text-[#4091c9]">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Confirm Checkout</h4>
                  <p className="text-sm text-gray-500">Please confirm your order details before proceeding.</p>
                </div>
              </div>

              <div className="mb-4 rounded-2xl bg-gray-50 p-3 text-sm text-gray-700">
                <div className="mb-2 flex items-center justify-between">
                  <span>Items</span>
                  <span className="font-semibold text-gray-900">{cartItemCount}</span>
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <span>Total</span>
                  <span className="font-semibold text-gray-900">₱{cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery</span>
                  <span className="font-semibold text-gray-900">{deliveryDateHeading}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCancelCheckout}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmCheckout}
                  className="flex-1 rounded-2xl bg-[#4091c9] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2d75aa]"
                >
                  Place Order
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Your Cart</h3>
            <p className="text-sm text-gray-500">
              {cartItemCount} item{cartItemCount === 1 ? '' : 's'} ready for checkout
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cartItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
              <p className="font-semibold text-gray-800">Your cart is empty</p>
              <p className="mt-2">
                Add some ice products first, then come back here to review and place your order.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => {
                const product = PRODUCTS.find((entry) => entry.id === item.productId);
                return (
                  <div key={item.productId} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-800">{product?.name}</p>
                        <p className="text-sm text-gray-500">
                          ₱{(product?.price ?? 0).toFixed(2)} each
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.productId)}
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.productId, -1)}
                          className="h-8 w-8 rounded-full bg-white text-gray-700 shadow-sm transition hover:bg-gray-100"
                        >
                          <Minus className="mx-auto h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-semibold text-gray-800">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.productId, 1)}
                          className="h-8 w-8 rounded-full bg-white text-gray-700 shadow-sm transition hover:bg-gray-100"
                          disabled={getRemainingStock(item.productId) <= 0}
                        >
                          <Plus className="mx-auto h-4 w-4" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">
                        ₱{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-6 py-5">
          <button
            type="button"
            onClick={onToggleDelivery}
            className="mb-4 flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#4091c9]"
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#4091c9]" />
              <span className="text-sm font-semibold text-gray-800">Delivery details</span>
            </div>
            <span className="text-xs font-medium text-gray-500">{isDeliveryExpanded ? 'Hide' : 'Select'}</span>
          </button>

          {!isDeliveryExpanded ? (
            <div className="mb-4 rounded-2xl bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
              <span className="font-semibold text-gray-900">{deliveryDateHeading}</span>
              <span className="ml-2 text-gray-500">Delivery slot selected</span>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <p>
                    Orders placed before 8:00 PM are eligible for next-day delivery. After 8:00 PM, next-day delivery closes,
                    so the earliest available date becomes the day after tomorrow.
                  </p>
                </div>
              </div>

              <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <CalendarDays className="h-4 w-4 text-[#4091c9]" />
                  Delivery Date
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  {deliveryQuickOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onDeliveryDateChange(option.value)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        deliveryDate === option.value
                          ? 'border-[#4091c9] bg-[#4091c9] text-white'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-[#4091c9] hover:text-[#4091c9]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <label className="block text-sm text-gray-600">
                  Choose a date up to 14 days ahead
                  <input
                    type="date"
                    value={deliveryDate}
                    min={earliestDeliveryDate}
                    max={maxDeliveryDate}
                    onChange={(event) => onDeliveryDateChange(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#4091c9] focus:ring-2 focus:ring-sky-100"
                  />
                </label>
              </div>

              <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <Clock3 className="h-4 w-4 text-[#4091c9]" />
                  Time Slot
                </div>

                <div className="grid gap-2">
                  {[
                    { id: 'morning', label: '8:00 AM - 11:00 AM' },
                    { id: 'midday', label: '11:00 AM - 2:00 PM' },
                    { id: 'afternoon', label: '2:00 PM - 5:00 PM' },
                  ].map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => onDeliverySlotChange(slot.id)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        deliverySlot === slot.id
                          ? 'border-[#4091c9] bg-sky-50 text-[#4091c9]'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-[#4091c9] hover:text-[#4091c9]'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4 rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-700">
                Selected delivery: <span className="font-semibold text-gray-900">{deliveryDateHeading}</span>
              </div>
            </>
          )}

          <div className="mb-4 flex items-center justify-between text-lg font-bold text-gray-800">
            <span>Total</span>
            <span>₱{cartSubtotal.toFixed(2)}</span>
          </div>
          {!hasAddress && (
            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Add a delivery address first to continue checkout.
            </div>
          )}
          <button
            type="button"
            onClick={onCheckout}
            disabled={orderStatus !== 'idle' || cartItems.length === 0}
            className={`flex w-full items-center justify-center rounded-2xl p-4 text-lg font-bold transition ${
              orderStatus === 'idle' && cartItems.length > 0
                ? 'bg-[#4091c9] text-white hover:bg-[#2d75aa]'
                : ''
            } ${orderStatus === 'processing' ? 'cursor-not-allowed bg-[#7aa8d1] text-white' : ''} ${
              orderStatus === 'success' ? 'bg-green-500 text-white' : ''
            } ${cartItems.length === 0 ? 'cursor-not-allowed bg-gray-200 text-gray-500' : ''}`}
          >
            {orderStatus === 'idle' && cartItems.length > 0 && (
              <>
                <ShoppingCart className="mr-2 h-5 w-5" /> Check Out
              </>
            )}
            {orderStatus === 'processing' && (
              <>
                <Snowflake className="mr-2 h-5 w-5 animate-spin" /> Processing...
              </>
            )}
            {orderStatus === 'success' && (
              <>
                <CheckCircle className="mr-2 h-5 w-5" /> Order Successful!
              </>
            )}
            {cartItems.length === 0 && 'Add Items to Cart'}
          </button>
        </div>
      </aside>
    </div>
  );
}
