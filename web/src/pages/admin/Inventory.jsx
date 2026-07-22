import { useEffect, useMemo, useState } from 'react';
import { Activity, Scale, ShieldCheck, TrendingUp, Wrench } from 'lucide-react';
import { addDoc, collection, doc, getDocs, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

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
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('tube-50');
  const [adjustValue, setAdjustValue] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Loading inventory…');

  useEffect(() => {
    let unsubscribeInventory = null;
    let unsubscribeLogs = null;

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
          setInventory(inventoryData);
          setLoadingMessage('');
        });

        unsubscribeLogs = onSnapshot(logsRef, (snapshot) => {
          const parsedLogs = snapshot.docs
            .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
            .sort((a, b) => (b.timestamp?.toMillis?.() || b.timestamp || 0) - (a.timestamp?.toMillis?.() || a.timestamp || 0));
          setLogs(parsedLogs);
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
    };
  }, []);

  const inventoryRows = useMemo(() => {
    const inventoryMap = Object.fromEntries(inventory.map((item) => [item.productId, item]));

    return products.map((product) => {
      const stockInfo = inventoryMap[product.productId] || {
        currentStock: 0,
        totalWeightKg: 0,
        lastUpdated: null,
        updateSource: 'manual_entry',
        scaleSensorId: null,
      };

      return {
        id: product.productId,
        name: product.name,
        type: product.type,
        packaging: product.packaging,
        weightPerUnitKg: product.weightKg,
        price: product.price,
        isMonitoredByScale: product.isMonitoredByScale,
        currentStock: stockInfo.currentStock || 0,
        totalWeightKg: stockInfo.totalWeightKg || 0,
        lastUpdated: stockInfo.lastUpdated,
        updateSource: stockInfo.updateSource || 'manual_entry',
        scaleSensorId: stockInfo.scaleSensorId || null,
      };
    });
  }, [inventory, products]);

  const selectedItem = useMemo(
    () => inventoryRows.find((item) => item.id === selectedItemId) || inventoryRows[0],
    [inventoryRows, selectedItemId]
  );

  const totalActiveWeight = inventoryRows.reduce((sum, item) => sum + item.totalWeightKg, 0);
  const totalSacks = inventoryRows.reduce((sum, item) => sum + item.currentStock, 0);

  const handleOpenAdjust = (itemId) => {
    setSelectedItemId(itemId);
    setAdjustValue(0);
    setIsAdjustOpen(true);
  };

  const handleCalibrateScale = async () => {
    const currentUser = auth.currentUser;
    const currentProduct = inventoryRows[0];

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
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#4091c9]" />
          <h3 className="text-lg font-bold text-gray-800">Live Overview</h3>
        </div>

        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {loadingMessage || 'Inventory is synced with Firestore stores.'}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {inventoryRows.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-gray-800">{item.name}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">Pack size: {item.packaging} · {item.weightPerUnitKg}kg</p>
                  <div className="mt-2 inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    🟢 {item.isMonitoredByScale ? 'Scale Live (ESP32)' : 'Manual Override'}
                  </div>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{item.type}</span>
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

              <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 text-sm text-gray-600">
                <span className="flex items-center gap-2"><Scale className="h-4 w-4 text-[#4091c9]" /> {item.lastUpdated?.toDate ? item.lastUpdated.toDate().toLocaleString() : 'Pending update'}</span>
                <button
                  type="button"
                  onClick={() => handleOpenAdjust(item.id)}
                  className="font-semibold text-[#4091c9]"
                >
                  Adjust
                </button>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-dashed border-[#4091c9] bg-blue-50 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[#4091c9]">
              <TrendingUp className="h-5 w-5" />
              <p className="text-sm font-bold uppercase tracking-wide">Summary</p>
            </div>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>Total Weight</span>
                <span className="font-bold text-gray-900">{totalActiveWeight} kg</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Units</span>
                <span className="font-bold text-gray-900">{totalSacks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Scale Feed</span>
                <span className="font-bold text-green-700">Online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-7 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-[#4091c9]" />
          <h3 className="text-lg font-bold text-gray-800">Stock Adjustment Modal/Button</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenAdjust('tube-50')}
            className="rounded-xl bg-[#4091c9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2d75aa]"
          >
            Open Adjustment Panel
          </button>
          <p className="text-sm text-gray-500">Use this action to update inventory quantity with an operator traceable entry.</p>
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
              {logs.map((log) => {
                const productName = products.find((product) => product.productId === log.productId)?.name || log.productId;
                const changeLabel = log.changeQuantity >= 0 ? `+${log.changeQuantity}` : `${log.changeQuantity}`;

                return (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-gray-600">{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Pending'}</td>
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
