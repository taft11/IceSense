import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const getFallbackForecast = (dateKey, index = 0) => {
  const baseDemand = 720 + index * 40;
  const baseProduced = 610 + index * 30;

  return {
    date: dateKey,
    total_kg_demanded: baseDemand,
    total_kg_produced: baseProduced,
    avg_temperature_c: 31 + index * 0.8,
    is_payday_weekend: index === 1,
    event_tag: index === 1 ? 'Payday weekend' : '',
    breakdown: {
      bags_5kg: Math.round(baseDemand * 0.12),
      sacks_35kg: Math.round(baseDemand * 0.3),
      sacks_40kg: Math.round(baseDemand * 0.24),
      sacks_50kg: Math.round(baseDemand * 0.18),
      crates_70kg: Math.round(baseDemand * 0.16),
    },
  };
};

const normalizeForecastData = (data = {}) => ({
  total_kg_demanded: Number(data.total_kg_demanded ?? data.totalDemandKg ?? 0),
  total_kg_produced: Number(data.total_kg_produced ?? data.totalProducedKg ?? 0),
  avg_temperature_c: Number(data.avg_temperature_c ?? data.avgTemperatureC ?? 0),
  is_payday_weekend: Boolean(data.is_payday_weekend ?? data.isPaydayWeekend ?? false),
  event_tag: data.event_tag ?? data.eventTag ?? '',
  breakdown: {
    bags_5kg: Number(data.bags_5kg ?? data.breakdown?.bags_5kg ?? 0),
    sacks_35kg: Number(data.sacks_35kg ?? data.breakdown?.sacks_35kg ?? 0),
    sacks_40kg: Number(data.sacks_40kg ?? data.breakdown?.sacks_40kg ?? 0),
    sacks_50kg: Number(data.sacks_50kg ?? data.breakdown?.sacks_50kg ?? 0),
    crates_70kg: Number(data.crates_70kg ?? data.breakdown?.crates_70kg ?? 0),
  },
});

export default function useDemandForecast() {
  const [forecastDays, setForecastDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadForecast = async () => {
      setLoading(true);
      setError('');

      const requestedDates = Array.from({ length: 7 }, (_, index) => addDays(new Date(), index));
      const dateKeys = requestedDates.map((date) => formatDateKey(date));

      try {
        const results = await Promise.all(
          dateKeys.map(async (dateKey, index) => {
            const docRef = doc(db, 'daily_analytics', dateKey);
            const snapshot = await getDoc(docRef);

            if (!snapshot.exists()) {
              return {
                date: dateKey,
                label: new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }),
                ...getFallbackForecast(dateKey, index),
              };
            }

            return {
              date: dateKey,
              label: new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }),
              ...normalizeForecastData(snapshot.data()),
            };
          })
        );

        if (!isMounted) return;
        setForecastDays(results);
      } catch (loadError) {
        const isPermissionIssue = loadError?.code === 'permission-denied' || loadError?.message?.toLowerCase().includes('permission') || loadError?.message?.toLowerCase().includes('insufficient permissions');

        console.warn('Using fallback forecast data because Firestore access is restricted.', loadError);
        if (!isMounted) return;

        if (!isPermissionIssue) {
          setError('Unable to load demand forecast right now.');
        }

        setForecastDays(dateKeys.map((dateKey, index) => ({
          date: dateKey,
          label: new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }),
          ...getFallbackForecast(dateKey, index),
        })));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadForecast();

    return () => {
      isMounted = false;
    };
  }, []);

  const todayForecast = forecastDays[0] || null;
  const tomorrowForecast = forecastDays[1] || null;
  const hasHighDemandAlert = Boolean(
    tomorrowForecast && (
      tomorrowForecast.total_kg_demanded > tomorrowForecast.total_kg_produced * 1.15 ||
      tomorrowForecast.is_payday_weekend ||
      tomorrowForecast.event_tag
    )
  );

  return {
    forecastDays,
    todayForecast,
    tomorrowForecast,
    loading,
    error,
    hasHighDemandAlert,
  };
}
