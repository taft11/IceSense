import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const DRIVER_ROLES = ['driver', 'delivery', 'deliverer'];
const FILTERS = {
  all: 'All orders',
  unassigned: 'Unassigned',
  assigned: 'Assigned',
};

export default function Deliveries() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmAssignment, setConfirmAssignment] = useState(null);
  const ORDERS_PER_PAGE = 6;

  useEffect(() => {
    const unsubscribeOrders = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const parsedOrders = snapshot.docs
          .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || b.createdAt || 0) - (a.createdAt?.toMillis?.() || a.createdAt || 0));

        setOrders(parsedOrders);
        setLoading(false);
      },
      (err) => {
        console.error('Unable to load orders', err);
        setError('Unable to load orders right now.');
        setLoading(false);
      }
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const parsedUsers = snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
        const profilesMap = parsedUsers.reduce((accumulator, user) => {
          accumulator[user.id] = user;
          return accumulator;
        }, {});
        const parsedDrivers = parsedUsers.filter((user) => DRIVER_ROLES.includes((user.role || '').toLowerCase().trim()));

        setUserProfiles(profilesMap);
        setDrivers(parsedDrivers);
      },
      (err) => {
        console.error('Unable to load drivers', err);
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeUsers();
    };
  }, []);

  const openAssignConfirm = (orderId, driverId) => {
    const selectedDriver = drivers.find((driver) => driver.id === driverId);
    setConfirmAssignment({ orderId, driverId, selectedDriver });
  };

  const closeAssignConfirm = () => {
    setConfirmAssignment(null);
  };

  const handleAssignDriver = async () => {
    if (!confirmAssignment?.orderId) return;

    const { orderId, driverId, selectedDriver } = confirmAssignment;

    try {
      setSavingOrderId(orderId);
      setError('');

      await updateDoc(doc(db, 'orders', orderId), {
        assignedDriverId: driverId || null,
        assignedDriverName: selectedDriver?.fullName || selectedDriver?.name || selectedDriver?.displayName || '',
        assignedDriverEmail: selectedDriver?.email || '',
        deliveryStatus: driverId ? 'Assigned' : 'Unassigned',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Unable to assign driver', err);
      setError('Unable to assign a driver right now.');
    } finally {
      setSavingOrderId(null);
      closeAssignConfirm();
    }
  };

  const isReadyForDelivery = (order) => {
    if (order?.readyForDelivery === true) return true;

    const paymentStatus = String(order?.paymentStatus || '').toLowerCase();
    return paymentStatus === 'paid' || paymentStatus === 'approved' || paymentStatus === 'payment_verified';
  };

  const assignedOrders = orders.filter((order) => isReadyForDelivery(order) && order.assignedDriverId).length;
  const visibleOrders = orders.filter((order) => {
    if (!isReadyForDelivery(order)) return false;
    if (activeFilter === 'assigned') return Boolean(order.assignedDriverId);
    if (activeFilter === 'unassigned') return !order.assignedDriverId;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / ORDERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = visibleOrders.slice((safePage - 1) * ORDERS_PER_PAGE, safePage * ORDERS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  const resolveOrderAddress = (order) => {
    if (order.shippingAddress) return order.shippingAddress;
    if (order.address) return order.address;
    if (order.deliveryAddress) return order.deliveryAddress;

    const userProfile = userProfiles[order.userId];
    if (!userProfile) return 'No delivery address provided';

    const addresses = Array.isArray(userProfile.addresses) ? userProfile.addresses : [];
    const defaultAddress = addresses.find((address) => address.isDefault) || addresses[0] || null;

    if (defaultAddress) {
      const parts = [defaultAddress.street, defaultAddress.city, defaultAddress.state, defaultAddress.postalCode, defaultAddress.country].filter(Boolean);
      return parts.join(', ');
    }

    if (userProfile.address) return userProfile.address;
    if (userProfile.shippingAddress) return userProfile.shippingAddress;

    return 'No delivery address provided';
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Delivery assignments</h2>
          <p className="mt-2 text-gray-600">Assign orders to specific Drivers</p>
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <p className="font-semibold">{assignedOrders} assigned / {visibleOrders.length} approved orders</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {Object.entries(FILTERS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeFilter === key ? 'bg-[#4091c9] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          Loading orders...
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
          No approved orders are available for delivery assignment yet.
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Order</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Address</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Driver</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedOrders.map((order) => {
                    const orderAddress = resolveOrderAddress(order);

                    return (
                      <tr key={order.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">#{order.id?.slice(0, 8).toUpperCase()}</p>
                          <p className="mt-1 text-xs text-gray-500">{order.createdAt ? 'Placed recently' : 'No date'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">{order.customerName || 'Unknown customer'}</p>
                          <p className="text-xs text-gray-500">{order.customerEmail || 'No email'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {orderAddress}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={order.assignedDriverId || ''}
                            onChange={(event) => openAssignConfirm(order.id, event.target.value)}
                            disabled={drivers.length === 0 || savingOrderId === order.id}
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#4091c9]"
                          >
                            <option value="">Select driver</option>
                            {drivers.map((driver) => (
                              <option key={driver.id} value={driver.id}>
                                {driver.fullName || driver.name || driver.displayName || driver.email || driver.id}
                              </option>
                            ))}
                          </select>
                          <p className="mt-2 text-xs text-gray-500">Choose a driver to confirm the assignment.</p>
                          {order.assignedDriverName && (
                            <p className="mt-1 text-xs text-gray-500">Assigned: {order.assignedDriverName}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${order.assignedDriverId ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {order.deliveryStatus || (order.assignedDriverId ? 'Assigned' : 'Unassigned')}
                          </span>
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
              Showing {Math.min((safePage - 1) * ORDERS_PER_PAGE + 1, visibleOrders.length)}-{Math.min(safePage * ORDERS_PER_PAGE, visibleOrders.length)} of {visibleOrders.length} orders
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safePage === 1}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm font-semibold text-gray-700">Page {safePage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safePage === totalPages}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {confirmAssignment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">Confirm driver assignment</h3>
            <p className="mt-2 text-sm text-gray-600">
              {confirmAssignment.selectedDriver
                ? `Assign this order to ${confirmAssignment.selectedDriver.fullName || confirmAssignment.selectedDriver.name || confirmAssignment.selectedDriver.displayName || confirmAssignment.selectedDriver.email || 'the selected driver'}?`
                : 'Remove the current driver assignment from this order?'}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeAssignConfirm}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignDriver}
                className="rounded-2xl bg-[#4091c9] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2d75aa]"
              >
                Yes, confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
