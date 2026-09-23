import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { LogOut, MapPin, Navigation, PackageCheck, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase';

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/_/g, ' ');
const isDelivery = (order) => !normalize(order.fulfillmentMethod || order.fulfillment_type || order.deliveryType).includes('pickup');
const isDelivered = (order) => ['delivered', 'completed', 'done', 'finished'].includes(normalize(order.status));
const isReady = (order) => ['assigned', 'processing', 'order confirmed'].includes(normalize(order.deliveryStatus || order.status));
const isOutForDelivery = (order) => [order?.status, order?.deliveryStatus]
  .map(normalize)
  .some((value) => ['out for delivery', 'in transit', 'on the way', 'attempting'].includes(value));
const orderTime = (order) => order.createdAt?.toMillis?.() || 0;
const toLocation = (position) => ({
  latitude: Number(position.coords.latitude.toFixed(6)),
  longitude: Number(position.coords.longitude.toFixed(6)),
});

export default function DriverPortal() {
  const navigate = useNavigate();
  const watchIdRef = useRef(null);
  const [driver, setDriver] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');

  useEffect(() => {
    let unsubscribeOrders;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeOrders?.();
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      setDriver(user);
      const ordersQuery = query(collection(db, 'orders'), where('assignedDriverId', '==', user.uid));
      unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
        setOrders(snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() })));
        setLoading(false);
      }, () => {
        setError('Unable to load your assigned deliveries.');
        setLoading(false);
      });
    });

    return () => {
      unsubscribeOrders?.();
      unsubscribeAuth();
      if (watchIdRef.current != null) navigator.geolocation?.clearWatch(watchIdRef.current);
    };
  }, [navigate]);

  const activeOrder = useMemo(() => orders
    .filter((order) => isDelivery(order) && !isDelivered(order))
    .sort((a, b) => orderTime(a) - orderTime(b))[0], [orders]);
  const activeOrderId = activeOrder?.id;
  const activeOrderStatus = activeOrder?.status;
  const activeOrderDeliveryStatus = activeOrder?.deliveryStatus;

  const stopWatching = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const updateDriverLocation = async (orderId, position) => {
    const location = toLocation(position);
    await updateDoc(doc(db, 'orders', orderId), {
      driverLocation: { ...location, updatedAt: serverTimestamp() },
      lastDriverLocationAt: serverTimestamp(),
    });
  };

  const startWatching = useCallback((order) => {
    if (!window.isSecureContext) {
      setLocationMessage('GPS requires HTTPS. Open the deployed HTTPS site on the mobile phone.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationMessage('This mobile browser does not support GPS location.');
      return;
    }

    stopWatching();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => updateDriverLocation(order.id, position).catch(() => setError('Live location could not be updated.')),
      (positionError) => {
        const messages = {
          1: 'Location permission was denied. Enable Location for this browser in phone settings.',
          2: 'The phone could not determine its location. Turn on GPS and try again.',
          3: 'GPS timed out. Check phone location settings and try again.',
        };
        setLocationMessage(messages[positionError.code] || 'Your live location is temporarily unavailable.');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [stopWatching]);

  useEffect(() => {
    const resumeGps = () => {
      const currentOrder = {
        id: activeOrderId,
        status: activeOrderStatus,
        deliveryStatus: activeOrderDeliveryStatus,
      };
      if (currentOrder.id && isOutForDelivery(currentOrder)) {
        startWatching(currentOrder);
      } else {
        stopWatching();
      }
    };
    const resumeTimer = window.setTimeout(resumeGps, 0);
    return () => {
      window.clearTimeout(resumeTimer);
      stopWatching();
    };
  }, [activeOrderId, activeOrderStatus, activeOrderDeliveryStatus, startWatching, stopWatching]);

  const handleStartDelivery = () => {
    if (!activeOrder || !navigator.geolocation) {
      setError('This device does not support GPS location.');
      return;
    }

    if (!window.isSecureContext) {
      setLocationMessage('GPS requires HTTPS. Open the deployed HTTPS site on the mobile phone.');
      return;
    }

    setSavingOrderId(activeOrder.id);
    setError('');
    setLocationMessage('');
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const location = toLocation(position);
        const previousOrder = orders
          .filter((order) => order.id !== activeOrder.id && isDelivered(order) && order.completedDeliveryLocation)
          .sort((a, b) => (b.deliveredAt?.toMillis?.() || 0) - (a.deliveredAt?.toMillis?.() || 0))[0];
        const origin = previousOrder?.completedDeliveryLocation || location;

        await updateDoc(doc(db, 'orders', activeOrder.id), {
          status: 'Out for Delivery',
          deliveryStatus: 'Out for Delivery',
          deliveryStartedAt: serverTimestamp(),
          deliveryOrigin: origin,
          driverLocation: { ...location, updatedAt: serverTimestamp() },
          lastDriverLocationAt: serverTimestamp(),
        });
        startWatching(activeOrder);
      } catch (startError) {
        setError(startError.message || 'Unable to start this delivery.');
      } finally {
        setSavingOrderId(null);
      }
    }, (positionError) => {
      const messages = {
        1: 'Location permission was denied. Enable Location for this browser in phone settings.',
        2: 'The phone could not determine its location. Turn on GPS and try again.',
        3: 'GPS timed out. Check phone location settings and try again.',
      };
      setLocationMessage(messages[positionError.code] || 'Unable to get the phone location.');
      setSavingOrderId(null);
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  };

  const handleCompleteDelivery = (order) => {
    if (!navigator.geolocation) return;
    setSavingOrderId(order.id);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const location = toLocation(position);
        await updateDoc(doc(db, 'orders', order.id), {
          status: 'Delivered',
          deliveryStatus: 'Delivered',
          deliveredAt: serverTimestamp(),
          completedDeliveryLocation: location,
          driverLocation: { ...location, updatedAt: serverTimestamp() },
          lastDriverLocationAt: serverTimestamp(),
        });
        stopWatching();
      } catch {
        setError('Unable to complete this delivery. Please try again.');
      } finally {
        setSavingOrderId(null);
      }
    }, (positionError) => {
      const messages = {
        1: 'Location permission was denied. Enable Location for this browser in phone settings.',
        2: 'The phone could not determine its location. Turn on GPS and try again.',
        3: 'GPS timed out. Check phone location settings and try again.',
      };
      setLocationMessage(messages[positionError.code] || 'Get your current location before completing this delivery.');
      setSavingOrderId(null);
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  };

  const handleLogout = async () => {
    stopWatching();
    await signOut(auth);
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3"><div className="rounded-2xl bg-sky-100 p-3 text-[#4091c9]"><Truck className="h-6 w-6" /></div><div><p className="font-bold text-slate-900">Bella Erin Driver</p><p className="text-xs text-slate-500">Live delivery desk</p></div></div>
          <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 rounded-3xl bg-[#205a82] p-6 text-white shadow-lg"><p className="text-sm text-sky-100">Welcome{driver?.email ? `, ${driver.email}` : ''}</p><h1 className="mt-1 text-2xl font-bold">Your delivery route</h1><p className="mt-2 text-sm text-sky-100">Start a delivery to share your live position. The next route begins where the previous delivery ended.</p></div>
        {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
        {locationMessage && <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><MapPin className="mr-2 inline h-4 w-4" />{locationMessage}</div>}
        {loading ? <div className="rounded-2xl bg-white p-6 text-slate-600">Loading assigned deliveries...</div> : !activeOrder ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><PackageCheck className="mx-auto h-10 w-10 text-emerald-500" /><h2 className="mt-3 font-bold text-slate-900">No active delivery</h2><p className="mt-1 text-sm text-slate-500">New assignments will appear here automatically.</p></div> : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4091c9]">Next delivery</p><h2 className="mt-2 text-xl font-bold text-slate-900">{activeOrder.customerName || 'Customer'}</h2><p className="mt-1 text-sm text-slate-600">{activeOrder.shippingAddress || 'Customer address unavailable'}</p></div><span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">{activeOrder.deliveryStatus || activeOrder.status}</span></div>
            <div className="mt-6 flex flex-wrap gap-3">{isReady(activeOrder) && <button type="button" onClick={handleStartDelivery} disabled={savingOrderId === activeOrder.id} className="inline-flex items-center gap-2 rounded-xl bg-[#4091c9] px-4 py-3 text-sm font-bold text-white hover:bg-[#2d75aa] disabled:opacity-60"><Navigation className="h-4 w-4" />{savingOrderId === activeOrder.id ? 'Starting...' : 'Start delivery'}</button>}{normalize(activeOrder.deliveryStatus) === 'out for delivery' && <button type="button" onClick={() => handleCompleteDelivery(activeOrder)} disabled={savingOrderId === activeOrder.id} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"><PackageCheck className="h-4 w-4" />{savingOrderId === activeOrder.id ? 'Completing...' : 'Mark delivered'}</button>}</div>
          </div>
        )}
      </main>
    </div>
  );
}
