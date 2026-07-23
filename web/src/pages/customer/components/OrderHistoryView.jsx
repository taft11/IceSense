import { useMemo, useState } from 'react';
import { ChevronDown, Clock3, PackageCheck, ReceiptText, Truck } from 'lucide-react';

const STATUS_BADGE_STYLES = {
  Placed: 'bg-amber-100 text-amber-800',
  Pending: 'bg-amber-100 text-amber-800',
  Preparing: 'bg-sky-100 text-sky-800',
  'Out for Delivery': 'bg-indigo-100 text-indigo-800',
  Delivered: 'bg-emerald-100 text-emerald-800',
  Cancelled: 'bg-red-100 text-red-800',
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Orders' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

const isOrderActive = (status) => !['Delivered', 'Cancelled'].includes(status || 'Placed');

const formatDate = (value) => {
  const date = typeof value?.toMillis === 'function' ? value.toDate() : new Date(value || 0);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString();
};

const formatReadableDate = (value) => {
  const date = typeof value?.toMillis === 'function' ? value.toDate() : new Date(value || 0);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export default function OrderHistoryView({ orders, ordersLoading, ordersError, onReorder }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'active') {
      return orders.filter((order) => isOrderActive(order.status));
    }

    if (activeFilter === 'completed') {
      return orders.filter((order) => !isOrderActive(order.status));
    }

    return orders;
  }, [activeFilter, orders]);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Orders</h2>
          <p className="text-gray-600">Track every order, delivery window, and quick reorder from one place.</p>
        </div>
        <div className="rounded-full bg-blue-50 p-3 text-[#4091c9]">
          <ReceiptText className="h-6 w-6" />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeFilter === tab.id
                ? 'bg-[#4091c9] text-white'
                : 'border border-gray-200 bg-gray-50 text-gray-700 hover:border-[#4091c9] hover:text-[#4091c9]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {ordersError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {ordersError}
        </div>
      )}

      {ordersLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          Loading your orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
          <p className="font-semibold text-gray-800">No orders yet</p>
          <p className="mt-2">Your recent orders will appear here after you place your first one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const displayStatus = order.status || 'Placed';
            const orderDate = formatDate(order.createdAt);
            const deliveryDate = formatReadableDate(order.deliveryDate);
            const deliveryTimeSlot = order.deliveryTimeSlot || order.deliverySlot || 'Not selected';

            return (
              <div key={order.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Clock3 className="h-4 w-4 text-[#4091c9]" />
                      <p className="text-sm font-semibold text-gray-700">{orderDate}</p>
                    </div>
                    <p className="mt-2 text-lg font-bold text-gray-900">Order #{order.id?.slice(0, 6).toUpperCase()}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_STYLES[displayStatus] || 'bg-gray-100 text-gray-700'}`}>
                        {displayStatus}
                      </span>
                    </div>
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-xl font-black text-[#4091c9]">₱{Number(order.total || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                      <Truck className="h-4 w-4" />
                      <span>Target Delivery</span>
                    </div>
                    <div className="text-sky-800">
                      <span>{deliveryDate}</span>
                      <span className="mx-2">•</span>
                      <span>{deliveryTimeSlot}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {(order.items || []).map((item, index) => (
                    <div key={`${order.id}-${index}`} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <span>₱{Number(item.price * item.quantity || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onReorder?.(order)}
                    className="rounded-xl bg-[#4091c9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d75aa]"
                  >
                    Reorder
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedOrderId((prev) => (prev === order.id ? null : order.id))}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#4091c9] hover:text-[#4091c9]"
                  >
                    <span className="inline-flex items-center gap-2">
                      View Details
                      <ChevronDown className={`h-4 w-4 transition ${expandedOrderId === order.id ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                </div>

                {expandedOrderId === order.id && (
                  <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="font-semibold text-gray-900">Shipping Address</p>
                        <p className="mt-1 text-gray-600">{order.shippingAddress || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Landmark</p>
                        <p className="mt-1 text-gray-600">{order.landmark || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Payment Method</p>
                        <p className="mt-1 text-gray-600">{order.paymentMethod || 'Cash on Delivery'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
