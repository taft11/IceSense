const REJECTION_REASON_OPTIONS = [
  'Blurry or unreadable payment proof',
  'Payment amount does not match the order total',
  'Invalid or fake payment proof',
  'Receipt reference number is missing or invalid',
  'Payment could not be verified',
  'Other',
];
import { useEffect, useRef, useState } from 'react';
import { Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { addDoc, collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, database, db } from '../../services/firebase';
import Overview from './Overview';
import Orders from './Orders';
import { restoreCancelledOrderStock } from './orderStock';
import Inventory from './Inventory';
import Deliveries from './Deliveries';
import DemandForecastPage from './DemandForecastPage';
import RevenueReports from './RevenueReports';
import AdminNotificationBell from './components/AdminNotificationBell';

const ENVIRONMENT_SAMPLE_INTERVAL_MS = 5 * 60 * 1000;
const FREEZER_TOO_WARM_THRESHOLD = -15;
const SENSOR_EMPTY_DISTANCE = 58;
const SENSOR_FULL_DISTANCE = 25;

const getWaterPercent = (distance) => {
  if (!Number.isFinite(distance)) return null;
  if (distance <= SENSOR_FULL_DISTANCE) return 100;
  if (distance >= SENSOR_EMPTY_DISTANCE) return 0;
  return Math.max(0, Math.min(((SENSOR_EMPTY_DISTANCE - distance) / (SENSOR_EMPTY_DISTANCE - SENSOR_FULL_DISTANCE)) * 100, 100));
};

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
    : location.pathname.includes('/revenue-reports')
    ? 'revenue-reports'
    : 'overview';
  const isOrdersSectionActive = activeView === 'orders' || activeView === 'deliveries';
  const [iotData, setIotData] = useState({
    temperature: 'Loading...',
    humidity: 'Loading...',
    waterLevel: 'Loading...',
    waterDistance: null,
    temperatureUpdatedAt: null,
    waterLevelUpdatedAt: null,
    stockProducedKg: 0,
    activeTrucks: 3,
  });
  const [allOrders, setAllOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [ordersPage, setOrdersPage] = useState(1);
  const [verificationLoadingId, setVerificationLoadingId] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRejectOrder, setSelectedRejectOrder] = useState(null);
  const [rejectReasonType, setRejectReasonType] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [adminUid, setAdminUid] = useState(null);
  const [activeOrderFilter, setActiveOrderFilter] = useState('pending_payment');
  const [activeDateFilter, setActiveDateFilter] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [environmentHistory, setEnvironmentHistory] = useState([]);
  const lastEnvironmentSampleRef = useRef(null);
  const lastEnvironmentSavedAtRef = useRef(null);

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

  const toLocalDateKey = (value) => {
    if (!value) return null;

    const date = typeof value?.toDate === 'function'
      ? value.toDate()
      : value instanceof Date
        ? value
        : new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const getOrderStatusKey = (order) => {
    const normalizedStatus = (order.status || '').toLowerCase();
    const paymentStatus = (order.paymentStatus || '').toLowerCase();
    const pickupStatus = (order.pickupStatus || '').toLowerCase();
    const hasRescheduleRequest = Boolean(order.isRescheduledOrder || order.rescheduleRequestedAt || order.rescheduledAt);

    if (
      !hasRescheduleRequest
      && (normalizedStatus === 'failed' || paymentStatus === 'failed')
    ) {
      return 'failed';
    }

    if (
      normalizedStatus === 'cancelled'
      || normalizedStatus === 'rejected'
      || paymentStatus === 'rejected'
    ) {
      return 'cancelled';
    }

    if (
      (paymentStatus === 'pending_payment_verification' || paymentStatus === 'pending') &&
      order.deliveryDate
    ) {
      const deliveryDate = new Date(`${order.deliveryDate}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!Number.isNaN(deliveryDate.getTime()) && deliveryDate < today) {
        return 'cancelled';
      }
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
      paymentStatus === 'delivered' ||
      normalizedStatus === 'picked up' ||
      pickupStatus === 'picked up'
    ) {
      return 'completed';
    }

    if (normalizedStatus === 'processing' || paymentStatus === 'paid') {
      return 'processing';
    }

    return 'pending_payment';
  };

  const getOrderDateValue = (order) => {
    if (order?.deliveryDate) {
      const scheduledDate = new Date(`${order.deliveryDate}T00:00:00`);
      if (!Number.isNaN(scheduledDate.getTime())) {
        return toLocalDateKey(scheduledDate);
      }
    }

    if (!order?.createdAt) return null;

    const createdAt = typeof order.createdAt?.toDate === 'function'
      ? order.createdAt.toDate()
      : order.createdAt instanceof Date
        ? order.createdAt
        : new Date(order.createdAt);

    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }

    return toLocalDateKey(createdAt);
  };

  const getOrderScheduleTimestamp = (order) => {
    if (!order?.deliveryDate) return Number.POSITIVE_INFINITY;

    const scheduledDate = new Date(`${order.deliveryDate}T00:00:00`);
    return Number.isNaN(scheduledDate.getTime()) ? Number.POSITIVE_INFINITY : scheduledDate.getTime();
  };

  const filteredOrders = allOrders.filter((order) => {
    const matchesStatus = (() => {
      if (activeOrderFilter === 'all') {
        return true;
      }
      if (activeOrderFilter === 'processing') {
        return getOrderStatusKey(order) === 'processing';
      }
      if (activeOrderFilter === 'completed') {
        return getOrderStatusKey(order) === 'completed';
      }
      if (activeOrderFilter === 'failed') {
        return getOrderStatusKey(order) === 'failed';
      }
      if (activeOrderFilter === 'cancelled') {
        return getOrderStatusKey(order) === 'cancelled';
      }
      return getOrderStatusKey(order) === 'pending_payment';
    })();

    const matchesDate = !activeDateFilter || getOrderDateValue(order) === activeDateFilter;

    return matchesStatus && matchesDate;
  });

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const safeOrdersPage = Math.min(ordersPage, totalOrderPages);
  const paginatedOrders = filteredOrders.slice((safeOrdersPage - 1) * ORDERS_PER_PAGE, safeOrdersPage * ORDERS_PER_PAGE);
  const pendingOrders = allOrders.filter((order) => getOrderStatusKey(order) === 'pending_payment').length;
  const pendingOrderItems = allOrders.filter((order) => getOrderStatusKey(order) === 'pending_payment');
  const processingOrders = allOrders.filter((order) => getOrderStatusKey(order) === 'processing').length;
  const completedOrders = allOrders.filter((order) => getOrderStatusKey(order) === 'completed').length;
  const failedOrders = allOrders.filter((order) => getOrderStatusKey(order) === 'failed').length;
  const cancelledOrders = allOrders.filter((order) => getOrderStatusKey(order) === 'cancelled').length;
  const unassignedDeliveries = allOrders.filter((order) => {
    const fulfillmentMethod = String(order?.fulfillment_type || order?.fulfillmentMethod || order?.deliveryType || '').toLowerCase();
    const paymentStatus = String(order?.paymentStatus || '').toLowerCase();
    const isDeliveryOrder = !fulfillmentMethod.includes('pickup');
    const isReadyForDelivery = order?.readyForDelivery === true
      || ['paid', 'approved', 'payment_verified'].includes(paymentStatus);

    return isDeliveryOrder && isReadyForDelivery && !order.assignedDriverId;
  }).length;
  const todaysOrdersCount = allOrders.filter((order) => {
    const orderDate = getOrderDateValue(order) || (order?.createdAt ? toLocalDateKey(order.createdAt?.toDate?.() || order.createdAt) : null);
    const todayDateKey = toLocalDateKey(new Date());
    return orderDate === todayDateKey;
  }).length;

  useEffect(() => {
    const iotRef = ref(database, 'IoT');
    const inventoryRef = ref(database, 'inventory/scale_1');
    const environmentLogsQuery = query(collection(db, 'environment_logs'), orderBy('recordedAt', 'desc'), limit(300));

    const unsubscribeEnvironmentLogs = onSnapshot(environmentLogsQuery, (snapshot) => {
      setEnvironmentHistory(snapshot.docs.map((documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data(),
      })));
    }, (error) => {
      console.error('Unable to load environment history', error);
    });

    const unsubscribeIot = onValue(iotRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const temp = Number(data.Environment?.temperature);
        const hum = Number(data.Environment?.humidity);
        const dist = Number(data.WaterLevel?.distance);
        const nextTemperature = Number.isFinite(temp) ? `${temp.toFixed(1)}°C` : 'N/A';
        const nextWaterLevel = Number.isFinite(dist) ? `${dist.toFixed(1)} cm` : 'N/A';
        const snapshotTimestamp = Date.now();
        const waterPercent = getWaterPercent(dist);
        const temperatureCritical = Number.isFinite(temp) && temp > FREEZER_TOO_WARM_THRESHOLD;
        const waterLevelCritical = waterPercent === 0;
        const previousSample = lastEnvironmentSampleRef.current;
        const hasSampleIntervalElapsed = !lastEnvironmentSavedAtRef.current
          || snapshotTimestamp - lastEnvironmentSavedAtRef.current >= ENVIRONMENT_SAMPLE_INTERVAL_MS;
        const criticalValueReached = (temperatureCritical && !previousSample?.temperatureCritical)
          || (waterLevelCritical && !previousSample?.waterLevelCritical);

        if (hasSampleIntervalElapsed || criticalValueReached) {
          lastEnvironmentSavedAtRef.current = snapshotTimestamp;
          addDoc(collection(db, 'environment_logs'), {
            temperature: Number.isFinite(temp) ? temp : null,
            humidity: Number.isFinite(hum) ? hum : null,
            waterDistance: Number.isFinite(dist) ? dist : null,
            waterPercent,
            temperatureCritical,
            waterLevelCritical,
            recordedAt: serverTimestamp(),
            source: 'firebase_iot',
          }).catch((error) => {
            console.error('Unable to save environment history', error);
          });
        }

        lastEnvironmentSampleRef.current = {
          temperatureCritical,
          waterLevelCritical,
        };

        setIotData((prev) => ({
          ...prev,
          temperature: nextTemperature,
          humidity: Number.isFinite(hum) ? `${hum.toFixed(1)}%` : 'N/A',
          // raw numeric distance (cm) from sensor to water surface
          waterDistance: Number.isFinite(dist) ? dist : null,
          // legacy/secondary textual display preserved
          waterLevel: nextWaterLevel,
          temperatureUpdatedAt: prev.temperature === nextTemperature ? prev.temperatureUpdatedAt : snapshotTimestamp,
          waterLevelUpdatedAt: prev.waterLevel === nextWaterLevel ? prev.waterLevelUpdatedAt : snapshotTimestamp,
        }));
      }
    });

    const unsubscribeInventory = onValue(inventoryRef, (snapshot) => {
      const value = snapshot.val();
      const scaleSections = {
        tube: value?.tube_ice || {},
        crushed: value?.crushed_ice || {},
      };

      const totalKg = ['tube', 'crushed'].reduce((sum, type) => {
        const section = scaleSections[type] || {};
        const breakdown = section.sacks_breakdown || {};
        const weights = [
          { key: '5kg_sacks', weight: 5 },
          { key: '35kg_sacks', weight: 35 },
          { key: '50kg_sacks', weight: 50 },
        ];

        return sum + weights.reduce((sectionSum, item) => {
          const count = Number(breakdown?.[item.key] ?? 0);
          return sectionSum + (count * item.weight);
        }, 0);
      }, 0);

      setIotData((prev) => ({
        ...prev,
        stockProducedKg: totalKg,
      }));
    });

    return () => {
      unsubscribeIot();
      unsubscribeInventory();
      unsubscribeEnvironmentLogs();
    };
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

      let normalizedRole;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const role = userDoc.exists() ? userDoc.data()?.role : null;

        normalizedRole = String(role || '').toLowerCase();
        if (!['admin', 'owner'].includes(normalizedRole)) {
          await signOut(auth);
          navigate('/admin-login', { replace: true });
          return;
        }

        setUserRole(normalizedRole);
        setAdminUid(user.uid);
      } catch (error) {
        console.error('Unable to verify admin access', error);
        await signOut(auth);
        navigate('/admin-login', { replace: true });
        return;
      }

      if (!['admin', 'owner'].includes(normalizedRole)) {
        setOrdersLoading(false);
        return;
      }

      const ordersRef = collection(db, 'orders');
      unsubscribeOrders = onSnapshot(
        ordersRef,
        (snapshot) => {
          const parsedOrders = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((order) => Array.isArray(order.items) && order.items.length > 0)
            .sort((a, b) => {
              const scheduleDifference = getOrderScheduleTimestamp(b) - getOrderScheduleTimestamp(a);
              if (scheduleDifference !== 0) return scheduleDifference;

              return (b.createdAt?.toMillis?.() || b.createdAt || 0) - (a.createdAt?.toMillis?.() || a.createdAt || 0);
            });

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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/admin-login', { replace: true });
    } catch (error) {
      console.error('Sign out failed', error);
    }
  };

  const openReceiptPreview = (receiptUrl, order = null) => {
    setReceiptPreview({ url: receiptUrl, order });
  };

  const closeReceiptPreview = () => {
    setReceiptPreview(null);
  };

  const openRejectModal = (order) => {
    setSelectedRejectOrder(order);
    setRejectReasonType('');
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setRejectModalOpen(false);
    setSelectedRejectOrder(null);
    setRejectReasonType('');
    setRejectReason('');
  };

  const handleApprovePayment = async (order) => {
    if (!order?.id) return;
    try {
      setVerificationLoadingId(order.id);
      await updateDoc(doc(db, 'orders', order.id), {
        paymentStatus: 'PAID',
        status: 'Order Confirmed',
        readyForDelivery: true,
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
    const reason = [rejectReasonType, rejectReason.trim()].filter(Boolean).join(': ');
    if (!rejectReasonType || (rejectReasonType === 'Other' && !rejectReason.trim())) return;

    try {
      setVerificationLoadingId(selectedRejectOrder.id);
      await restoreCancelledOrderStock(selectedRejectOrder);
      await updateDoc(doc(db, 'orders', selectedRejectOrder.id), {
        paymentStatus: 'REJECTED',
        status: 'Cancelled',
        readyForDelivery: false,
        verifiedAt: serverTimestamp(),
        verifiedBy: adminUid || null,
        adminNotes: reason,
      });
      closeRejectModal();
    } catch (error) {
      console.error('Unable to reject payment', error);
      setOrdersError('Unable to reject payment right now.');
    } finally {
      setVerificationLoadingId(null);
    }
  };

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileMenuOpen]);

  return (
  <div className="flex min-h-screen bg-[#f8f9fa] font-sans text-gray-800">
      <header className="admin-mobile-header flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm md:hidden">
        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Close admin navigation' : 'Open admin navigation'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
          className="rounded-xl p-3 text-gray-700 transition hover:bg-sky-50 hover:text-[#4091c9]"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h2 className="text-xl font-black tracking-tighter text-gray-900">Bella Erin<span className="text-[#4091c9]">.</span></h2>
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-[60] bg-slate-900/30 md:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-[80] flex w-[min(18rem,calc(100vw-1rem))] flex-col border-r border-gray-200 bg-white p-6 shadow-xl transition-transform duration-300 md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tighter text-gray-900">Bella Erin<span className="text-[#4091c9]">.</span></h2>
          <button type="button" aria-label="Close admin navigation" onClick={() => setMobileMenuOpen(false)} className="rounded-xl p-2 text-gray-500 hover:bg-slate-50">
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1">
          <ul className="space-y-1.5">
            <li><Link onClick={() => setMobileMenuOpen(false)} to="/admin/overview" className={`flex w-full rounded-r-xl border-l-4 px-3 py-3 text-sm ${activeView === 'overview' ? 'border-sky-600 bg-sky-50/60 font-semibold text-sky-700' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}>Overview</Link></li>
            <li><Link onClick={() => setMobileMenuOpen(false)} to="/admin/orders" className={`flex w-full items-center justify-between rounded-r-xl border-l-4 px-3 py-3 text-sm ${isOrdersSectionActive && activeView === 'orders' ? 'border-sky-600 bg-sky-50/60 font-semibold text-sky-700' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}><span>Orders</span><span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{pendingOrders || 3}</span></Link></li>
            <li><Link onClick={() => setMobileMenuOpen(false)} to="/admin/deliveries" className={`flex w-full items-center justify-between rounded-r-xl border-l-4 px-3 py-3 text-sm ${isOrdersSectionActive && activeView === 'deliveries' ? 'border-sky-600 bg-sky-50/60 font-semibold text-sky-700' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}><span>Handover & Shipping</span><span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{unassignedDeliveries}</span></Link></li>
            <li><Link onClick={() => setMobileMenuOpen(false)} to="/admin/inventory" className={`flex w-full rounded-r-xl border-l-4 px-3 py-3 text-sm ${activeView === 'inventory' ? 'border-sky-600 bg-sky-50/60 font-semibold text-sky-700' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}>Inventory</Link></li>
            <li><Link onClick={() => setMobileMenuOpen(false)} to="/admin/forecast" className={`flex w-full rounded-r-xl border-l-4 px-3 py-3 text-sm ${activeView === 'forecast' ? 'border-sky-600 bg-sky-50/60 font-semibold text-sky-700' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}>Predictive Analysis</Link></li>
            {userRole === 'owner' && <li><Link onClick={() => setMobileMenuOpen(false)} to="/admin/revenue-reports" className={`flex w-full rounded-r-xl border-l-4 px-3 py-3 text-sm ${activeView === 'revenue-reports' ? 'border-sky-600 bg-sky-50/60 font-semibold text-sky-700' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}>Revenue Reports</Link></li>}
          </ul>
        </nav>
        <button onClick={handleSignOut} className="w-full rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100">Sign out</button>
      </aside>
      
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-gray-200 bg-white p-6 shadow-sm md:flex">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Bella Erin<span className="text-[#4091c9]">.</span></h2>
          <AdminNotificationBell iotData={iotData} />
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
                  {pendingOrders}
                </span>
              </Link>
            </li>
            <li>
              <Link to="/admin/deliveries" className={`flex w-full items-center justify-between rounded-r-xl border-l-4 px-3 py-2.5 text-sm transition-all ${activeView === 'deliveries' ? 'border-sky-600 bg-sky-50/60 text-sky-700 font-semibold' : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>
                <span>Handover & Shipping</span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  {unassignedDeliveries}
                </span>
              </Link>
            </li>
            <li>
              <Link to="/admin/inventory" className={`flex w-full items-center justify-between rounded-r-xl border-l-4 px-3 py-2.5 text-sm transition-all ${activeView === 'inventory' ? 'border-sky-600 bg-sky-50/60 text-sky-700 font-semibold' : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>
                <span>Inventory</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/forecast" className={`flex w-full items-center justify-between rounded-r-xl border-l-4 px-3 py-2.5 text-sm transition-all ${activeView === 'forecast' ? 'border-sky-600 bg-sky-50/60 text-sky-700 font-semibold' : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>
                <span>Predictive Analysis</span>
              </Link>
            </li>
            {userRole === 'owner' && <li><Link to="/admin/revenue-reports" className={`flex w-full rounded-r-xl border-l-4 px-3 py-2.5 text-sm transition-all ${activeView === 'revenue-reports' ? 'border-sky-600 bg-sky-50/60 text-sky-700 font-semibold' : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>Revenue Reports</Link></li>}
          </ul>
        </nav>

        <div className="mt-6">
          <button onClick={handleSignOut} className="w-full rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm font-semibold hover:bg-red-100">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main ml-0 flex-1 overflow-x-hidden p-4 sm:p-8 md:ml-64">
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">
          <Routes>
            <Route index element={<Overview iotData={iotData} environmentHistory={environmentHistory} todayDate={todayDate} todaysOrdersCount={todaysOrdersCount} pendingOrders={pendingOrderItems} verificationLoadingId={verificationLoadingId} onApprovePayment={handleApprovePayment} onOpenReceiptPreview={openReceiptPreview} onOpenRejectModal={openRejectModal} />} />
            <Route path="overview" element={<Overview iotData={iotData} environmentHistory={environmentHistory} todayDate={todayDate} todaysOrdersCount={todaysOrdersCount} pendingOrders={pendingOrderItems} verificationLoadingId={verificationLoadingId} onApprovePayment={handleApprovePayment} onOpenReceiptPreview={openReceiptPreview} onOpenRejectModal={openRejectModal} />} />
            <Route
              path="orders"
              element={
                <Orders
                  ordersLoading={ordersLoading}
                  ordersError={ordersError}
                  paginatedOrders={paginatedOrders}
                  pendingOrders={pendingOrders}
                  processingOrders={processingOrders}
                  completedOrders={completedOrders}
                  failedOrders={failedOrders}
                  cancelledOrders={cancelledOrders}
                  ordersPage={safeOrdersPage}
                  totalOrderPages={totalOrderPages}
                  setOrdersPage={setOrdersPage}
                  activeOrderFilter={activeOrderFilter}
                  setActiveOrderFilter={setActiveOrderFilter}
                  activeDateFilter={activeDateFilter}
                  setActiveDateFilter={setActiveDateFilter}
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
            <Route path="revenue-reports" element={<RevenueReports userRole={userRole} />} />
            <Route path="*" element={<Overview iotData={iotData} environmentHistory={environmentHistory} todayDate={todayDate} />} />
          </Routes>
        </div>
      </main>

      {receiptPreview?.url && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 px-4 py-8">
          <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl lg:flex-row">
            <button
              type="button"
              onClick={closeReceiptPreview}
              aria-label="Close payment proof preview"
              className="absolute right-4 top-4 z-10 rounded-full bg-white/95 px-3 py-1 text-xl text-gray-500 shadow hover:bg-gray-50"
            >
              ×
            </button>
            <div className="flex min-h-[20rem] flex-1 items-center justify-center bg-slate-100 p-4 lg:min-h-[34rem]">
              <img src={receiptPreview.url} alt="Payment receipt" className="max-h-[72vh] w-full object-contain" />
            </div>
            <div className="w-full shrink-0 border-t border-slate-200 bg-white p-6 lg:w-80 lg:border-l lg:border-t-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4091c9]">Payment review</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">Receipt details</h3>
              <dl className="mt-6 space-y-4 text-sm">
                <div><dt className="text-slate-500">Order</dt><dd className="mt-1 font-semibold text-slate-900">#{receiptPreview.order?.id?.slice(0, 8).toUpperCase() || 'Unknown'}</dd></div>
                <div><dt className="text-slate-500">Customer</dt><dd className="mt-1 font-semibold text-slate-900">{receiptPreview.order?.customerName || 'Unknown customer'}</dd></div>
                <div><dt className="text-slate-500">Amount</dt><dd className="mt-1 font-semibold text-slate-900">₱{Number(receiptPreview.order?.total || 0).toFixed(2)}</dd></div>
                <div><dt className="text-slate-500">Reference number</dt><dd className="mt-1 break-all rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 font-mono font-bold text-[#205a82]">{receiptPreview.order?.paymentReferenceNumber || 'Not provided'}</dd></div>
              </dl>
            </div>
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
            <label className="mt-4 block text-sm font-semibold text-gray-700" htmlFor="rejectReasonType">
              Rejection reason
            </label>
            <select
              id="rejectReasonType"
              value={rejectReasonType}
              onChange={(event) => setRejectReasonType(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#4091c9] focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Select a reason</option>
              {REJECTION_REASON_OPTIONS.map((reason) => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
            <label className="mt-4 block text-sm font-semibold text-gray-700" htmlFor="rejectReasonDetails">
              Additional details <span className="font-normal text-gray-500">(optional unless Other is selected)</span>
            </label>
            <textarea
              id="rejectReasonDetails"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              className="mt-4 w-full rounded-3xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 outline-none focus:border-[#4091c9] focus:ring-2 focus:ring-sky-100"
              placeholder="Add details for the customer"
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
                disabled={verificationLoadingId === selectedRejectOrder.id || !rejectReasonType || (rejectReasonType === 'Other' && !rejectReason.trim())}
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