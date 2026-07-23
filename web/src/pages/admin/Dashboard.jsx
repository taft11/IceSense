import { useEffect, useState } from 'react';
import { Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Bell, ClipboardList, Boxes, Route as RouteIcon, Menu } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { collection, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, database, db } from '../../services/firebase';
import Overview from './Overview';
import Orders from './Orders';
import Inventory from './Inventory';
import Deliveries from './Deliveries';
import Alerts from './Alerts';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeView = location.pathname.includes('/orders')
    ? 'orders'
    : location.pathname.includes('/inventory')
    ? 'inventory'
    : location.pathname.includes('/deliveries')
    ? 'deliveries'
    : location.pathname.includes('/alerts')
    ? 'alerts'
    : 'overview';
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
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);

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
    let unsubscribeOrders = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAllOrders([]);
        setOrdersLoading(false);
        setOrdersError('Please sign in to view orders.');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const role = userDoc.exists() ? userDoc.data()?.role : null;

        if (role !== 'admin') {
          await signOut(auth);
          navigate('/admin-login', { replace: true });
          return;
        }
      } catch (error) {
        console.error('Unable to verify admin access', error);
        await signOut(auth);
        navigate('/admin-login', { replace: true });
        return;
      }

      const ordersRef = collection(db, 'orders');
      unsubscribeOrders = onSnapshot(
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
    });

    return () => {
      if (unsubscribeOrders) {
        unsubscribeOrders();
      }
      unsubscribeAuth();
    };
  }, [navigate]);

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

  const openConfirmModal = (order) => {
    setPendingOrder(order);
    setConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setConfirmModalOpen(false);
    setPendingOrder(null);
  };

  const handleConfirmOrder = async () => {
    if (!pendingOrder?.id) return;

    try {
      setConfirmingOrderId(pendingOrder.id);
      await updateDoc(doc(db, 'orders', pendingOrder.id), {
        status: 'Confirmed',
      });
      closeConfirmModal();
    } catch (error) {
      console.error('Unable to confirm order', error);
      setOrdersError('Unable to confirm order right now.');
    } finally {
      setConfirmingOrderId(null);
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
              <Link to="/admin/overview" className={`flex w-full items-center rounded-xl p-3 text-sm font-semibold transition-all ${activeView === 'overview' ? 'bg-[#4091c9] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <LayoutDashboard className="mr-3 h-5 w-5" /> Overview
              </Link>
            </li>
            <li>
              <Link to="/admin/orders" className={`flex w-full items-center rounded-xl p-3 text-sm font-semibold transition-all ${activeView === 'orders' ? 'bg-[#4091c9] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <ClipboardList className="mr-3 h-5 w-5" /> Orders
              </Link>
            </li>
            <li>
              <Link to="/admin/inventory" className={`flex w-full items-center rounded-xl p-3 text-sm font-semibold transition-all ${activeView === 'inventory' ? 'bg-[#4091c9] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <Boxes className="mr-3 h-5 w-5" /> Inventory
              </Link>
            </li>
            <li>
              <Link to="/admin/deliveries" className={`flex w-full items-center rounded-xl p-3 text-sm font-semibold transition-all ${activeView === 'deliveries' ? 'bg-[#4091c9] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <RouteIcon className="mr-3 h-5 w-5" /> Deliveries
              </Link>
            </li>
            <li>
              <Link to="/admin/alerts" className={`flex w-full items-center rounded-xl p-3 text-sm font-semibold transition-all ${activeView === 'alerts' ? 'bg-[#4091c9] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <Bell className="mr-3 h-5 w-5" /> Alerts
              </Link>
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
          <Routes>
            <Route index element={<Overview iotData={iotData} todayDate={todayDate} />} />
            <Route path="overview" element={<Overview iotData={iotData} todayDate={todayDate} />} />
            <Route
              path="orders"
              element={
                <Orders
                  allOrders={allOrders}
                  ordersLoading={ordersLoading}
                  ordersError={ordersError}
                  paginatedOrders={paginatedOrders}
                  pendingOrders={pendingOrders}
                  completedOrders={completedOrders}
                  ordersPage={ordersPage}
                  totalOrderPages={totalOrderPages}
                  setOrdersPage={setOrdersPage}
                  openConfirmModal={openConfirmModal}
                  confirmingOrderId={confirmingOrderId}
                  formatDate={formatDate}
                />
              }
            />
            <Route path="inventory" element={<Inventory />} />
            <Route path="deliveries" element={<Deliveries />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="*" element={<Overview iotData={iotData} todayDate={todayDate} />} />
          </Routes>
        </div>
      </main>

      {confirmModalOpen && pendingOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#4091c9]">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Confirm this order?</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              This will mark order <span className="font-semibold text-gray-900">#{pendingOrder.id?.slice(0, 8).toUpperCase()}</span> as <span className="font-semibold text-[#4091c9]">Confirmed</span>.
            </p>
            <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
              <p className="font-semibold text-gray-800">Customer</p>
              <p className="mt-1">{pendingOrder.customerName || 'Unknown customer'}</p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeConfirmModal}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={confirmingOrderId === pendingOrder.id}
                className="rounded-xl bg-[#4091c9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d75aa] disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {confirmingOrderId === pendingOrder.id ? 'Confirming...' : 'Yes, confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}