import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Thermometer, Droplets, Package, Truck, LayoutDashboard, Bell, 
  ClipboardList, Boxes, Route, Menu, ArrowLeft, ArrowRight, 
  Calendar, TrendingUp, AlertTriangle, Activity
} from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, database, db } from '../../services/firebase';

export default function AdminDashboard() {
  const navigate = useNavigate();
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

  // Get today's date for the modern header
  const todayDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric' 
  });

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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/admin-login', { replace: true });
    } catch (error) {
      console.error('Sign out failed', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-sans text-gray-800">
      
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-gray-200 bg-white p-6 shadow-sm md:flex">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Bella Erin<span className="text-[#4091c9]">.</span></h2>
          <Menu className="h-5 w-5 text-gray-400" />
        </div>

        <nav className="flex-1">
          <ul className="space-y-2">
            <li>
              <button onClick={() => setActiveView('overview')} className={`flex w-full items-center rounded-xl p-3 text-sm font-semibold transition-all ${activeView === 'overview' ? 'bg-[#4091c9] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <LayoutDashboard className="mr-3 h-5 w-5" /> Overview
              </button>
            </li>
            <li>
              <button onClick={() => setActiveView('orders')} className={`flex w-full items-center rounded-xl p-3 text-sm font-semibold transition-all ${activeView === 'orders' ? 'bg-[#4091c9] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <ClipboardList className="mr-3 h-5 w-5" /> Orders
              </button>
            </li>
            <li>
              <button onClick={() => setActiveView('inventory')} className={`flex w-full items-center rounded-xl p-3 text-sm font-semibold transition-all ${activeView === 'inventory' ? 'bg-[#4091c9] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <Boxes className="mr-3 h-5 w-5" /> Inventory
              </button>
            </li>
            <li>
              <button onClick={() => setActiveView('deliveries')} className={`flex w-full items-center rounded-xl p-3 text-sm font-semibold transition-all ${activeView === 'deliveries' ? 'bg-[#4091c9] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <Route className="mr-3 h-5 w-5" /> Deliveries
              </button>
            </li>
            <li>
              <button onClick={() => setActiveView('alerts')} className={`flex w-full items-center rounded-xl p-3 text-sm font-semibold transition-all ${activeView === 'alerts' ? 'bg-[#4091c9] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <Bell className="mr-3 h-5 w-5" /> Alerts
              </button>
            </li>
          </ul>
        </nav>

        <div className="mt-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 border border-blue-100/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <p className="font-bold text-sm text-blue-900">System Online</p>
          </div>
          <p className="text-xs text-blue-700 leading-relaxed">Live monitoring is active across all facility sensors.</p>
        </div>

        <div className="mt-6">
          <button onClick={handleSignOut} className="w-full rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm font-semibold hover:bg-red-100">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-0 flex-1 overflow-x-hidden p-4 sm:p-8 md:ml-64">
        <div className="mx-auto max-w-6xl pb-12">
          
          {activeView === 'overview' ? (
            <div className="animate-fade-in overview-page">
              
              {/* Top Header */}
              <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard Overview</h1>
                  <p className="mt-2 text-gray-500 font-medium">Welcome back! Here is what's happening at the facility today.</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm border border-gray-200">
                  <Calendar className="h-4 w-4 text-[#4091c9]" />
                  {todayDate}
                </div>
              </div>

              {/* Modern KPI Cards */}
              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                
                {/* Temp Card */}
                <div className="group rounded-3xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500 group-hover:scale-110 transition-transform">
                      <Thermometer className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">Live</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Freezer Temp</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-black text-gray-900">{iotData.temperature}</p>
                      <span className="text-sm font-medium text-gray-400">/ -18°C Target</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                      <Droplets className="h-4 w-4" />
                      <span>Humidity: {iotData.humidity}</span>
                    </div>
                  </div>
                </div>

                {/* Water Level Card */}
                <div className="group rounded-3xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 group-hover:scale-110 transition-transform">
                      <Droplets className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">Live</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Water Tank Level</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-black text-gray-900">{iotData.waterLevel}</p>
                    </div>
                  </div>
                </div>

                {/* Stock Card */}
                <div className="group rounded-3xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 group-hover:scale-110 transition-transform">
                      <Package className="h-6 w-6" />
                    </div>
                    <span className="flex items-center text-xs font-bold text-emerald-500"><TrendingUp className="w-3 h-3 mr-1"/> +12%</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total Stock Produced</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-black text-gray-900">{iotData.sacksProduced}</p>
                      <span className="text-sm font-medium text-gray-400">Sacks</span>
                    </div>
                  </div>
                </div>

                {/* Trucks Card */}
                <div className="group rounded-3xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-500 group-hover:scale-110 transition-transform">
                      <Truck className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Active Deliveries</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-black text-gray-900">{iotData.activeTrucks}</p>
                      <span className="text-sm font-medium text-gray-400">On Route</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Lower Section (Charts & Alerts) */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                
                {/* CSS Mock Chart (Takes up 2 columns) */}
                <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm lg:col-span-2">
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Production vs Demand</h3>
                      <p className="text-sm text-gray-500 mt-1">Weekly volume analysis</p>
                    </div>
                    <select className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 outline-none">
                      <option>This Week</option>
                      <option>Last Week</option>
                    </select>
                  </div>
                  
                  {/* The Bar Chart */}
                  <div className="flex h-56 items-end justify-between gap-2 sm:gap-6">
                    {[45, 65, 35, 80, 55, 90, 100].map((height, i) => (
                      <div key={i} className="group relative flex w-full flex-col justify-end h-full">
                        {/* Hover Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs font-bold py-1 px-2 rounded">
                          {height}k
                        </div>
                        {/* Bar */}
                        <div className="w-full rounded-t-lg bg-[#4091c9]/10 relative h-full">
                           <div 
                             style={{ height: `${height}%` }} 
                             className="absolute bottom-0 w-full rounded-t-lg bg-[#4091c9] transition-all duration-700 group-hover:bg-[#2d75aa]"
                           ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* X-Axis Labels */}
                  <div className="mt-4 flex justify-between text-xs font-bold text-gray-400">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                  </div>
                </div>

                {/* Right Column: Predictive & Alerts */}
                <div className="flex flex-col gap-6 lg:col-span-1">
                  
                  {/* Predictive AI Card */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4091c9] to-[#205a82] p-8 text-white shadow-lg">
                    <div className="absolute -right-4 -top-4 opacity-10">
                      <Activity className="h-32 w-32" />
                    </div>
                    <div className="relative z-10">
                      <div className="mb-4 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-md border border-white/10">
                        ✨ AI Forecast
                      </div>
                      <h3 className="mb-2 text-xl font-bold">Demand Spike Alert</h3>
                      <p className="mb-6 text-sm text-blue-100 leading-relaxed">
                        Based on incoming weather data, ice demand is predicted to rise by <strong className="text-white">25%</strong> this weekend.
                      </p>
                      <button className="w-full rounded-xl bg-white text-[#205a82] py-3 text-sm font-bold shadow-md hover:bg-gray-50 transition-colors">
                        Adjust Production
                      </button>
                    </div>
                  </div>

                  {/* System Alerts */}
                  <div className="flex-1 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center text-lg font-bold text-gray-900">
                      <Bell className="mr-2 h-5 w-5 text-gray-400" /> Recent Alerts
                    </h3>
                    <div className="space-y-4">
                      
                      {/* Warning Alert (Dynamic based on temp) */}
                      {parseFloat(iotData.temperature) > -5 && (
                        <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 border border-red-100">
                          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-red-800">Freezer Warning</p>
                            <p className="text-xs text-red-600 mt-1">Temperature has risen above -5°C. Check door seals.</p>
                          </div>
                        </div>
                      )}

                      {/* Standard Alert */}
                      <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 border border-gray-100">
                        <div className="h-2 w-2 mt-1.5 rounded-full bg-blue-500 shrink-0"></div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">Target Reached</p>
                          <p className="text-xs text-gray-500 mt-1">Production hit daily goal of 100 sacks.</p>
                          <p className="text-[10px] text-gray-400 mt-2 font-semibold uppercase">2 hours ago</p>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </div>
          ) : activeView === 'orders' ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              {/* Order content remains exactly as before */}
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
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}