import { getApp } from 'firebase/app';
import { useEffect, useMemo, useState } from 'react';
import { Calendar, ShieldCheck, TrendingUp } from 'lucide-react';
import { addDoc, collection, doc, getDocs, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDatabase, onValue, ref } from 'firebase/database';
import { auth, db } from '../../services/firebase';

const realtimeDb = getDatabase(getApp());

const defaultProducts = [
  {
    productId: 'tube-5',
    name: 'Tube Ice 5kg',
    type: 'tube',
    packaging: '5kg',
    weightKg: 5,
    price: 25,
    isMonitoredByScale: true,
  },
  {
    productId: 'tube-35',
    name: 'Tube Ice 35kg',
    type: 'tube',
    packaging: '35kg',
    weightKg: 35,
    price: 120,
    isMonitoredByScale: true,
  },
  {
    productId: 'tube-50',
    name: 'Tube Ice 50kg',
    type: 'tube',
    packaging: '50kg',
    weightKg: 50,
    price: 150,
    isMonitoredByScale: true,
  },
  {
    productId: 'crushed-crate',
    name: 'Crushed Ice Crates',
    type: 'crushed',
    packaging: 'crate',
    weightKg: 70,
    price: 180,
    isMonitoredByScale: false,
  },
  {
    productId: 'crushed-sack',
    name: 'Crushed Ice Sack',
    type: 'crushed',
    packaging: 'sack',
    weightKg: 40,
    price: 140,
    isMonitoredByScale: true,
  },
];

