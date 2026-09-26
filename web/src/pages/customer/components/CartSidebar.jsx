import { CalendarDays, CheckCircle, Clock3, Info, Minus, Plus, ShoppingCart, Snowflake, X } from 'lucide-react';
import { PRODUCTS } from '../data/products';

export default function CartSidebar({
  isOpen,
  onClose,
  cartItems,
  cartSubtotal,
  deliveryFee,
  orderTotal,
  cartItemCount,
  orderStatus,
  isRescheduling,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onConfirmCheckout,
  onCancelCheckout,
  getRemainingStock,
  fulfillmentMethod,
  onFulfillmentMethodChange,
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
  hasPricedDeliveryAddress,
  receiptFile,
  receiptReferenceNumber,
  detectedReceiptReferenceNumber,
  isReceiptReferenceConfirmed,
  isReceiptReferenceEditing,
  onConfirmReceiptReference,
  onEditReceiptReference,
  onReceiptReferenceNumberChange,
  isExtractingReference,
  onReceiptFileChange,
  receiptError,
}) {
  return (
    <div className={`fixed inset-0 z-40 transition ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/50 transition ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {isCheckoutConfirmOpen && !isRescheduling && (
          <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 sm:p-5">
            <div className="my-auto max-h-full w-full max-w-md overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-2xl sm:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-2xl bg-sky-100 p-2.5 text-[#4091c9]">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-lg font-bold leading-tight text-gray-900">Confirm Checkout</h4>
                  <p className="mt-1 text-sm leading-5 text-gray-500">Review your payment details before placing this order.</p>
                </div>
              </div>

              <div className="mb-3 grid grid-cols-3 divide-x divide-gray-200 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
                <div className="pr-2">
                  <span>Items</span>
                  <p className="mt-1 font-semibold text-gray-900">{cartItemCount}</p>
                </div>
                <div className="px-2">
                  <span>Subtotal</span>
                  <p className="mt-1 font-semibold text-gray-900">₱{cartSubtotal.toFixed(2)}</p>
                </div>
                <div className="pl-2">
                  <span>{fulfillmentMethod === 'pickup' ? 'Pickup' : 'Delivery'}</span>
                  <p className="mt-1 truncate font-semibold text-gray-900">{deliveryDateHeading}</p>
                </div>
              </div>

              <div className="mb-3 space-y-1 rounded-xl bg-white px-3 py-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Delivery fee</span>
                  <span>{deliveryFee == null ? 'Add map pin' : `₱${deliveryFee.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900">
                  <span>Order total</span>
                  <span>₱{orderTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <ShoppingCart className="h-4 w-4 text-[#4091c9]" />
                  GCash Payment Instructions
                </div>
                <div className="grid gap-3 text-sm text-gray-700">
                  <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3">
                    <p className="font-semibold text-gray-900">Pay via GCash</p>
                    <p className="mt-1 text-xs leading-5 text-gray-600">Scan the QR code, then upload your payment receipt below.</p>
                  </div>
                  <div className="grid items-center gap-3 sm:grid-cols-[148px_auto]">
                    <a
                      href="/gcash-qr.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mx-auto block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md sm:mx-0"
                    >
                      <img
                        src="/gcash-qr.png"
                        alt="GCash QR code"
                        className="h-36 w-36 object-contain"
                      />
                    </a>
                    <div className="space-y-1 text-xs leading-5 text-gray-600">
                      <p className="font-semibold text-gray-900">GCash Account</p>
                      <p>Account Name: Bella Erin Tube Ice</p>
                      <p>GCash Number: 0917-123-4567</p>
                    </div>
                  </div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-700" htmlFor="receiptUpload">
                    Upload receipt screenshot
                  </label>
                  <input
                    id="receiptUpload"
                    key={receiptFile?.name || 'empty-receipt'}
                    type="file"
                    accept="image/*"
                    onChange={(event) => onReceiptFileChange(event.target.files?.[0] || null)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none transition focus:border-[#4091c9] focus:ring-2 focus:ring-sky-100"
                  />
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-700" htmlFor="receiptReferenceNumber">
                    Receipt reference number
                  </label>
                  {isExtractingReference ? (
                    <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-xs text-[#205a82]" role="status">
                      <Clock3 className="h-4 w-4 shrink-0 animate-pulse" />
                      <span>Reading the reference number from your receipt...</span>
                    </div>
                  ) : detectedReceiptReferenceNumber && !isReceiptReferenceConfirmed && !isReceiptReferenceEditing ? (
                    <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#205a82]">Reference Number Detected:</p>
                        <p className="mt-1 break-all rounded-lg bg-white px-2.5 py-2 font-mono text-base font-normal tracking-normal text-gray-900 shadow-sm">{detectedReceiptReferenceNumber}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">Is this reference number correct?</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={onConfirmReceiptReference}
                          className="rounded-xl bg-[#4091c9] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2d75aa]"
                        >
                          Yes, this is correct
                        </button>
                        <button
                          type="button"
                          onClick={onEditReceiptReference}
                          className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          No, edit reference number
                        </button>
                      </div>
                    </div>
                  ) : isReceiptReferenceConfirmed ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle className="h-4 w-4" /> Confirmed reference</p>
                        <p className="mt-1 break-all font-mono text-sm font-bold text-gray-900">{detectedReceiptReferenceNumber}</p>
                      </div>
                      <button type="button" onClick={onEditReceiptReference} className="shrink-0 text-xs font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-950">
                        Edit
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        id="receiptReferenceNumber"
                        type="text"
                        value={receiptReferenceNumber}
                        onChange={(event) => onReceiptReferenceNumberChange(event.target.value)}
                        placeholder="Found beside Ref no."
                        autoComplete="off"
                        required
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#4091c9] focus:ring-2 focus:ring-sky-100"
                      />
                      <p className="text-xs text-gray-500">Enter the reference number shown on your receipt.</p>
                    </>
                  )}
                  {receiptError && <p className="text-sm text-red-600">{receiptError}</p>}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onCancelCheckout}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmCheckout}
                  disabled={!receiptFile || !receiptReferenceNumber.trim() || isExtractingReference || Boolean(detectedReceiptReferenceNumber && !isReceiptReferenceConfirmed && !isReceiptReferenceEditing)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${receiptFile && receiptReferenceNumber.trim() && !isExtractingReference && (!detectedReceiptReferenceNumber || isReceiptReferenceConfirmed || isReceiptReferenceEditing) ? 'bg-[#4091c9] hover:bg-[#2d75aa]' : 'cursor-not-allowed bg-slate-300 text-slate-600'}`}
                >
                  Place Order
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-5">
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

        <div className="px-6 py-5">
          {isRescheduling && (
            <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
              <p className="font-semibold">Reschedule failed delivery</p>
              <p className="mt-1">Your original items and quantities are locked. Choose a new date and time below.</p>
            </div>
          )}
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
                      {!isRescheduling && (
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.productId)}
                          className="text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.productId, -1)}
                          disabled={isRescheduling}
                          className="h-8 w-8 rounded-full bg-white text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="mx-auto h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-semibold text-gray-800">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.productId, 1)}
                          disabled={isRescheduling || getRemainingStock(item.productId) <= 0}
                          className="h-8 w-8 rounded-full bg-white text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
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
          <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-gray-800">Fulfillment method</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'delivery', label: 'Delivery' },
                { id: 'pickup', label: 'Pickup' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onFulfillmentMethodChange(option.id)}
                  disabled={isRescheduling}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    fulfillmentMethod === option.id
                      ? 'border-[#4091c9] bg-[#4091c9] text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-[#4091c9] hover:text-[#4091c9]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {fulfillmentMethod === 'pickup'
                ? 'Collect your order from the ice plant at the selected time.'
                : 'Your order will be delivered to your saved address.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleDelivery}
            className="mb-4 flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#4091c9]"
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#4091c9]" />
              <span className="text-sm font-semibold text-gray-800">{fulfillmentMethod === 'pickup' ? 'Pickup details' : 'Delivery details'}</span>
            </div>
            <span className="text-xs font-medium text-gray-500">{isDeliveryExpanded ? 'Hide' : 'Select'}</span>
          </button>

          {!isDeliveryExpanded ? (
            <div className="mb-4 rounded-2xl bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
              <span className="font-semibold text-gray-900">{deliveryDateHeading}</span>
              <span className="ml-2 text-gray-500">{fulfillmentMethod === 'pickup' ? 'Pickup slot selected' : 'Delivery slot selected'}</span>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <p>
                    Orders placed before 8:00 PM are eligible for the next available date. After 8:00 PM, the earliest
                    available date becomes the day after tomorrow.
                  </p>
                </div>
              </div>

              <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <CalendarDays className="h-4 w-4 text-[#4091c9]" />
                  {fulfillmentMethod === 'pickup' ? 'Pickup Date' : 'Delivery Date'}
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
                Selected {fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery'}: <span className="font-semibold text-gray-900">{deliveryDateHeading}</span>
              </div>
            </>
          )}

          <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
            <span>Items subtotal</span>
            <span>₱{cartSubtotal.toFixed(2)}</span>
          </div>
          <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
            <span>Delivery fee</span>
            <span>{deliveryFee == null ? 'Map pin required' : `₱${deliveryFee.toFixed(2)}`}</span>
          </div>
          <div className="mb-4 flex items-center justify-between text-lg font-bold text-gray-800">
            <span>Total</span>
            <span>₱{orderTotal.toFixed(2)}</span>
          </div>
          {!hasAddress && (
            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Add a delivery address first to continue checkout.
            </div>
          )}
          {hasAddress && fulfillmentMethod === 'delivery' && !hasPricedDeliveryAddress && (
            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Add a map pin to your default address to calculate the delivery fee.
            </div>
          )}
          <button
            type="button"
            onClick={onCheckout}
            disabled={orderStatus !== 'idle' || cartItems.length === 0 || (fulfillmentMethod === 'delivery' && !hasPricedDeliveryAddress)}
            className={`flex w-full items-center justify-center rounded-2xl p-4 text-lg font-bold transition ${
              orderStatus === 'idle' && cartItems.length > 0 && (fulfillmentMethod === 'pickup' || hasPricedDeliveryAddress)
                ? 'bg-[#4091c9] text-white hover:bg-[#2d75aa]'
                : ''
            } ${orderStatus === 'processing' ? 'cursor-not-allowed bg-[#7aa8d1] text-white' : ''} ${
              orderStatus === 'success' ? 'bg-green-500 text-white' : ''
            } ${cartItems.length === 0 || (fulfillmentMethod === 'delivery' && !hasPricedDeliveryAddress) ? 'cursor-not-allowed bg-gray-200 text-gray-500' : ''}`}
          >
            {orderStatus === 'idle' && cartItems.length > 0 && (
              <>
                <ShoppingCart className="mr-2 h-5 w-5" />
                {isRescheduling ? 'Confirm' : 'Check Out'}
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
            {cartItems.length > 0 && fulfillmentMethod === 'delivery' && !hasAddress && 'Add Delivery Address'}
            {hasAddress && cartItems.length > 0 && fulfillmentMethod === 'delivery' && !hasPricedDeliveryAddress && 'Add Location Pin'}
          </button>
        </div>
      </aside>
    </div>
  );
}
