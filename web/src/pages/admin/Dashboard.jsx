import { useEffect, useState } from 'react';
import { Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Menu, TrendingUp } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { collection, doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, database, db } from '../../services/firebase';
import Overview from './Overview';
import Orders from './Orders';
import Inventory from './Inventory';
import Deliveries from './Deliveries';
import DemandForecastPage from './DemandForecastPage';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeView = location.pathname.includes('/orders')
    ? 'orders'
    : location.pathname.includes('/inventory')
    ? 'inventory'
    : location.pathname.includes('/deliveries')
    ? 'deliveries'
    : location.pathname.includes('/forecast')
    ? 'forecast'
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
  const [verificationLoadingId, setVerificationLoadingId] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRejectOrder, setSelectedRejectOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [adminUid, setAdminUid] = useState(null);
  const [activeOrderFilter, setActiveOrderFilter] = useState('pending_payment');

  const ORDERS_PER_PAGE = 10;

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

  const getOrderStatusKey = (order) => {
    const normalizedStatus = (order.status || '').toLowerCase();
    const paymentStatus = (order.paymentStatus || '').toLowerCase();

    if (normalizedStatus === 'cancelled' || normalizedStatus === 'rejected' || paymentStatus === 'rejected') {
      return 'cancelled';
    }

    if (paymentStatus === 'pending_payment_verification' || paymentStatus === 'pending') {
      return 'pending_payment';
    }

    if (
      normalizedStatus === 'delivered' ||
      normalizedStatus === 'completed' ||
      normalizedStatus === 'done' ||
      normalizedStatus === 'finished' ||
      normalizedStatus === 'delivery completed' ||
      paymentStatus === 'delivered'
    ) {
      return 'delivered';
    }

    if (normalizedStatus === 'processing' || paymentStatus === 'paid') {
      return 'processing';
    }

    return 'pending_payment';
  };

  const filteredOrders = allOrders.filter((order) => {
    if (activeOrderFilter === 'processing') {
      return getOrderStatusKey(order) === 'processing';
    }
    if (activeOrderFilter === 'delivered') {
      return getOrderStatusKey(order) === 'delivered';
    }
    if (activeOrderFilter === 'cancelled') {
      return getOrderStatusKey(order) === 'cancelled';
    }
    return getOrderStatusKey(order) === 'pending_payment';
  });

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = filteredOrders.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE);
  const pendingOrders = allOrders.filter((order) => getOrderStatusKey(order) === 'pending_payment').length;
  const processingOrders = allOrders.filter((order) => getOrderStatusKey(order) === 'processing').length;
  const deliveredOrders = allOrders.filter((order) => getOrderStatusKey(order) === 'delivered').length;
  const cancelledOrders = allOrders.filter((order) => getOrderStatusKey(order) === 'cancelled').length;
  const completedOrders = processingOrders + deliveredOrders;
  const unassignedDeliveries = allOrders.filter((order) => !order.assignedDriverId).length;

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

        setAdminUid(user.uid);
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

  useEffect(() => {
    setOrdersPage(1);
  }, [activeOrderFilter]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/admin-login', { replace: true });
    } catch (error) {
      console.error('Sign out failed', error);
    }
  };

  const openReceiptPreview = (receiptUrl) => {
    setReceiptPreviewUrl(receiptUrl);
  };

  const closeReceiptPreview = () => {
    setReceiptPreviewUrl(null);
  };

  const openRejectModal = (order) => {
    setSelectedRejectOrder(order);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setRejectModalOpen(false);
    setSelectedRejectOrder(null);
    setRejectReason('');
  };

  const handleApprovePayment = async (order) => {
    if (!order?.id) return;
    try {
      setVerificationLoadingId(order.id);
      await updateDoc(doc(db, 'orders', order.id), {
        paymentStatus: 'PAID',
        status: 'Processing',
        verifiedAt: serverTimestamp(),
        verifiedBy: adminUid || null,
        adminNotes: '',
      });
    } catch (error) {
      console.error('Unable to approve payment', error);
      setOrdersError('Unable to approve payment right now.');
    } finally {
      setVerificationLoadingId(null);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedRejectOrder?.id) return;
    try {
      setVerificationLoadingId(selectedRejectOrder.id);
      await updateDoc(doc(db, 'orders', selectedRejectOrder.id), {
        paymentStatus: 'REJECTED',
        status: 'Cancelled',
        verifiedAt: serverTimestamp(),
        verifiedBy: adminUid || null,
        adminNotes: rejectReason || 'No reason provided.',
      });
      closeRejectModal();
    } catch (error) {
      console.error('Unable to reject payment', error);
      setOrdersError('Unable to reject payment right now.');
    } finally {
      setVerificationLoadingId(null);
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
          <ul className="space-y-1.5">
            <li>
              <Link to="/admin/overview" className={`flex w-full items-center justify-between rounded-r-xl border-l-4 px-3 py-2.5 text-sm transition-all ${activeView === 'overview' ? 'border-sky-600 bg-sky-50/60 text-sky-700 font-semibold' : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>
                <span>Overview</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/orders" className={`flex w-full items-center justify-between rounded-r-xl border-l-4 px-3 py-2.5 text-sm transition-all ${activeView === 'orders' ? 'border-sky-600 bg-sky-50/60 text-sky-700 font-semibold' : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>
                <span>Orders</span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {pendingOrders || 3}
                </span>
              </Link>
            </li>
            <li>
              <Link to="/admin/inventory" className={`flex w-full items-center justify-between rounded-r-xl border-l-4 px-3 py-2.5 text-sm transition-all ${activeView === 'inventory' ? 'border-sky-600 bg-sky-50/60 text-sky-700 font-semibold' : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>
                <span>Inventory</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/deliveries" className={`flex w-full items-center justify-between rounded-r-xl border-l-4 px-3 py-2.5 text-sm transition-all ${activeView === 'deliveries' ? 'border-sky-600 bg-sky-50/60 text-sky-700 font-semibold' : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>
                <span>Deliveries</span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  {unassignedDeliveries}
                </span>
              </Link>
            </li>
            <li>
              <Link to="/admin/forecast" className={`flex w-full items-center justify-between rounded-r-xl border-l-4 px-3 py-2.5 text-sm transition-all ${activeView === 'forecast' ? 'border-sky-600 bg-sky-50/60 text-sky-700 font-semibold' : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>
                <span>Predictive Analysis</span>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                  1
                </span>
              </Link>
            </li>
          </ul>
        </nav>

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
                  ordersLoading={ordersLoading}
                  ordersError={ordersError}
                  paginatedOrders={paginatedOrders}
                  pendingOrders={pendingOrders}
                  processingOrders={processingOrders}
                  deliveredOrders={deliveredOrders}
                  cancelledOrders={cancelledOrders}
                  completedOrders={completedOrders}
                  ordersPage={ordersPage}
                  totalOrderPages={totalOrderPages}
                  setOrdersPage={setOrdersPage}
                  activeOrderFilter={activeOrderFilter}
                  setActiveOrderFilter={setActiveOrderFilter}
                  formatDate={formatDate}
                  verificationLoadingId={verificationLoadingId}
                  onApprovePayment={handleApprovePayment}
                  onOpenReceiptPreview={openReceiptPreview}
                  onOpenRejectModal={openRejectModal}
                />
              }
            />
            <Route path="inventory" element={<Inventory />} />
            <Route path="deliveries" element={<Deliveries />} />
            <Route path="forecast" element={<DemandForecastPage />} />
            <Route path="*" element={<Overview iotData={iotData} todayDate={todayDate} />} />
          </Routes>
        </div>
      </main>

      {receiptPreviewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 px-4 py-8">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <button
              onClick={closeReceiptPreview}
              className="absolute right-4 top-4 rounded-full bg-white p-3 text-gray-500 shadow hover:bg-gray-50"
            >
              ×
            </button>
            <img src={receiptPreviewUrl} alt="Receipt preview" className="h-[80vh] w-full object-contain bg-gray-100" />
          </div>
        </div>
      )}

      {rejectModalOpen && selectedRejectOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">Reject Payment</h3>
            <p className="mt-2 text-sm text-gray-600">
              Provide a reason why payment for order <span className="font-semibold">#{selectedRejectOrder.id?.slice(0, 8).toUpperCase()}</span> is rejected.
            </p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              className="mt-4 w-full rounded-3xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 outline-none focus:border-[#4091c9] focus:ring-2 focus:ring-sky-100"
              placeholder="Reason for rejection (e.g. blurry screenshot, amount mismatch)"
            />
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeRejectModal}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPayment}
                disabled={verificationLoadingId === selectedRejectOrder.id}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {verificationLoadingId === selectedRejectOrder.id ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}