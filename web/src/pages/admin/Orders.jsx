import { ClipboardList, ArrowLeft, ArrowRight } from 'lucide-react';

export default function Orders({
  allOrders,
  ordersLoading,
  ordersError,
  paginatedOrders,
  pendingOrders,
  completedOrders,
  ordersPage,
  totalOrderPages,
  setOrdersPage,
  openConfirmModal,
  confirmingOrderId,
  formatDate,
}) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Orders</h2>
          <p className="mt-2 text-gray-600">Track customer orders, contact details, and fulfillment status.</p>
        </div>
        <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-[#4091c9]">
          {allOrders.length} total orders
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="font-semibold text-gray-800">Pending Orders</p>
          <p className="mt-1 text-sm text-gray-600">{pendingOrders} orders awaiting dispatch.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="font-semibold text-gray-800">Completed</p>
          <p className="mt-1 text-sm text-gray-600">{completedOrders} orders marked completed.</p>
        </div>
      </div>

      {ordersError && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {ordersError}
        </div>
      )}

      {ordersLoading ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">Loading orders...</div>
      ) : allOrders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">No orders have been placed yet.</div>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Order</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Items</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Total</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Placed</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">#{order.id?.slice(0, 8).toUpperCase()}</p>
                        <p className="mt-1 text-xs text-gray-500">{order.userId?.slice(0, 10) || 'Guest'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{order.customerName || 'Unknown customer'}</p>
                        <p className="text-xs text-gray-500">{order.customerEmail || 'No email'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {(order.items || []).map((item, index) => (
                            <p key={`${order.id}-${index}`} className="text-gray-700">
                              {item.name} × {item.quantity}
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">₱{Number(order.total || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          (order.status || '').toLowerCase() === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : (order.status || '').toLowerCase() === 'processing'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status || 'Placed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openConfirmModal(order)}
                          disabled={confirmingOrderId === order.id || (order.status || '').toLowerCase() === 'confirmed' || (order.status || '').toLowerCase() === 'completed'}
                          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${((order.status || '').toLowerCase() === 'confirmed' || (order.status || '').toLowerCase() === 'completed')
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'bg-[#4091c9] text-white hover:bg-[#2d75aa] disabled:cursor-not-allowed disabled:bg-blue-300'}`}
                        >
                          {confirmingOrderId === order.id
                            ? 'Confirming...'
                            : ((order.status || '').toLowerCase() === 'confirmed' || (order.status || '').toLowerCase() === 'completed'
                              ? 'Confirmed'
                              : 'Confirm')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Showing {Math.min((ordersPage - 1) * 6 + 1, allOrders.length)}-{Math.min(ordersPage * 6, allOrders.length)} of {allOrders.length} orders
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setOrdersPage((current) => Math.max(1, current - 1))} disabled={ordersPage === 1} className="flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-50">
                <ArrowLeft className="mr-2 h-4 w-4" /> Prev
              </button>
              <span className="text-sm font-semibold text-gray-700">Page {ordersPage} of {totalOrderPages}</span>
              <button onClick={() => setOrdersPage((current) => Math.min(totalOrderPages, current + 1))} disabled={ordersPage === totalOrderPages} className="flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-50">
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