const defaultInventory = {
  'tube-5': { currentStock: 85, totalWeightKg: 425, lastUpdated: new Date(), updateSource: 'scale_sensor', scaleSensorId: 'ESP32_Scale_01' },
  'tube-35': { currentStock: 42, totalWeightKg: 1470, lastUpdated: new Date(), updateSource: 'scale_sensor', scaleSensorId: 'ESP32_Scale_01' },
  'tube-50': { currentStock: 124, totalWeightKg: 6200, lastUpdated: new Date(), updateSource: 'scale_sensor', scaleSensorId: 'ESP32_Scale_01' },
  'crushed-crate': { currentStock: 15, totalWeightKg: 1050, lastUpdated: new Date(), updateSource: 'manual_entry', scaleSensorId: null },
  'crushed-sack': { currentStock: 20, totalWeightKg: 800, lastUpdated: new Date(), updateSource: 'scale_sensor', scaleSensorId: 'ESP32_Scale_01' },
};

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [firestoreInventory, setFirestoreInventory] = useState([]);
  const [scaleInventory, setScaleInventory] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('tube-50');
  const [adjustValue, setAdjustValue] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Loading inventory…');
  const [auditPage, setAuditPage] = useState(1);
  const logsPerPage = 5;

  useEffect(() => {
    let unsubscribeInventory = null;
    let unsubscribeLogs = null;
    let unsubscribeScaleInventory = null;

    const seedCollections = async () => {
      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        if (productsSnap.empty) {
          await Promise.all(
            defaultProducts.map((product) =>
              setDoc(doc(db, 'products', product.productId), product)
            )
          );

          await Promise.all(
            Object.entries(defaultInventory).map(([productId, inventoryData]) =>
              setDoc(doc(db, 'inventory', productId), inventoryData)
            )
          );
        } else {
          const catalog = productsSnap.docs.map((docSnapshot) => ({
            productId: docSnapshot.id,
            ...docSnapshot.data(),
          }));

          const inventorySnap = await getDocs(collection(db, 'inventory'));
          if (inventorySnap.empty) {
            await Promise.all(
              catalog.map((product) =>
                setDoc(doc(db, 'inventory', product.productId), {
                  currentStock: 0,
                  totalWeightKg: 0,
                  lastUpdated: serverTimestamp(),
                  updateSource: 'manual_entry',
                  scaleSensorId: product.isMonitoredByScale ? 'ESP32_Scale_01' : null,
                })
              )
            );
          }
        }

        const inventoryRef = collection(db, 'inventory');
        const logsRef = collection(db, 'stock_logs');

        unsubscribeInventory = onSnapshot(inventoryRef, (snapshot) => {
          const inventoryData = snapshot.docs.map((docSnapshot) => ({
            productId: docSnapshot.id,
            ...docSnapshot.data(),
          }));
          setFirestoreInventory(inventoryData);
          setLoadingMessage('');
        });

        unsubscribeLogs = onSnapshot(logsRef, (snapshot) => {
          const parsedLogs = snapshot.docs
            .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
            .sort((a, b) => (b.timestamp?.toMillis?.() || b.timestamp || 0) - (a.timestamp?.toMillis?.() || a.timestamp || 0));
          setLogs(parsedLogs);
        });

        // RTDB listener for scale-monitored products so live sensor counts can stream into the UI.
        const scaleInventoryRef = ref(realtimeDb, 'inventory/scale_1');
        unsubscribeScaleInventory = onValue(scaleInventoryRef, (snapshot) => {
          const value = snapshot.val();
          setScaleInventory(value || null);
          setLoadingMessage('');
        });

        const productsRef = collection(db, 'products');
        const productsSnapshot = await getDocs(productsRef);
        const catalog = productsSnapshot.docs.map((docSnapshot) => ({
          productId: docSnapshot.id,
          ...docSnapshot.data(),
        }));
        setProducts(catalog);
      } catch (error) {
        console.error('Unable to load inventory data', error);
        setLoadingMessage('Unable to load inventory data right now.');
      }
    };

    seedCollections();

    return () => {
      if (unsubscribeInventory) unsubscribeInventory();
      if (unsubscribeLogs) unsubscribeLogs();
      if (unsubscribeScaleInventory) unsubscribeScaleInventory();
    };
  }, []);

  const inventoryRows = useMemo(() => {
    const inventoryMap = Object.fromEntries(firestoreInventory.map((item) => [item.productId, item]));
    const scaleBreakdown = scaleInventory?.sacks_breakdown || {};

    const orderedProducts = [...products].sort((left, right) => {
      const leftGroup = left.type === 'tube' ? 0 : 1;
      const rightGroup = right.type === 'tube' ? 0 : 1;

      if (leftGroup !== rightGroup) {
        return leftGroup - rightGroup;
      }

      return Number(left.weightKg || 0) - Number(right.weightKg || 0);
    });

    return orderedProducts.map((product) => {
      const stockInfo = inventoryMap[product.productId] || {
        currentStock: 0,
        totalWeightKg: 0,
        lastUpdated: null,
        updateSource: 'manual_entry',
        scaleSensorId: null,
      };

      const isScaleMonitored = Boolean(product.isMonitoredByScale);
      let currentStock = Number(stockInfo.currentStock || 0);
      let totalWeightKg = Number(stockInfo.totalWeightKg || 0);
      let lastUpdated = stockInfo.lastUpdated;
      let updateSource = stockInfo.updateSource || 'manual_entry';
      let scaleSensorId = stockInfo.scaleSensorId || null;

      if (isScaleMonitored) {
        let scaleKey = null;

        switch (product.productId) {
          case 'tube-50':
            scaleKey = '50kg_sacks';
            break;
          case 'tube-35':
            scaleKey = '35kg_sacks';
            break;
          case 'tube-5':
            scaleKey = '5kg_sacks';
            break;
          default:
            scaleKey = null;
        }

        currentStock = scaleKey ? Number(scaleBreakdown[scaleKey] || 0) : 0;
        totalWeightKg = currentStock * Number(product.weightKg || 0);
        lastUpdated = scaleInventory?.last_updated ? new Date(scaleInventory.last_updated) : stockInfo.lastUpdated;
        updateSource = 'scale_sensor';
        scaleSensorId = 'ESP32_Scale_01';
      }

      return {
        id: product.productId,
        name: product.name,
        type: product.type,
        packaging: product.packaging,
        weightPerUnitKg: product.weightKg,
        price: product.price,
        isMonitoredByScale: isScaleMonitored,
        currentStock,
        totalWeightKg,
        lastUpdated,
        updateSource,
        scaleSensorId,
      };
    });
  }, [firestoreInventory, products, scaleInventory]);

  const selectedItem = useMemo(
    () => inventoryRows.find((item) => item.id === selectedItemId) || inventoryRows[0],
    [inventoryRows, selectedItemId]
  );

  const totalActiveWeight = inventoryRows.reduce((sum, item) => sum + item.totalWeightKg, 0);
  const totalSacks = inventoryRows.reduce((sum, item) => sum + item.currentStock, 0);
  const totalAuditPages = Math.max(1, Math.ceil(logs.length / logsPerPage));
  const paginatedLogs = useMemo(() => {
    const startIndex = (auditPage - 1) * logsPerPage;
    return logs.slice(startIndex, startIndex + logsPerPage);
  }, [auditPage, logs, logsPerPage]);

  useEffect(() => {
    if (auditPage > totalAuditPages) {
      setAuditPage(1);
    }
  }, [auditPage, totalAuditPages]);

  const handleOpenAdjust = (itemId) => {
    setSelectedItemId(itemId);
    setAdjustValue(0);
    setIsAdjustOpen(true);
  };

  const handleCalibrateScale = async () => {
    const currentUser = auth.currentUser;
    const currentProduct = inventoryRows.find((item) => item.isMonitoredByScale) || inventoryRows[0];

    await addDoc(collection(db, 'stock_logs'), {
      productId: currentProduct?.id || 'tube-50',
      changeQuantity: 0,
      previousStock: currentProduct?.currentStock || 0,
      newStock: currentProduct?.currentStock || 0,
      reason: 'scale_recalibration',
      source: 'automatic_scale',
      performedBy: currentUser?.uid || 'ESP32_Scale_01',
      timestamp: serverTimestamp(),
    });
  };

  const handleSaveAdjustment = async () => {
    if (!selectedItem) return;

    const currentStock = Number(selectedItem.currentStock || 0);
    const changeAmount = Number(adjustValue || 0);
    const nextStock = Math.max(0, currentStock + changeAmount);
    const nextWeight = nextStock * Number(selectedItem.weightPerUnitKg || 0);
    const performedBy = auth.currentUser?.uid || 'ESP32_Scale_01';

    if (selectedItem.isMonitoredByScale) {
      // Scale-monitored items stay driven by RTDB telemetry; manual changes are logged as overrides only.
      await addDoc(collection(db, 'stock_logs'), {
        productId: selectedItem.id,
        changeQuantity: changeAmount,
        previousStock: currentStock,
        newStock: nextStock,
        reason: 'production_batch',
        source: 'manual_override',
        performedBy,
        timestamp: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'inventory', selectedItem.id), {
        currentStock: nextStock,
        totalWeightKg: nextWeight,
        lastUpdated: serverTimestamp(),
        updateSource: 'manual_entry',
        scaleSensorId: null,
      });

      await addDoc(collection(db, 'stock_logs'), {
        productId: selectedItem.id,
        changeQuantity: changeAmount,
        previousStock: currentStock,
        newStock: nextStock,
        reason: 'production_batch',
        source: 'manual_override',
        performedBy,
        timestamp: serverTimestamp(),
      });
    }

    setIsAdjustOpen(false);
    setAdjustValue(0);
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Inventory</h2>
          <p className="mt-2 text-gray-600">Monitor stock levels for all ice products.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenAdjust('tube-50')}
            className="rounded-xl bg-[#4091c9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2d75aa]"
          >
            Adjust Stock
          </button>

          <button
            type="button"
            onClick={handleCalibrateScale}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:text-[#4091c9]"
          >
            Calibrate Scale
          </button>
        </div>
      </div>

      <section className="mb-7">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-800">Live Overview</h3>
        </div>

        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {loadingMessage || 'Inventory is synced with Firestore and scale telemetry.'}
        </div>

        {/* UI optimization: summary metrics now live in a compact horizontal banner above the product grid. */}
        <div className="mb-5 grid gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-3">
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total Weight</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{totalActiveWeight} kg</p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total Units</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{totalSacks}</p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Scale Feed</p>
            <p className="mt-1 text-lg font-bold text-green-700">Online</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {inventoryRows.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpenAdjust(item.id)}
              className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:border-[#4091c9] hover:shadow-md"
            >
              <div className="mb-4">
                <div>
                  <p className="text-base font-bold text-gray-800">{item.name}</p>
                  {/* UI optimization: the card subtitle now uses a compact size label for clearer scanning. */}
                  <p className="mt-1 text-xs font-semibold text-gray-500">{item.type === 'tube' ? `${item.weightPerUnitKg}kg Tube` : `${item.weightPerUnitKg}kg ${item.packaging}`}</p>
                  <div className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${item.isMonitoredByScale && item.currentStock === 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                    {item.isMonitoredByScale && item.currentStock === 0 ? '🟡 Scale Idle' : '🟢 Scale Live (ESP32)'}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-blue-700">Total Weight</p>
                  <p className="mt-1 text-xl font-bold text-blue-900">{item.totalWeightKg} kg</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-amber-700">Units</p>
                  <p className="mt-1 text-xl font-bold text-amber-900">{item.currentStock}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center rounded-xl border border-gray-100 px-3 py-2 text-sm text-gray-600">
                <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-[#4091c9]" /> {item.lastUpdated?.toDate ? item.lastUpdated.toDate().toLocaleString() : item.lastUpdated instanceof Date ? item.lastUpdated.toLocaleString() : item.lastUpdated ? new Date(item.lastUpdated).toLocaleString() : 'Live (Syncing...)'}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#4091c9]" />
          <h3 className="text-lg font-bold text-gray-800">Inventory Activity Audit Log</h3>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Change</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedLogs.map((log) => {
                const productName = products.find((product) => product.productId === log.productId)?.name || log.productId;
                const changeLabel = log.changeQuantity >= 0 ? `+${log.changeQuantity}` : `${log.changeQuantity}`;

                return (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-gray-600">{log.timestamp?.toDate 
                        ? log.timestamp.toDate().toLocaleString() 
                        : log.timestamp 
                        ? new Date(log.timestamp).toLocaleString() 
                        : 'Pending'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{productName}</td>
                    <td className="px-4 py-3 text-gray-700">{changeLabel} units · {log.previousStock} → {log.newStock}</td>
                    <td className="px-4 py-3 text-gray-700">{log.source}</td>
                    <td className="px-4 py-3 text-gray-600">{log.performedBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {logs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-600">
              Showing {Math.min(logsPerPage, logs.length - ((auditPage - 1) * logsPerPage))} of {logs.length} audit entries
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuditPage((page) => Math.max(1, page - 1))}
                disabled={auditPage === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm font-semibold text-gray-700">Page {auditPage} of {totalAuditPages}</span>
              <button
                type="button"
                onClick={() => setAuditPage((page) => Math.min(totalAuditPages, page + 1))}
                disabled={auditPage === totalAuditPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {isAdjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-gray-800">Adjust Stock</p>
                <p className="text-sm text-gray-500">Update {selectedItem?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustOpen(false)}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-gray-50 p-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">Units change</label>
                <input
                  type="number"
                  value={adjustValue}
                  onChange={(event) => setAdjustValue(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-[#4091c9]"
                  placeholder="Enter + or - units"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-blue-50 p-4 text-sm text-gray-700">
                <span>Current units</span>
                <span className="font-bold text-gray-900">{selectedItem?.currentStock}</span>
              </div>

              <button
                type="button"
                onClick={handleSaveAdjustment}
                className="w-full rounded-xl bg-[#4091c9] py-3 font-semibold text-white transition hover:bg-[#2d75aa]"
              >
                Save Inventory Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
