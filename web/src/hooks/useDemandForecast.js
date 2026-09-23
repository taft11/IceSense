import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * @typedef {{ label: string, impactPercent: number, type?: 'weather' | 'calendar' | 'local' | 'operations', status?: 'positive' | 'warning' | 'neutral', message?: string }} ForecastDriver
 */

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

const normalizeDrivers = (data = {}, forecastDate) => {
  if (Array.isArray(data.drivers) && data.drivers.length > 0) {
    return data.drivers.map((driver) => ({
      label: String(driver.label ?? driver.name ?? 'Unknown driver'),
      impactPercent: Number(driver.impactPercent ?? driver.impact_percentage ?? driver.impact ?? 0),
      type: driver.type,
      status: driver.status || (Number(driver.impactPercent ?? driver.impact_percentage ?? driver.impact ?? 0) < 0 ? 'warning' : Number(driver.impactPercent ?? driver.impact_percentage ?? driver.impact ?? 0) >= 15 ? 'positive' : 'neutral'),
      message: driver.message,
    }));
  }

  const drivers = [];
  const temperature = Number(data.avg_temperature_c ?? data.avgTemperatureC ?? 0);
  const rainProbability = Number(data.rain_probability ?? data.rainProbability ?? 0);
  const isPaydayWeekend = Boolean(data.is_payday_weekend ?? data.isPaydayWeekend ?? false);
  const eventTag = data.event_tag ?? data.eventTag ?? '';
  const dayOfWeek = forecastDate?.getDay();

  if ([5, 6].includes(dayOfWeek)) {
    drivers.push({ label: 'Friday/Saturday demand uplift', impactPercent: 45, type: 'calendar', status: 'positive', message: 'Weekend buying pattern is lifting commercial and retail orders' });
  } else if (dayOfWeek === 0) {
    drivers.push({ label: 'Sunday demand uplift', impactPercent: 25, type: 'calendar', status: 'positive', message: 'Sunday activity is keeping demand above the weekday baseline' });
  }

  if (temperature >= 32) {
    drivers.push({ label: 'High heat', impactPercent: Math.min(20, Math.round((temperature - 28) * 3)), type: 'weather', status: 'positive', message: `${temperature.toFixed(1)}°C high temp driving cooling demand` });
  }
  if (rainProbability >= 50) {
    drivers.push({ label: 'Rain risk', impactPercent: -Math.round(rainProbability / 10), type: 'weather', status: 'warning', message: `${rainProbability}% rain chance may soften walk-in demand` });
  }
  if (isPaydayWeekend) {
    drivers.push({ label: 'Payday weekend', impactPercent: 25, type: 'calendar', status: 'positive', message: 'Payday weekend surge is lifting expected orders' });
  }
  if (eventTag && eventTag !== 'Normal Day' && !isPaydayWeekend) {
    const eventDetails = {
      'Christmas/New Year Peak': { impactPercent: 100, status: 'positive', message: 'Holiday gatherings are creating an exceptional seasonal demand peak' },
      'Halloween Gathering': { impactPercent: 40, status: 'positive', message: 'Halloween gatherings are adding a short seasonal demand spike' },
      'Undas Manila Exodus': { impactPercent: -25, status: 'warning', message: 'The Manila exodus is reducing local walk-in demand' },
      'Holy Week Exodus': { impactPercent: -50, status: 'warning', message: 'Holy Week travel is pulling demand below the normal baseline' },
    };
    const details = eventDetails[eventTag] || { impactPercent: 12, status: 'warning', message: `${eventTag} may create an uneven demand pattern` };
    drivers.push({ label: String(eventTag), type: 'local', ...details });
  }

  return drivers.length > 0
    ? drivers
    : [{ label: 'Normal weekday baseline', impactPercent: 0, type: 'operations', status: 'neutral', message: 'No seasonal, calendar, or event uplift was detected' }];
};

const getFallbackForecast = (dateKey, index = 0) => {
  const baseDemand = 720 + index * 40;
  const baseProduced = 610 + index * 30;
  const scenarios = [
    { label: 'Baseline demand', impactPercent: 0, type: 'operations', status: 'neutral', message: 'Opening day is tracking close to the normal order curve' },
    { label: 'Payday weekend', impactPercent: 25, type: 'calendar', status: 'positive', message: 'Payday weekend surge is lifting expected orders' },
    { label: '32.6°C high temp', impactPercent: 18, type: 'weather', status: 'positive', message: 'Hot afternoon conditions are driving cooling demand' },
    { label: 'Local market event', impactPercent: 12, type: 'local', status: 'warning', message: 'A local event may create an uneven demand pattern' },
    { label: 'Rain risk', impactPercent: -8, type: 'weather', status: 'warning', message: 'Rain may soften walk-in demand despite steady commercial orders' },
    { label: 'Baseline demand', impactPercent: 0, type: 'operations', status: 'neutral', message: 'Volume is settling back toward the normal order curve' },
    { label: 'Heatwave tailwind', impactPercent: 16, type: 'weather', status: 'positive', message: 'Lingering heat is keeping cooling demand elevated' },
  ];
  const drivers = [scenarios[index % scenarios.length]];

  return {
    date: dateKey,
    total_kg_demanded: baseDemand,
    total_kg_produced: baseProduced,
    avg_temperature_c: 31 + index * 0.8,
    is_payday_weekend: index === 1,
    event_tag: index === 1 ? 'Payday weekend' : '',
    drivers,
    breakdown: {
      bags_5kg: Math.round(baseDemand * 0.12),
      sacks_35kg: Math.round(baseDemand * 0.3),
      sacks_40kg: Math.round(baseDemand * 0.24),
      sacks_50kg: Math.round(baseDemand * 0.18),
      crates_70kg: Math.round(baseDemand * 0.16),
    },
  };
};

