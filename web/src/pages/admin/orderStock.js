import { ref, runTransaction } from 'firebase/database';
import { database } from '../../services/firebase';

const PRODUCT_STOCK_PATHS = {
  'tube-5': ['tube_ice', '5kg_sacks'],
  'tube-35': ['tube_ice', '35kg_sacks'],
  'tube-50': ['tube_ice', '50kg_sacks'],
  'crushed-crate': ['crushed_ice', '5kg_sacks'],
  'crushed-sack': ['crushed_ice', '35kg_sacks'],
  'crushed-50': ['crushed_ice', '50kg_sacks'],
};

export const restoreCancelledOrderStock = async (order) => {
  if (!order?.id) return;

  const quantityByPath = new Map();
  (order.items || []).forEach((item) => {
    const [sectionKey, stockKey] = PRODUCT_STOCK_PATHS[item.productId] || [];
    const quantity = Number(item.quantity || 0);
    if (!sectionKey || !stockKey || quantity <= 0) return;

    const path = `${sectionKey}/sacks_breakdown/${stockKey}`;
    quantityByPath.set(path, (quantityByPath.get(path) || 0) + quantity);
  });

  if (quantityByPath.size === 0) return;

  const result = await runTransaction(ref(database, 'inventory/scale_1'), (currentInventory) => {
    const inventory = currentInventory || {};
    if (inventory.stockRestorations?.[order.id]) return;

    const nextInventory = { ...inventory };
    quantityByPath.forEach((quantity, path) => {
      const [sectionKey, , stockKey] = path.split('/');
      const section = { ...(nextInventory[sectionKey] || {}) };
      const breakdown = { ...(section.sacks_breakdown || {}) };
      breakdown[stockKey] = Number(breakdown[stockKey] || 0) + quantity;
      section.sacks_breakdown = breakdown;
      section.total_sacks = Object.values(breakdown).reduce((sum, value) => sum + Number(value || 0), 0);
      section.last_updated = new Date().toISOString();
      nextInventory[sectionKey] = section;
    });

    nextInventory.stockRestorations = {
      ...(nextInventory.stockRestorations || {}),
      [order.id]: true,
    };
    return nextInventory;
  });

  if (!result.committed) {
    throw new Error('Stock restoration was not committed.');
  }
};
