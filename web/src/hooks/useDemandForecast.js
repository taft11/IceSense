import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const HISTORICAL_YEARS = 5;

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

const getHistoricalDateKeys = (date) => Array.from({ length: HISTORICAL_YEARS }, (_, index) => {
  const historicalDate = new Date(date);
  historicalDate.setFullYear(date.getFullYear() - index - 1);
  return formatDateKey(historicalDate);
});

const getWeekendDemandMultiplier = (date) => {
  if ([5, 6].includes(date.getDay())) return 1.45;
  if (date.getDay() === 0) return 1.25;
  return 1;
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
  const isPayday = Boolean(data.is_payday_weekend ?? data.isPaydayWeekend ?? false);
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
  if (isPayday) {
    const isWeekend = [0, 5, 6].includes(dayOfWeek);
    drivers.push({
      label: isWeekend ? 'Payday weekend' : 'Payday',
      impactPercent: 25,
      type: 'calendar',
      status: 'positive',
      message: isWeekend ? 'Payday weekend surge is lifting expected orders' : 'Payday demand is lifting expected orders',
    });
  }
  if (eventTag && eventTag !== 'Normal Day' && !isPayday) {
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
  const fallbackDate = new Date(`${dateKey}T00:00:00`);
  const weekendMultiplier = getWeekendDemandMultiplier(fallbackDate);
  const isPayday = [14, 15, 16, 29, 30, 31].includes(fallbackDate.getDate());
  const scenarios = [
    { label: 'Baseline demand', impactPercent: 0, type: 'operations', status: 'neutral', message: 'Opening day is tracking close to the normal order curve' },
    { label: 'Payday weekend', impactPercent: 25, type: 'calendar', status: 'positive', message: 'Payday weekend surge is lifting expected orders' },
    { label: '32.6°C high temp', impactPercent: 18, type: 'weather', status: 'positive', message: 'Hot afternoon conditions are driving cooling demand' },
    { label: 'Local market event', impactPercent: 12, type: 'local', status: 'warning', message: 'A local event may create an uneven demand pattern' },
    { label: 'Rain risk', impactPercent: -8, type: 'weather', status: 'warning', message: 'Rain may soften walk-in demand despite steady commercial orders' },
    { label: 'Baseline demand', impactPercent: 0, type: 'operations', status: 'neutral', message: 'Volume is settling back toward the normal order curve' },
    { label: 'Heatwave tailwind', impactPercent: 16, type: 'weather', status: 'positive', message: 'Lingering heat is keeping cooling demand elevated' },
  ];
  const selectedScenario = scenarios[index % scenarios.length];
  const drivers = [selectedScenario.label === 'Payday weekend' && !isPayday ? scenarios[0] : selectedScenario];

  return {
    date: dateKey,
    total_kg_demanded: Math.round(baseDemand * weekendMultiplier),
    total_kg_produced: baseProduced,
    avg_temperature_c: 31 + index * 0.8,
    is_payday_weekend: isPayday,
    event_tag: isPayday ? 'Payday' : '',
    drivers,
    breakdown: {
      tube_5kg_sacks: Math.round((baseDemand * weekendMultiplier * 0.60 * 0.20) / 5),
      tube_35kg_sacks: Math.round((baseDemand * weekendMultiplier * 0.60 * 0.45) / 35),
      tube_50kg_sacks: Math.round((baseDemand * weekendMultiplier * 0.60 * 0.35) / 50),
      crushed_5kg_sacks: Math.round((baseDemand * weekendMultiplier * 0.40 * 0.20) / 5),
      crushed_35kg_sacks: Math.round((baseDemand * weekendMultiplier * 0.40 * 0.45) / 35),
      crushed_50kg_sacks: Math.round((baseDemand * weekendMultiplier * 0.40 * 0.35) / 50),
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
    tube_5kg_sacks: Number(data.tube_5kg_sacks ?? data.breakdown?.tube_5kg_sacks ?? 0),
    tube_35kg_sacks: Number(data.tube_35kg_sacks ?? data.breakdown?.tube_35kg_sacks ?? 0),
    tube_50kg_sacks: Number(data.tube_50kg_sacks ?? data.breakdown?.tube_50kg_sacks ?? 0),
    crushed_5kg_sacks: Number(data.crushed_5kg_sacks ?? data.breakdown?.crushed_5kg_sacks ?? 0),
    crushed_35kg_sacks: Number(data.crushed_35kg_sacks ?? data.breakdown?.crushed_35kg_sacks ?? 0),
    crushed_50kg_sacks: Number(data.crushed_50kg_sacks ?? data.breakdown?.crushed_50kg_sacks ?? 0),
  },
});

const averageField = (records, field) => {
  const values = records
    .map((record) => Number(record[field]))
    .filter((value) => Number.isFinite(value));

  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
};

const averageBreakdownField = (records, field) => averageField(
  records.map((record) => record.breakdown || {}),
  field
);

const getMostCommonEvent = (records) => {
  const eventCounts = records.reduce((counts, record) => {
    const event = String(record.event_tag ?? record.eventTag ?? '').trim();
    if (event && event !== 'Normal Day') counts.set(event, (counts.get(event) || 0) + 1);
    return counts;
  }, new Map());

  return [...eventCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || '';
};

const aggregateHistoricalForecast = (records, forecastDate) => {
  const normalizedRecords = records.map((record) => normalizeForecastData(record, forecastDate));
  const weekendMultiplier = getWeekendDemandMultiplier(forecastDate);
  const breakdownFields = [
    'tube_5kg_sacks',
    'tube_35kg_sacks',
    'tube_50kg_sacks',
    'crushed_5kg_sacks',
    'crushed_35kg_sacks',
    'crushed_50kg_sacks',
  ];
  const aggregated = {
    total_kg_demanded: averageField(normalizedRecords, 'total_kg_demanded') * weekendMultiplier,
    total_kg_produced: averageField(normalizedRecords, 'total_kg_produced'),
    avg_temperature_c: averageField(normalizedRecords, 'avg_temperature_c'),
    rain_probability: averageField(normalizedRecords, 'rain_probability'),
    is_payday_weekend: normalizedRecords.filter((record) => record.is_payday_weekend).length >= Math.ceil(normalizedRecords.length / 2),
    event_tag: getMostCommonEvent(records),
    breakdown: Object.fromEntries(breakdownFields.map((field) => [field, Math.round(averageBreakdownField(normalizedRecords, field) * weekendMultiplier)])),
  };

  return {
    ...aggregated,
    drivers: normalizeDrivers(aggregated, forecastDate),
  };
};

const findForecastWindow = async (baseDate, dayCount = 7) => {
  const startDate = new Date(baseDate);
  const displayDates = Array.from({ length: dayCount }, (_, index) => addDays(startDate, index));

  return Promise.all(
    displayDates.map(async (displayDate) => {
      const displayDateKey = formatDateKey(displayDate);
      const snapshots = await Promise.all(
        getHistoricalDateKeys(displayDate).map((dateKey) => getDoc(doc(db, 'daily_analytics', dateKey)))
      );
      const historicalRecords = snapshots.filter((snapshot) => snapshot.exists()).map((snapshot) => snapshot.data());

      if (historicalRecords.length === 0) {
        return {
          date: displayDateKey,
          label: displayDate.toLocaleDateString('en-US', { weekday: 'short' }),
          ...getFallbackForecast(displayDateKey, index),
        };
      }

      const normalized = aggregateHistoricalForecast(historicalRecords, displayDate);
      const label = displayDate.toLocaleDateString('en-US', { weekday: 'short' });

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
