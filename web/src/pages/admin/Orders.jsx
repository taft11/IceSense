import { useState } from 'react';
import { ClipboardList, ArrowLeft, ArrowRight } from 'lucide-react';

const ORDERS_PER_PAGE = 6;

export default function Orders({
  ordersLoading,
  ordersError,
  paginatedOrders,
  pendingOrders,
  processingOrders,
  deliveredOrders,
  cancelledOrders,
  completedOrders,
  ordersPage,
  totalOrderPages,
  setOrdersPage,
  activeOrderFilter,
  setActiveOrderFilter,
  activeDateFilter,
  setActiveDateFilter,
  formatDate,
  verificationLoadingId,
  onApprovePayment,
  onOpenReceiptPreview,
  onOpenRejectModal,
}) {
  const [confirmAction, setConfirmAction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filterOptions = [
    { key: 'all', label: 'All', count: pendingOrders + processingOrders + deliveredOrders + cancelledOrders },
    { key: 'pending_payment', label: 'Pending Verification', count: pendingOrders },
    { key: 'processing', label: 'Processing', count: processingOrders },
    { key: 'delivered', label: 'Delivered', count: deliveredOrders },
    { key: 'cancelled', label: 'Cancelled', count: cancelledOrders },
  ];

  const openApproveConfirm = (order) => {
    setConfirmAction({ type: 'approve', order });
  };

  const openRejectConfirm = (order) => {
    setConfirmAction({ type: 'reject', order });
  };

  const closeConfirmModal = () => {
    setConfirmAction(null);
  };

  const handleConfirmAction = () => {
    if (!confirmAction?.order) return;

    if (confirmAction.type === 'approve') {
      onApprovePayment(confirmAction.order);
    } else if (confirmAction.type === 'reject') {
      onOpenRejectModal(confirmAction.order);
    }

    closeConfirmModal();
  };

  const getStatusBadge = (order) => {
    const normalizedStatus = (order.status || '').toLowerCase();
    const paymentStatus = (order.paymentStatus || '').toLowerCase();

    if (paymentStatus === 'pending_payment_verification' || paymentStatus === 'pending') {
      return { label: 'Pending Payment Verification', className: 'bg-yellow-100 text-yellow-700' };
    }

    if (normalizedStatus === 'cancelled' || normalizedStatus === 'rejected') {
      return { label: 'Cancelled', className: 'bg-red-100 text-red-700' };
    }

    if (
      normalizedStatus === 'delivered' ||
      normalizedStatus === 'completed' ||
      normalizedStatus === 'done' ||
      normalizedStatus === 'finished' ||
      normalizedStatus === 'delivery completed' ||
      paymentStatus === 'delivered'
    ) {
      return { label: 'Delivered', className: 'bg-green-100 text-green-700' };
    }

    if (normalizedStatus === 'processing' || paymentStatus === 'paid') {
      return { label: 'Processing', className: 'bg-blue-100 text-blue-700' };
    }

    return { label: 'Pending Payment Verification', className: 'bg-yellow-100 text-yellow-700' };
  };

  const filteredDisplayOrders = paginatedOrders.filter((order) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;

    return [order.id, order.customerName, order.customerEmail]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  }).slice(0, 9);

  const getOrderDateLabel = (order) => {
    if (!order?.createdAt) return 'No date';

    const date = typeof order.createdAt?.toDate === 'function'
      ? order.createdAt.toDate()
      : order.createdAt instanceof Date
        ? order.createdAt
        : new Date(order.createdAt);

    if (Number.isNaN(date.getTime())) return 'No date';

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTotalWeightKg = (order) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.reduce((sum, item) => sum + Number(item?.weightKg || 0) * Number(item?.quantity || 0), 0);
  };

  const getPaymentMethodLabel = (order) => {
    const value = String(order?.paymentMethod || order?.paymentType || '').trim();
    if (!value) return 'Unspecified';
    return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getFulfillmentBadge = (order) => {
    const method = String(order?.fulfillmentMethod || order?.deliveryType || '').toLowerCase();
    if (method.includes('pickup')) {
      return { label: 'Pickup', className: 'bg-violet-100 text-violet-700' };
    }
    return { label: 'Delivery', className: 'bg-sky-100 text-sky-700' };
  };

  const isPendingVerification = (order) => {
    const paymentStatus = String(order?.paymentStatus || '').toLowerCase();
    return paymentStatus === 'pending_payment_verification' || paymentStatus === 'pending' || paymentStatus === 'awaiting_verification';
  };

  return (
    <div className="w-full max-w-7xl min-w-0 overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-800">Orders</h2>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {completedOrders} Completed
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {pendingOrders} Action Required
            </span>
          </div>
          <p className="mt-2 text-gray-600">Review orders by status and manage payment verification when needed.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {filterOptions.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveOrderFilter(filter.key)}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${activeOrderFilter === filter.key ? 'bg-[#4091c9] text-white shadow-sm' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search order / customer"
              className="w-44 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          <input
            type="date"
            value={activeDateFilter}
            onChange={(event) => setActiveDateFilter(event.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#4091c9]"
          />
          <button
            onClick={() => {
              setActiveDateFilter('');
              setSearchTerm('');
            }}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      {ordersError && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {ordersError}
        </div>
      )}

      {ordersLoading ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">Loading orders...</div>
      ) : filteredDisplayOrders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">No orders match the current filters yet.</div>
      ) : (
        <>
          <div className="mt-6 w-full overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Order</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Items</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Fulfillment</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Payment</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredDisplayOrders.map((order) => {
                    const fullfillmentBadge = getFulfillmentBadge(order);
                    const paymentMethodLabel = getPaymentMethodLabel(order);

                    return (
                      <tr key={order.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">#{order.id?.slice(0, 8).toUpperCase()}</p>
                          <p className="mt-1 text-xs text-gray-500">{getOrderDateLabel(order)}</p>
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
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${fullfillmentBadge.className}`}>
                            {fullfillmentBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-800">₱{Number(order.total || 0).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{paymentMethodLabel}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(order).className}`}>
                            {getStatusBadge(order).label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isPendingVerification(order) ? (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => openApproveConfirm(order)}
                                className="rounded-full bg-[#4091c9] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2d75aa]"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openRejectConfirm(order)}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openApproveConfirm(order)}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
                            >
                              Details
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Showing {Math.min((ordersPage - 1) * ORDERS_PER_PAGE + 1, filteredDisplayOrders.length)}-{Math.min(ordersPage * ORDERS_PER_PAGE, filteredDisplayOrders.length)} of {filteredDisplayOrders.length} orders
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

      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">
              {confirmAction.type === 'approve' ? 'Approve payment?' : 'Reject payment?'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {confirmAction.type === 'approve'
                ? 'Are you sure you want to approve this payment?'
                : 'Are you sure you want to reject this payment?'}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeConfirmModal}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${confirmAction.type === 'approve' ? 'bg-[#4091c9] hover:bg-[#2d75aa]' : 'bg-[#4091c9] hover:bg-[#2d75aa]'}`}
              >
                {confirmAction.type === 'approve' ? 'Yes, approve' : 'Yes, reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
