import { useEffect, useState } from 'react';
import { Thermometer, Droplets, Package, Truck, LayoutDashboard, Bell, ClipboardList, Boxes, Route, Menu, ArrowLeft, ArrowRight } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, database, db } from '../../services/firebase';

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState('overview');
  const [iotData, setIotData] = useState({
    temperature: 'Loading...',
    humidity: 'Loading...',
    waterLevel: 'Loading...',
    sacksProduced: 124,
    activeTrucks: 3,
  });
  const [allOrders, setAllOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [ordersPage, setOrdersPage] = useState(1);

  const ORDERS_PER_PAGE = 6;

  const formatDate = (value) => {
    if (!value) return 'N/A';

    const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);

    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
  };

  const totalOrderPages = Math.max(1, Math.ceil(allOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = allOrders.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE);
  const pendingOrders = allOrders.filter((order) => (order.status || '').toLowerCase() === 'placed').length;
  const completedOrders = allOrders.filter((order) => (order.status || '').toLowerCase() === 'completed').length;

  useEffect(() => {
    const iotRef = ref(database, 'IoT');

    const unsubscribe = onValue(iotRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const temp = data.Environment?.temperature;
        const hum = data.Environment?.humidity;
        const dist = data.WaterLevel?.distance;

        setIotData((prev) => ({
          ...prev,
          temperature: temp !== undefined ? `${temp.toFixed(1)}°C` : 'N/A',
          humidity: hum !== undefined ? `${hum.toFixed(1)}%` : 'N/A',
          waterLevel: dist !== undefined ? `${dist.toFixed(1)} cm` : 'N/A',
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setAllOrders([]);
        setOrdersLoading(false);
        setOrdersError('Please sign in to view orders.');
        return;
      }

      const ordersRef = collection(db, 'orders');
      const unsubscribeOrders = onSnapshot(
        ordersRef,
        (snapshot) => {
          const parsedOrders = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (b.createdAt?.toMillis?.() || b.createdAt || 0) - (a.createdAt?.toMillis?.() || a.createdAt || 0));

          setAllOrders(parsedOrders);
          setOrdersLoading(false);
          setOrdersError('');
        },
        (error) => {
          console.error('Unable to load orders', error);
          setOrdersError('Unable to load orders right now.');
          setOrdersLoading(false);
        }
      );

      return unsubscribeOrders;
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (ordersPage > totalOrderPages) {
      setOrdersPage(totalOrderPages);
    }
  }, [ordersPage, totalOrderPages]);

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-gray-200 bg-white p-6 shadow-sm md:flex">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-gray-800 tracking-tight">Bella Erin</h2>
          <Menu className="h-5 w-5 text-gray-400" />
        </div>

        <nav className="flex-1">
          <ul className="space-y-4">
            <li>
              <button
                type="button"
                onClick={() => setActiveView('overview')}
                className={`flex w-full items-center rounded-xl p-3 text-left transition-colors ${activeView === 'overview' ? 'bg-blue-50 font-bold text-[#4091c9]' : 'text-gray-600 hover:bg-blue-50/60 hover:text-[#4091c9]'}`}
              >
                <LayoutDashboard className="mr-3 h-5 w-5" />
                Overview
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveView('orders')}
                className={`flex w-full items-center rounded-xl p-3 text-left transition-colors ${activeView === 'orders' ? 'bg-blue-50 font-bold text-[#4091c9]' : 'text-gray-600 hover:bg-blue-50/60 hover:text-[#4091c9]'}`}
              >
                <ClipboardList className="mr-3 h-5 w-5" />
                Orders
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveView('inventory')}
                className={`flex w-full items-center rounded-xl p-3 text-left transition-colors ${activeView === 'inventory' ? 'bg-blue-50 font-bold text-[#4091c9]' : 'text-gray-600 hover:bg-blue-50/60 hover:text-[#4091c9]'}`}
              >
                <Boxes className="mr-3 h-5 w-5" />
                Inventory
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveView('deliveries')}
                className={`flex w-full items-center rounded-xl p-3 text-left transition-colors ${activeView === 'deliveries' ? 'bg-blue-50 font-bold text-[#4091c9]' : 'text-gray-600 hover:bg-blue-50/60 hover:text-[#4091c9]'}`}
              >
                <Route className="mr-3 h-5 w-5" />
                Deliveries
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveView('predictive')}
                className={`flex w-full items-center rounded-xl p-3 text-left transition-colors ${activeView === 'predictive' ? 'bg-blue-50 font-bold text-[#4091c9]' : 'text-gray-600 hover:bg-blue-50/60 hover:text-[#4091c9]'}`}
              >
                <LayoutDashboard className="mr-3 h-5 w-5" />
                Predictive Analysis
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveView('alerts')}
                className={`flex w-full items-center rounded-xl p-3 text-left transition-colors ${activeView === 'alerts' ? 'bg-blue-50 font-bold text-[#4091c9]' : 'text-gray-600 hover:bg-blue-50/60 hover:text-[#4091c9]'}`}
              >
                <Bell className="mr-3 h-5 w-5" />
                Alerts
              </button>
            </li>
          </ul>
        </nav>

        <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
          <p className="font-semibold">Live Operations</p>
          <p className="mt-1">Monitoring freezer, water, and delivery status in real time.</p>
        </div>
      </aside>

      <main className="ml-0 flex-1 overflow-x-hidden p-4 sm:p-8 md:ml-64">
        <div className="mx-auto max-w-6xl pb-8">
          {activeView === 'overview' ? (
            <>
              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border-b-4 border-red-500 bg-white p-6 shadow-md">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-500">Freezer Temp</h3>
                    <Thermometer className="h-6 w-6 text-red-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-800">{iotData.temperature}</p>
                  <p className="mt-2 text-sm text-gray-500">Humidity: {iotData.humidity}</p>
                </div>

                <div className="rounded-xl border-b-4 border-blue-500 bg-white p-6 shadow-md">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-500">Water Level (Dist)</h3>
                    <Droplets className="h-6 w-6 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-800">{iotData.waterLevel}</p> 
                </div>

                <div className="rounded-xl border-b-4 border-green-500 bg-white p-6 shadow-md">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-500">Current Stock</h3>
                    <Package className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-800">{iotData.sacksProduced}</p>
                </div>

                <div className="rounded-xl border-b-4 border-purple-500 bg-white p-6 shadow-md">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-500">Active Deliveries</h3>
                    <Truck className="h-6 w-6 text-purple-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-800">{iotData.activeTrucks}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-6 text-gray-400 shadow-md">
                  [ Production Trends Chart Placeholder ]
                </div>
                <div className="space-y-6">
                  <div className="overflow-y-auto rounded-xl bg-white p-6 shadow-md">
                    <h3 className="mb-4 text-xl font-bold text-gray-800">System Alerts</h3>
                    <ul className="space-y-3">
                      <li className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                        ℹ️ IoT System Connected. Live streaming active.
                      </li>
                      {parseFloat(iotData.temperature) > -5 && (
                        <li className="flex items-start rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                          ⚠️ WARNING: Freezer Temperature is getting too warm!
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 shadow-sm">
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-800">Predictive Analysis</h3>
                      <p className="mt-2 text-sm text-gray-500">Coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : activeView === 'orders' ? (
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
                <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                  Loading orders...
                </div>
              ) : allOrders.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
                  No orders have been placed yet.
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
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Items</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Total</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Placed</th>
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500">
                      Showing {Math.min((ordersPage - 1) * ORDERS_PER_PAGE + 1, allOrders.length)}-{Math.min(ordersPage * ORDERS_PER_PAGE, allOrders.length)} of {allOrders.length} orders
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOrdersPage((current) => Math.max(1, current - 1))}
                        disabled={ordersPage === 1}
                        className="flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                      </button>
                      <span className="text-sm font-semibold text-gray-700">Page {ordersPage} of {totalOrderPages}</span>
                      <button
                        type="button"
                        onClick={() => setOrdersPage((current) => Math.min(totalOrderPages, current + 1))}
                        disabled={ordersPage === totalOrderPages}
                        className="flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : activeView === 'inventory' ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-800">Inventory</h2>
              <p className="mt-2 text-gray-600">Monitor stock levels for all ice products.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                  <p className="font-semibold text-green-800">Tube Ice 50kg</p>
                  <p className="mt-1 text-sm text-green-700">124 sacks available</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="font-semibold text-blue-800">Crushed Ice Crates</p>
                  <p className="mt-1 text-sm text-blue-700">15 crates in stock</p>
                </div>
              </div>
            </div>
          ) : activeView === 'deliveries' ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-800">Deliveries</h2>
              <p className="mt-2 text-gray-600">Track active routes and delivery status.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                  <p className="font-semibold text-purple-800">Route 01</p>
                  <p className="mt-1 text-sm text-purple-700">On the way to Barangay San Pedro.</p>
                </div>
                <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4">
                  <p className="font-semibold text-yellow-800">Route 02</p>
                  <p className="mt-1 text-sm text-yellow-700">Scheduled for departure in 20 minutes.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-800">System Alerts</h2>
              <p className="mt-2 text-gray-600">All live alerts and operational notices appear here.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                  IoT system connected and streaming live data.
                </div>
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
                  Delivery routes are currently running on schedule.
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}