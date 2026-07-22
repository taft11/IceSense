import { Clock3, ReceiptText } from 'lucide-react';

export default function OrderHistoryView({ orders, ordersLoading, ordersError }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Orders</h2>
          <p className="text-gray-600">View every order you have placed through the portal.</p>
        </div>
        <div className="rounded-full bg-blue-50 p-3 text-[#4091c9]">
          <ReceiptText className="h-6 w-6" />
        </div>
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
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
          <p className="font-semibold text-gray-800">No orders yet</p>
          <p className="mt-2">Your recent orders will appear here after you place your first one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-[#4091c9]" />
                    <p className="text-sm font-semibold text-gray-700">
                      {new Date(order.createdAt?.toMillis?.() || order.createdAt || 0).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-2 text-lg font-bold text-gray-900">Order #{order.id?.slice(0, 6).toUpperCase()}</p>
                  <p className="text-sm text-gray-600">Status: {order.status || 'Placed'}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-xl font-black text-[#4091c9]">₱{Number(order.total || 0).toFixed(2)}</p>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
