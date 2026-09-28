const functions = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { Resend } = require('resend');

initializeApp();

const firestore = getFirestore();
const resend = new Resend(functions.config().resend.apikey);

const TANK_TOTAL_HEIGHT = 33;
const SENSOR_BLINDSPOT_DISTANCE = 20;

const getWaterPercent = (distance) => {
	if (!Number.isFinite(distance)) return null;
	const waterDepth = TANK_TOTAL_HEIGHT * ((TANK_TOTAL_HEIGHT - distance) / (TANK_TOTAL_HEIGHT - SENSOR_BLINDSPOT_DISTANCE));

	return Math.max(
		0,
		Math.min(
			(waterDepth / TANK_TOTAL_HEIGHT) * 100,
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

exports.sendOrderConfirmationEmail = functions
	.region('asia-southeast1')
	.firestore.document('orders/{orderId}')
	.onUpdate(async (change, context) => {
		const before = change.before.data() || {};
		const after = change.after.data() || {};
		const orderId = context.params.orderId;
		const previousPaymentStatus = String(before.paymentStatus || '').toUpperCase();
		const currentPaymentStatus = String(after.paymentStatus || '').toUpperCase();

		if (previousPaymentStatus === currentPaymentStatus) {
			return null;
		}

		if (currentPaymentStatus !== 'PAID') {
			return null;
		}

		const customerEmail = after.customerEmail;
		const customerName = after.customerName || 'Customer';
		if (!customerEmail) {
			console.log(`No customer email found for order ${orderId}`);
			return null;
		}

		try {
			const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;',
			})[character]);
			const formatPeso = (value) => `₱${(Number(value) || 0).toFixed(2)}`;
			const formatDate = (value, includeTime = false) => {
				if (!value) return 'Not provided';
				const date = typeof value.toDate === 'function'
					? value.toDate()
					: new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T12:00:00+08:00` : value);
				if (Number.isNaN(date.getTime())) return escapeHtml(value);
				return new Intl.DateTimeFormat('en-PH', {
					dateStyle: 'medium',
					...(includeTime ? { timeStyle: 'short' } : {}),
					timeZone: 'Asia/Manila',
				}).format(date);
			};
			const items = Array.isArray(after.items) ? after.items : [];
			const deliveryFee = Number(after.deliveryFee) || 0;
			const total = Number(after.total) || 0;
			const subtotal = Math.max(total - deliveryFee, 0);
			const fulfillmentMethod = String(after.fulfillmentMethod || 'delivery').toLowerCase();
			const isPickup = fulfillmentMethod === 'pickup';
			const itemRows = items.map((item) => {
				const quantity = Number(item.quantity) || 0;
				const price = Number(item.price) || 0;
				return `
					<tr>
						<td style="padding:12px 8px;border-bottom:1px solid #e5edf1;color:#263943;">${escapeHtml(item.name || 'Ice product')}</td>
						<td style="padding:12px 8px;border-bottom:1px solid #e5edf1;text-align:center;color:#52636d;">${quantity}</td>
						<td style="padding:12px 8px;border-bottom:1px solid #e5edf1;text-align:right;color:#52636d;">${formatPeso(price)}</td>
						<td style="padding:12px 8px;border-bottom:1px solid #e5edf1;text-align:right;color:#263943;font-weight:600;">${formatPeso(price * quantity)}</td>
					</tr>`;
			}).join('');
			const deliveryDetails = isPickup
				? '<p style="margin:0;color:#263943;"><strong>Fulfillment:</strong> Pickup</p>'
				: `<p style="margin:0 0 8px;color:#263943;"><strong>Delivery address:</strong> ${escapeHtml(after.shippingAddress || 'Not provided')}</p>
					${after.landmark ? `<p style="margin:0;color:#52636d;"><strong>Landmark:</strong> ${escapeHtml(after.landmark)}</p>` : ''}`;

			const emailResponse = await resend.emails.send({
				from: 'Bella Erin Tube Ice <orders@bellaerintubeice.com>',
				to: [customerEmail],
				subject: `Order confirmed | #${orderId}`,
				html: `
					<div style="margin:0;background:#f2f7f9;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#263943;">
						<div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e1ebef;border-radius:8px;overflow:hidden;">
							<div style="padding:24px;text-align:center;border-bottom:1px solid #e8eff2;">
								<img src="https://icesense-cdf63.web.app/logo.png" alt="Bella Erin Tube Ice" width="180" style="display:block;width:180px;max-width:70%;height:auto;margin:0 auto 12px;">
								<p style="margin:0;color:#64808d;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Order confirmation</p>
							</div>
							<div style="padding:28px 24px 12px;">
								<h1 style="margin:0 0 10px;color:#183b4a;font-size:24px;line-height:1.3;">Thank you, ${escapeHtml(customerName)}!</h1>
								<p style="margin:0;color:#52636d;font-size:15px;line-height:1.6;">Your payment has been confirmed and your order is now being processed.</p>
								<p style="margin:18px 0 0;padding:12px 14px;background:#edf7fb;border-radius:6px;color:#236c8a;font-size:14px;"><strong>Order #${escapeHtml(orderId)}</strong></p>
								<p style="margin:12px 0 0;color:#52636d;font-size:13px;"><strong>Placed:</strong> ${formatDate(after.createdAt, true)}</p>
							</div>
							<div style="padding:12px 24px 22px;">
								<h2 style="margin:0 0 12px;color:#183b4a;font-size:16px;">Order details</h2>
								<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
									<thead><tr style="background:#f4f8fa;color:#52636d;text-align:left;">
										<th style="padding:10px 8px;font-weight:600;">Item</th><th style="padding:10px 8px;text-align:center;font-weight:600;">Qty</th><th style="padding:10px 8px;text-align:right;font-weight:600;">Price</th><th style="padding:10px 8px;text-align:right;font-weight:600;">Amount</th>
									</tr></thead>
									<tbody>${itemRows || '<tr><td colspan="4" style="padding:12px 8px;color:#52636d;">Item details unavailable</td></tr>'}</tbody>
								</table>
								<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;font-size:14px;">
									<tr><td style="padding:5px 0;color:#52636d;">Subtotal</td><td style="padding:5px 0;text-align:right;color:#263943;">${formatPeso(subtotal)}</td></tr>
									<tr><td style="padding:5px 0;color:#52636d;">Delivery fee</td><td style="padding:5px 0;text-align:right;color:#263943;">${isPickup ? '₱0.00' : formatPeso(deliveryFee)}</td></tr>
									<tr><td style="padding:12px 0 0;border-top:1px solid #dce7eb;color:#183b4a;font-size:16px;font-weight:700;">Amount paid</td><td style="padding:12px 0 0;border-top:1px solid #dce7eb;text-align:right;color:#183b4a;font-size:16px;font-weight:700;">${formatPeso(total)}</td></tr>
								</table>
							</div>
							<div style="padding:20px 24px;background:#f7fafb;border-top:1px solid #e8eff2;">
								<h2 style="margin:0 0 12px;color:#183b4a;font-size:16px;">${isPickup ? 'Pickup schedule' : 'Delivery schedule'}</h2>
								<p style="margin:0 0 8px;color:#263943;"><strong>Method:</strong> ${isPickup ? 'Pickup' : 'Delivery'}</p>
								<p style="margin:0 0 8px;color:#263943;"><strong>Date:</strong> ${formatDate(after.deliveryDate)}</p>
								<p style="margin:0 0 8px;color:#263943;"><strong>Time:</strong> ${escapeHtml(after.deliveryTimeSlot || after.deliverySlot || 'Not provided')}</p>
								${isPickup ? '' : deliveryDetails}
								<h2 style="margin:22px 0 12px;color:#183b4a;font-size:16px;">Payment</h2>
								<p style="margin:0 0 8px;color:#263943;"><strong>Method:</strong> ${escapeHtml(after.paymentMethod || 'Not provided')}</p>
								${after.paymentReferenceNumber ? `<p style="margin:0;color:#263943;"><strong>Reference number:</strong> ${escapeHtml(after.paymentReferenceNumber)}</p>` : ''}
								<p style="margin:22px 0 0;color:#52636d;font-size:13px;line-height:1.6;">We’ll send updates as your order progresses. Please keep this email for your records.</p>
							</div>
							<div style="padding:16px 24px;text-align:center;border-top:1px solid #e8eff2;color:#71828b;font-size:12px;">Bella Erin Tube Ice</div>
						</div>
					</div>
				`,
			});

			console.log(`Order confirmation email sent for ${orderId}:`, emailResponse);
			return null;
		} catch (error) {
			console.error(`Failed to send order confirmation email for ${orderId}:`, error);
			return null;
		}
	});