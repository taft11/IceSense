import { getApp } from 'firebase/app';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ShieldCheck } from 'lucide-react';
import { addDoc, collection, doc, getDocs, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDatabase, onValue, ref, update } from 'firebase/database';
import { auth, db } from '../../services/firebase';

const realtimeDb = getDatabase(getApp());

const defaultProducts = [
  {
    productId: 'tube-5',
    name: 'Tube Ice 5kg',
    type: 'tube',
    packaging: '5kg',
    weightKg: 5,
    price: 30,
    isMonitoredByScale: true,
  },
  {
    productId: 'tube-35',
    name: 'Tube Ice 35kg',
    type: 'tube',
    packaging: '35kg',
    weightKg: 35,
    price: 140,
    isMonitoredByScale: true,
  },
  {
    productId: 'tube-50',
    name: 'Tube Ice 50kg',
    type: 'tube',
    packaging: '50kg',
    weightKg: 50,
    price: 200,
    isMonitoredByScale: true,
  },
  {
    productId: 'crushed-crate',
    name: 'Crushed Ice 5kg',
    type: 'crushed',
    packaging: 'sack',
    weightKg: 5,
    price: 35,
    isMonitoredByScale: true,
  },
  {
    productId: 'crushed-sack',
    name: 'Crushed Ice 35kg',
    type: 'crushed',
    packaging: 'sack',
    weightKg: 35,
    price: 150,
    isMonitoredByScale: true,
  },
  {
    productId: 'crushed-50',
    name: 'Crushed Ice 50kg',
    type: 'crushed',
    packaging: 'sack',
    weightKg: 50,
    price: 210,
    isMonitoredByScale: true,
  },
];

const defaultInventory = {
  'tube-5': { currentStock: 85, totalWeightKg: 425, lastUpdated: new Date(), updateSource: 'scale_sensor', scaleSensorId: 'ESP32_Scale_01' },
  'tube-35': { currentStock: 42, totalWeightKg: 1470, lastUpdated: new Date(), updateSource: 'scale_sensor', scaleSensorId: 'ESP32_Scale_01' },
  'tube-50': { currentStock: 124, totalWeightKg: 6200, lastUpdated: new Date(), updateSource: 'scale_sensor', scaleSensorId: 'ESP32_Scale_01' },
  'crushed-crate': { currentStock: 0, totalWeightKg: 0, lastUpdated: new Date(), updateSource: 'scale_sensor', scaleSensorId: 'ESP32_Scale_01' },
  'crushed-sack': { currentStock: 0, totalWeightKg: 0, lastUpdated: new Date(), updateSource: 'scale_sensor', scaleSensorId: 'ESP32_Scale_01' },
  'crushed-50': { currentStock: 0, totalWeightKg: 0, lastUpdated: new Date(), updateSource: 'scale_sensor', scaleSensorId: 'ESP32_Scale_01' },
};

