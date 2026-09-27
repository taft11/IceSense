const functions = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

initializeApp();

const firestore = getFirestore();

const SENSOR_EMPTY_DISTANCE = 58;
const SENSOR_FULL_DISTANCE = 25;

const getWaterPercent = (distance) => {
	if (!Number.isFinite(distance)) return null;
	if (distance <= SENSOR_FULL_DISTANCE) return 100;
	if (distance >= SENSOR_EMPTY_DISTANCE) return 0;

	return Math.max(
		0,
		Math.min(
			((SENSOR_EMPTY_DISTANCE - distance) / (SENSOR_EMPTY_DISTANCE - SENSOR_FULL_DISTANCE)) * 100,
			100
		)
	);
};

const getRecordedAt = (value) => {
	if (typeof value !== 'string') return Timestamp.now();

	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? Timestamp.now() : Timestamp.fromDate(date);
};

const getDateKeyInManila = (date) => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Manila',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(date);
	const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
	return `${values.year}-${values.month}-${values.day}`;
};

const shiftDateKey = (dateKey, days) => {
	const date = new Date(`${dateKey}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
};

const getItemWeightKg = (item, product) => {
	const storedWeight = Number(item.weightKg ?? product?.weightKg);
	if (Number.isFinite(storedWeight) && storedWeight > 0) return storedWeight;

	const name = String(item.name || item.productName || product?.name || '');
	const match = name.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
	return match ? Number(match[1]) : 0;
};

const getItemType = (item, product) => {
	const type = String(item.type || product?.type || '').toLowerCase();
	if (type.includes('crush')) return 'crushed';
	if (type.includes('tube')) return 'tube';

	const name = String(item.name || item.productName || product?.name || '').toLowerCase();
	if (name.includes('crushed')) return 'crushed';
	if (name.includes('tube')) return 'tube';
	return '';
};

const getDailyAnalytics = async (dateKey) => {
	const start = new Date(`${dateKey}T00:00:00+08:00`);
	const end = new Date(`${shiftDateKey(dateKey, 1)}T00:00:00+08:00`);
	const [ordersSnapshot, stockLogsSnapshot, environmentSnapshot, productsSnapshot] = await Promise.all([
		firestore.collection('orders').where('deliveryDate', '==', dateKey).get(),
		firestore.collection('stock_logs').where('timestamp', '>=', start).where('timestamp', '<', end).get(),
		firestore.collection('environment_logs').where('recordedAt', '>=', start).where('recordedAt', '<', end).get(),
		firestore.collection('products').get(),
	]);
	const products = new Map(productsSnapshot.docs.map((document) => [document.id, document.data()]));
	const breakdown = {
		tube_5kg_sacks: 0,
		tube_35kg_sacks: 0,
		tube_50kg_sacks: 0,
		crushed_5kg_sacks: 0,
		crushed_35kg_sacks: 0,
		crushed_50kg_sacks: 0,
	};
	let totalKgDemanded = 0;
	let totalKgProduced = 0;
	const temperatures = [];

	ordersSnapshot.docs.forEach((document) => {
		const order = document.data();
		const status = String(order.status || '').toLowerCase();
		const paymentStatus = String(order.paymentStatus || '').toLowerCase();
		const isExcluded = [status, paymentStatus].some((value) => (
			value.includes('cancel') || value.includes('reject') || value.includes('fail')
		));
		if (isExcluded) return;

		(order.items || []).forEach((item) => {
			const product = products.get(String(item.productId || ''));
			const quantity = Number(item.quantity || 0);
			const weightKg = getItemWeightKg(item, product);
			if (!Number.isFinite(quantity) || quantity <= 0 || weightKg <= 0) return;

			totalKgDemanded += weightKg * quantity;
			const type = getItemType(item, product);
			if (type && [5, 35, 50].includes(weightKg)) {
				breakdown[`${type}_${weightKg}kg_sacks`] += quantity;
			}
		});
	});

	stockLogsSnapshot.docs.forEach((document) => {
		const log = document.data();
		const quantity = Number(log.changeQuantity || 0);
		if (log.reason !== 'production_batch' || !Number.isFinite(quantity) || quantity <= 0) return;

		const product = products.get(String(log.productId || ''));
		const weightKg = Number(product?.weightKg || 0);
		if (weightKg > 0) totalKgProduced += quantity * weightKg;
	});

	environmentSnapshot.docs.forEach((document) => {
		const temperature = document.data().temperature;
		if (temperature === null || temperature === undefined || temperature === '') return;
		const value = Number(temperature);
		if (Number.isFinite(value)) temperatures.push(value);
	});

	const dayOfWeek = new Intl.DateTimeFormat('en-US', {
		weekday: 'long',
		timeZone: 'Asia/Manila',
	}).format(new Date(`${dateKey}T12:00:00+08:00`));
	const dayOfMonth = Number(dateKey.slice(-2));
	const isPayday = [14, 15, 16, 29, 30, 31].includes(dayOfMonth);

	return {
		date: dateKey,
		day_of_week: dayOfWeek,
		total_kg_demanded: totalKgDemanded,
		total_kg_produced: totalKgProduced,
		avg_temperature_c: temperatures.length
			? Math.round((temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length) * 10) / 10
			: null,
		is_payday_weekend: isPayday,
		event_tag: isPayday ? 'Payday' : '',
		...breakdown,
		generatedAt: Timestamp.now(),
	};
};

exports.copyIotLogToEnvironment = functions
	.region('asia-southeast1')
	.database.ref('IoT/Logs/{logId}')
	.onCreate(async (snapshot, context) => {
		const data = snapshot.val() || {};
		const temperature = Number(data.temperature);
		const humidity = Number(data.humidity);
		const distance = Number(data.distance);

		if (![temperature, humidity, distance].every(Number.isFinite)) {
			console.error('Skipping invalid IoT log:', context.params.logId, data);
			return null;
		}

		await firestore.collection('environment_logs').doc(context.params.logId).set({
			temperature,
			humidity,
			waterDistance: distance,
			waterPercent: getWaterPercent(distance),
			reason: String(data.reason || 'major_sensor_change'),
			recordedAt: getRecordedAt(data.timestamp),
			source: 'esp32_littlefs',
		});

		return null;
	});

exports.writeDailyAnalytics = functions
	.region('asia-southeast1')
	.pubsub.schedule('every day 01:00')
	.timeZone('Asia/Manila')
	.onRun(async () => {
		const today = getDateKeyInManila(new Date());
		const dateKey = shiftDateKey(today, -1);
		const dailyAnalytics = await getDailyAnalytics(dateKey);

		await firestore.collection('daily_analytics').doc(dateKey).set(dailyAnalytics);
		console.log(`Stored daily analytics for ${dateKey}`);
		return null;
	});