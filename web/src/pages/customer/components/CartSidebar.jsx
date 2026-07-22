import { CheckCircle, Minus, Plus, ShoppingCart, Snowflake, X } from 'lucide-react';
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
  getRemainingStock,
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
          <div className="mb-4 flex items-center justify-between text-lg font-bold text-gray-800">
            <span>Total</span>
            <span>₱{cartSubtotal.toFixed(2)}</span>
          </div>
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