const normalizeCatalog = (catalog) => {
  const normalized = catalog.map((product) => {
    const currentDefinition = defaultProducts.find((defaultProduct) => defaultProduct.productId === product.productId);

    if (!currentDefinition || currentDefinition.type !== 'crushed') {
      return product;
    }

    return {
      ...product,
      name: currentDefinition.name,
      packaging: currentDefinition.packaging,
      weightKg: currentDefinition.weightKg,
      isMonitoredByScale: true,
    };
  });

  const missingCrushedProducts = defaultProducts.filter(
    (defaultProduct) => defaultProduct.type === 'crushed' && !normalized.some((product) => product.productId === defaultProduct.productId)
  );

  return [...normalized, ...missingCrushedProducts];
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
  const previousScaleInventoryRef = useRef(null);
  const previousScaleLogsRef = useRef(null);

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
        const catalog = normalizeCatalog(productsSnapshot.docs.map((docSnapshot) => ({
          productId: docSnapshot.id,
          ...docSnapshot.data(),
        })));
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

  // Helper: safely format Firestore Timestamp, Date objects, and numeric timestamps
  const formatTimestamp = (value) => {
    if (!value) return 'Live (Syncing...)';
    try {
      let date = null;
      if (typeof value?.toDate === 'function') {
        date = value.toDate();
      } else if (value instanceof Date) {
        date = value;
      } else if (typeof value === 'number') {
        // assume milliseconds if large, otherwise seconds
        date = value > 1e12 ? new Date(value) : new Date(value * 1000);
      } else {
        date = new Date(value);
      }

      if (Number.isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  const truncateId = (id) => {
    if (!id) return '';
    const s = String(id);
    if (s.length <= 10) return s;
    return `${s.slice(0, 6)}...${s.slice(-3)}`;
  };

  const inventoryRows = useMemo(() => {
    const inventoryMap = Object.fromEntries(firestoreInventory.map((item) => [item.productId, item]));
    const scaleSections = {
      tube: scaleInventory?.tube_ice || {},
      crushed: scaleInventory?.crushed_ice || {},
    };

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
        const scaleSection = scaleSections[product.type] || {};
        const scaleBreakdown = scaleSection.sacks_breakdown || {};
        const scaleKey = `${Number(product.weightKg || 0)}kg_sacks`;
        const hasMatchingBreakdown = Object.prototype.hasOwnProperty.call(scaleBreakdown, scaleKey);
        const fallbackStock = scaleSection.total_sacks ?? scaleSection.total_sacks_count ?? 0;

        currentStock = Number(hasMatchingBreakdown ? scaleBreakdown[scaleKey] : fallbackStock);
        totalWeightKg = currentStock * Number(product.weightKg || 0);
        lastUpdated = scaleSection.last_updated ? new Date(scaleSection.last_updated) : stockInfo.lastUpdated;
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

  useEffect(() => {
    if (!scaleInventory || !products.length) {
      previousScaleInventoryRef.current = scaleInventory || null;
      return;
    }

    const previousScaleInventory = previousScaleInventoryRef.current;
    previousScaleInventoryRef.current = scaleInventory;

    if (!previousScaleInventory) {
      return;
    }

    const currentSections = {
      tube: scaleInventory?.tube_ice || {},
      crushed: scaleInventory?.crushed_ice || {},
    };
    const previousSections = {
      tube: previousScaleInventory?.tube_ice || {},
      crushed: previousScaleInventory?.crushed_ice || {},
    };

    const scaleEntries = products
      .filter((product) => product.isMonitoredByScale)
      .map((product) => {
        const currentSection = currentSections[product.type] || {};
        const previousSection = previousSections[product.type] || {};
        const currentBreakdown = currentSection.sacks_breakdown || {};
        const previousBreakdown = previousSection.sacks_breakdown || {};
        const scaleKey = `${Number(product.weightKg || 0)}kg_sacks`;

        const previousStock = Number(
          previousBreakdown[scaleKey] ?? previousSection.total_sacks ?? previousSection.total_sacks_count ?? 0
        );
        const nextStock = Number(
          currentBreakdown[scaleKey] ?? currentSection.total_sacks ?? currentSection.total_sacks_count ?? 0
        );

        return {
          productId: product.productId,
          previousStock,
          newStock: nextStock,
          changeQuantity: nextStock - previousStock,
        };
      })
      .filter((entry) => entry.changeQuantity !== 0);

    if (scaleEntries.length === 0) {
      return;
    }

    const writeScaleLogs = async () => {
      await Promise.all(
        scaleEntries.map((entry) =>
          addDoc(collection(db, 'stock_logs'), {
            productId: entry.productId,
            changeQuantity: entry.changeQuantity,
            previousStock: entry.previousStock,
            newStock: entry.newStock,
            reason: 'scale_sync',
            source: 'automatic_scale',
            performedBy: 'ESP32_Scale_01',
            timestamp: serverTimestamp(),
          })
        )
      );
    };

    writeScaleLogs().catch((error) => {
      console.error('Unable to log automatic scale changes', error);
    });
  }, [products, scaleInventory]);

  useEffect(() => {
    if (!products.length) {
      return undefined;
    }

    const scaleLogsRef = ref(realtimeDb, 'inventory_logs/scale_1');
    const unsubscribeScaleLogs = onValue(scaleLogsRef, (snapshot) => {
      const value = snapshot.val() || {};
      const entries = Object.entries(value).map(([id, payload]) => ({ id, ...(payload || {}) }));

      if (!previousScaleLogsRef.current) {
        previousScaleLogsRef.current = entries;
        return;
      }

      const previousIds = new Set(previousScaleLogsRef.current.map((entry) => entry.id));
      const newEntries = entries.filter((entry) => !previousIds.has(entry.id));
      previousScaleLogsRef.current = entries;

      if (newEntries.length === 0) {
        return;
      }

      const writeScaleEventLogs = async () => {
        await Promise.all(
          newEntries.map((entry) => {
            const rawEventType = String(entry.event_type || '').toUpperCase();
            const changeQuantity = rawEventType.includes('ADDED') ? 1 : rawEventType.includes('REMOVED') ? -1 : 0;

            if (changeQuantity === 0) {
              return null;
            }

            const weight = Number(entry.sack_weight || 0);
            const product = products.find((candidate) => {
              const isMatchingType = candidate.type === (entry.ice_type === 'tube_ice' ? 'tube' : 'crushed');
              return isMatchingType && Number(candidate.weightKg) === weight;
            });

            if (!product) {
              return null;
            }

            const countFromRealtime = (() => {
              const section = product.type === 'tube' ? (scaleInventory?.tube_ice || {}) : (scaleInventory?.crushed_ice || {});
              const breakdown = section.sacks_breakdown || {};
              const scaleKey = `${Number(product.weightKg || 0)}kg_sacks`;
              return Number(breakdown[scaleKey] ?? section.total_sacks ?? section.total_sacks_count ?? 0);
            })();

            const previousStock = Math.max(0, countFromRealtime - changeQuantity);
            const newStock = countFromRealtime;

            return addDoc(collection(db, 'stock_logs'), {
              productId: product.productId,
              changeQuantity,
              previousStock,
              newStock,
              reason: 'scale_sync',
              source: 'automatic_scale',
              performedBy: 'ESP32_Scale_01',
              timestamp: entry.timestamp ? new Date(Number(entry.timestamp)) : serverTimestamp(),
            });
          })
        );
      };

      writeScaleEventLogs().catch((error) => {
        console.error('Unable to log automatic scale event changes', error);
      });
    });

    return () => unsubscribeScaleLogs();
  }, [products, scaleInventory]);

  const selectedItem = useMemo(
    () => inventoryRows.find((item) => item.id === selectedItemId) || inventoryRows[0],
    [inventoryRows, selectedItemId]
  );

  const totalActiveWeight = inventoryRows.reduce((sum, item) => sum + item.totalWeightKg, 0);
  const totalSacks = inventoryRows.reduce((sum, item) => sum + item.currentStock, 0);
  const totalAuditPages = Math.max(1, Math.ceil(logs.length / logsPerPage));
  const safeAuditPage = Math.min(auditPage, totalAuditPages);
  const paginatedLogs = useMemo(() => {
    const startIndex = (safeAuditPage - 1) * logsPerPage;
    return logs.slice(startIndex, startIndex + logsPerPage);
  }, [safeAuditPage, logs, logsPerPage]);

  const handleOpenAdjust = (itemId) => {
    setSelectedItemId(itemId);
    setAdjustValue(0);
    setIsAdjustOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedItem) return;

    const currentStock = Number(selectedItem.currentStock || 0);
    const changeAmount = Number(adjustValue || 0);
    const nextStock = Math.max(0, currentStock + changeAmount);
    const nextWeight = nextStock * Number(selectedItem.weightPerUnitKg || 0);
    const performedBy = auth.currentUser?.uid || 'ESP32_Scale_01';

    if (selectedItem.isMonitoredByScale) {
      const scaleSectionKey = selectedItem.type === 'tube' ? 'tube_ice' : 'crushed_ice';
      const scaleSection = scaleInventory?.[scaleSectionKey] || {};
      const sacksBreakdown = { ...(scaleSection.sacks_breakdown || {}) };
      const sackKey = `${Number(selectedItem.weightPerUnitKg || 0)}kg_sacks`;
      sacksBreakdown[sackKey] = nextStock;
      const totalSacks = Object.values(sacksBreakdown).reduce((sum, value) => sum + Number(value || 0), 0);

      await update(ref(realtimeDb, `inventory/scale_1/${scaleSectionKey}`), {
        [`sacks_breakdown/${sackKey}`]: nextStock,
        total_sacks: totalSacks,
        last_updated: new Date().toISOString(),
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

        {/* Header controls removed: Adjust Stock & Calibrate Scale */}
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
          <div className="rounded-xl bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Total Weight</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalActiveWeight} kg</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Total Units</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalSacks}</p>
              </div>
            </div>
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
                  <div className="mb-4 relative">
                    <div>
                      <p className="text-base font-bold text-gray-800">{item.name}</p>
                      {/* UI optimization: the card subtitle now uses a compact size label for clearer scanning. */}
                      <p className="mt-1 text-xs font-semibold text-gray-500">{item.type === 'tube' ? `${item.weightPerUnitKg}kg Tube` : `${item.weightPerUnitKg}kg ${item.packaging}`}</p>
                    </div>

                    {/* Status pill: In Stock / Out of Stock */}
                    <div className="absolute right-3 top-3">
                      {item.currentStock > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">In Stock</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Out of Stock</span>
                      )}
                    </div>
                  </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-blue-700">Total Weight</p>
                  <p className="mt-1 text-xl font-bold text-blue-900">{item.totalWeightKg} kg</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-600">Units</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{item.currentStock}</p>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-500">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Updated {formatTimestamp(item.lastUpdated)}</span>
                </span>
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
                <th className="px-4 py-3 font-semibold border-b border-gray-100 first:rounded-tl-lg">Timestamp</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-100">Product</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-100">Change</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-100">Source</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-100 last:rounded-tr-lg">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedLogs.map((log) => {
                const productName = products.find((product) => product.productId === log.productId)?.name || log.productId;
                const changeLabel = log.changeQuantity >= 0 ? `+${log.changeQuantity}` : `${log.changeQuantity}`;
                const changeClass = log.changeQuantity >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold';

                return (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-gray-600">{formatTimestamp(log.timestamp)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{productName}</td>
                    <td className="px-4 py-3 text-gray-700"><span className={changeClass}>{changeLabel}</span> units · {log.previousStock} → {log.newStock}</td>
                    <td className="px-4 py-3 text-gray-700">{log.source}</td>
                    <td className="px-4 py-3 text-gray-600">{truncateId(log.performedBy)}</td>
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
