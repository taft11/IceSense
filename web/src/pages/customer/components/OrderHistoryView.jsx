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

const getItemImage = (item) => {
  if (item.image || item.imageUrl) return item.image || item.imageUrl;
  const name = String(item.name || '').toLowerCase();
  if (name.includes('crushed')) return '/CrushedIce.jpg';
  if (name.includes('tube')) return '/TubeIce.jpg';
  return null;
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
              <div
                key={order.id}
                className="rounded-xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-4 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold text-slate-900">
                        Order #{order.id?.slice(0, 6).toUpperCase()}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          STATUS_BADGE_STYLES[displayStatus] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {displayStatus}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span>{orderDate}</span>
                      <span className="font-semibold text-slate-900">
                        ₱{Number(order.total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-sky-50/50 px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="inline-flex items-center gap-2 text-sky-700">
                        <Truck className="h-4 w-4" />
                        <span className="font-semibold">Target Delivery</span>
                      </div>
                      <div className="text-sm text-slate-700">
                        <span>{deliveryDate}</span>
                        <span className="mx-2">•</span>
                        <span>{deliveryTimeSlot}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 divide-y divide-slate-100 rounded-2xl bg-slate-50">
                    {(order.items || []).map((item, index) => {
                      const itemImage = getItemImage(item);
                      return (
                        <div
                          key={`${order.id}-${index}`}
                          className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-slate-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-slate-100">
                              {itemImage ? (
                                <img
                                  src={itemImage}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                  <span className="text-xs">No image</span>
                                </div>
                              )}
                            </div>
                            <span>{item.name} × {item.quantity}</span>
                          </div>
                          <span className="font-semibold text-slate-900">
                            ₱{Number(item.price * item.quantity || 0).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId((prev) => (prev === order.id ? null : order.id))}
                      className="inline-flex items-center justify-center rounded-xl bg-[#4091c9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d75aa]"
                    >
                      <span className="inline-flex items-center gap-2">
                        View Details
                        <ChevronDown
                          className={`h-4 w-4 transition ${expandedOrderId === order.id ? 'rotate-180' : ''}`}
                        />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onReorder?.(order)}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#4091c9] hover:text-[#4091c9]"
                    >
                      Reorder
                    </button>
                  </div>
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
