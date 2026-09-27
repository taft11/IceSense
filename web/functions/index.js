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