const normalizeForecastData = (data = {}, forecastDate) => ({
  total_kg_demanded: Number(data.total_kg_demanded ?? data.totalDemandKg ?? 0),
  total_kg_produced: Number(data.total_kg_produced ?? data.totalProducedKg ?? 0),
  avg_temperature_c: Number(data.avg_temperature_c ?? data.avgTemperatureC ?? 0),
  is_payday_weekend: Boolean(data.is_payday_weekend ?? data.isPaydayWeekend ?? false),
  event_tag: data.event_tag ?? data.eventTag ?? '',
  rain_probability: Number(data.rain_probability ?? data.rainProbability ?? 0),
  drivers: normalizeDrivers(data, forecastDate),
  breakdown: {
    bags_5kg: Number(data.bags_5kg ?? data.breakdown?.bags_5kg ?? 0),
    sacks_35kg: Number(data.sacks_35kg ?? data.breakdown?.sacks_35kg ?? 0),
    sacks_40kg: Number(data.sacks_40kg ?? data.breakdown?.sacks_40kg ?? 0),
    sacks_50kg: Number(data.sacks_50kg ?? data.breakdown?.sacks_50kg ?? 0),
    crates_70kg: Number(data.crates_70kg ?? data.breakdown?.crates_70kg ?? 0),
  },
});

const findForecastWindow = async (baseDate, dayCount = 7) => {
  const startDate = new Date(baseDate);
  const displayDates = Array.from({ length: dayCount }, (_, index) => addDays(startDate, index));
  const dataDates = displayDates.map((date) => addDays(date, -364));

  return Promise.all(
    dataDates.map(async (dataDate, index) => {
      const displayDate = displayDates[index];
      const displayDateKey = formatDateKey(displayDate);
      const dataDateKey = formatDateKey(dataDate);
      const snapshot = await getDoc(doc(db, 'daily_analytics', dataDateKey));

      if (!snapshot.exists()) {
        return {
          date: displayDateKey,
          label: displayDate.toLocaleDateString('en-US', { weekday: 'short' }),
          ...getFallbackForecast(displayDateKey, index),
        };
      }

      const docData = snapshot.data();
      const normalized = normalizeForecastData(docData, displayDate);
      const label = docData.day_of_week
        ? String(docData.day_of_week).slice(0, 3)
        : displayDate.toLocaleDateString('en-US', { weekday: 'short' });

      return {
        date: displayDateKey,
        label,
        ...normalized,
      };
    })
  );
};

export default function useDemandForecast() {
  const [forecastDays, setForecastDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadForecast = async () => {
      setLoading(true);
      setError('');

      try {
        const results = await findForecastWindow(new Date(), 7);

        if (!isMounted) return;
        setForecastDays(results);
      } catch (loadError) {
        const isPermissionIssue = loadError?.code === 'permission-denied' || loadError?.message?.toLowerCase().includes('permission') || loadError?.message?.toLowerCase().includes('insufficient permissions');

        console.warn('Using fallback forecast data because Firestore access is restricted.', loadError);
        if (!isMounted) return;

        if (!isPermissionIssue) {
          setError('Unable to load demand forecast right now.');
        }

        const requestedDates = Array.from({ length: 7 }, (_, index) => addDays(new Date(), index));
        const dateKeys = requestedDates.map((date) => formatDateKey(date));

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

  const currentForecast = forecastDays[0] || null;
  const nextForecast = forecastDays[1] || currentForecast;
  const latestForecast = forecastDays[forecastDays.length - 1] || currentForecast;
  const hasHighDemandAlert = Boolean(
    currentForecast && (
      currentForecast.total_kg_demanded > currentForecast.total_kg_produced * 1.15 ||
      currentForecast.is_payday_weekend ||
      currentForecast.event_tag
    )
  );

  return {
    forecastDays,
    todayForecast: currentForecast,
    tomorrowForecast: nextForecast,
    latestForecast,
    loading,
    error,
    hasHighDemandAlert,
  };
}
