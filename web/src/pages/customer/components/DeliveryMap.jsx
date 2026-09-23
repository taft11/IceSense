import { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet/dist/leaflet-src.esm.js';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, MapPinned, Navigation } from 'lucide-react';

const toCoordinate = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
};

const icon = (color) => L.divIcon({
  className: '',
  html: `<span style="display:block;width:18px;height:18px;border:3px solid white;border-radius:999px;background:${color};box-shadow:0 2px 8px rgba(15,23,42,.35)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const liveStatuses = ['out for delivery', 'in transit', 'on the way', 'attempting'];

export default function DeliveryMap({ order, isOpen = false }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const routeRef = useRef(null);
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [geocodedDestination, setGeocodedDestination] = useState(null);
  const destinationLatitude = order?.deliveryLatitude ?? order?.deliveryLocation?.latitude;
  const destinationLongitude = order?.deliveryLongitude ?? order?.deliveryLocation?.longitude;
  const driverLatitude = order?.driverLocation?.latitude;
  const driverLongitude = order?.driverLocation?.longitude;
  const originLatitude = order?.deliveryOrigin?.latitude;
  const originLongitude = order?.deliveryOrigin?.longitude;
  const savedDestination = useMemo(() => toCoordinate(destinationLatitude, destinationLongitude), [destinationLatitude, destinationLongitude]);
  const destination = savedDestination || geocodedDestination;
  const driverLocation = useMemo(() => toCoordinate(driverLatitude, driverLongitude), [driverLatitude, driverLongitude]);
  const origin = useMemo(() => toCoordinate(originLatitude, originLongitude), [originLatitude, originLongitude]);
  const routeStart = driverLocation || origin;
  const destinationKey = destination ? `${destination.latitude},${destination.longitude}` : '';
  const startKey = routeStart ? `${routeStart.latitude},${routeStart.longitude}` : '';
  const status = String(order?.deliveryStatus || order?.status || '').toLowerCase().replace(/_/g, ' ');
  const trackingStarted = Boolean(order?.deliveryStartedAt || order?.driverLocation || order?.deliveryOrigin || liveStatuses.includes(status));
  const trackingVisible = isOpen || trackingStarted;

  useEffect(() => {
    if (savedDestination || !order?.shippingAddress) return undefined;

    const controller = new AbortController();
    const geocodeAddress = async () => {
      try {
        const params = new URLSearchParams({
          q: order.shippingAddress,
          format: 'jsonv2',
          limit: '1',
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        const [result] = await response.json();
        if (result) setGeocodedDestination(toCoordinate(result.lat, result.lon));
      } catch (error) {
        if (error.name !== 'AbortError') setRouteError('Add a map location to show the delivery route.');
      }
    };

    geocodeAddress();
    return () => controller.abort();
  }, [order?.shippingAddress, savedDestination]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !destination || !trackingVisible) return undefined;
    const map = L.map(mapContainerRef.current, { zoomControl: false, scrollWheelZoom: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    const resize = () => map.invalidateSize();
    window.addEventListener('resize', resize);
    window.requestAnimationFrame(resize);
    return () => { window.removeEventListener('resize', resize); map.remove(); mapRef.current = null; markersRef.current = {}; routeRef.current = null; };
  }, [destination, trackingVisible]);

  useEffect(() => {
    if (!mapRef.current || !destination || !trackingVisible) return;
    const map = mapRef.current;
    const points = [routeStart, destination].filter(Boolean).map(({ latitude, longitude }) => [latitude, longitude]);
    if (!markersRef.current.destination) markersRef.current.destination = L.marker([destination.latitude, destination.longitude], { icon: icon('#e05252') }).addTo(map).bindTooltip('Customer address');
    else markersRef.current.destination.setLatLng([destination.latitude, destination.longitude]);
    if (routeStart) {
      const label = driverLocation ? 'Driver location' : 'Previous delivery location';
      if (!markersRef.current.start) markersRef.current.start = L.marker([routeStart.latitude, routeStart.longitude], { icon: icon('#4091c9') }).addTo(map).bindTooltip(label);
      else { markersRef.current.start.setLatLng([routeStart.latitude, routeStart.longitude]); markersRef.current.start.setTooltipContent(label); }
    }
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 15 });
  }, [destination, destinationKey, driverLocation, routeStart, startKey, trackingVisible]);

  useEffect(() => {
    if (!mapRef.current || !routeStart || !destination || !trackingVisible) return undefined;
    const controller = new AbortController();
    const loadRoute = async () => {
      try {
        setRouteError('');
        const start = `${routeStart.longitude},${routeStart.latitude}`;
        const end = `${destination.longitude},${destination.latitude}`;
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`, { signal: controller.signal });
        if (!response.ok) throw new Error('Route unavailable');
        const data = await response.json();
        const selectedRoute = data.routes?.[0];
        const latLngs = selectedRoute?.geometry?.coordinates?.map(([longitude, latitude]) => [latitude, longitude]) || [];
        if (!latLngs.length) throw new Error('Route unavailable');
        setRoute({ latLngs, distance: selectedRoute.distance, duration: selectedRoute.duration });
      } catch (error) { if (error.name !== 'AbortError') setRouteError('Road directions are temporarily unavailable.'); }
    };
    loadRoute();
    return () => controller.abort();
  }, [destination, destinationKey, routeStart, startKey, trackingVisible]);

  useEffect(() => {
    if (!mapRef.current || !route) return;
    routeRef.current?.remove();
    routeRef.current = L.polyline(route.latLngs, { color: '#4091c9', weight: 5, opacity: 0.85 }).addTo(mapRef.current);
  }, [route]);

  if (!trackingVisible) return null;

  if (!destination) {
    return (
      <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" aria-label="Live delivery map">
        <div className="flex items-center gap-2 font-semibold"><MapPinned className="h-4 w-4" />Delivery tracking is waiting for map coordinates</div>
        <p className="mt-2">The driver must start delivery with GPS enabled before the live route can appear.</p>
      </section>
    );
  }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-sky-200 bg-white" aria-label="Live delivery map">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-sky-50 px-4 py-3"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><MapPinned className="h-4 w-4 text-[#4091c9]" /><span>{liveStatuses.includes(status) ? 'Live delivery tracking' : 'Delivery route'}</span>{liveStatuses.includes(status) && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />}</div><a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#2d75aa] hover:underline">Open directions <ExternalLink className="h-3.5 w-3.5" /></a></div>
      <div ref={mapContainerRef} className="h-56 w-full" />
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-xs text-slate-600"><span className="inline-flex items-center gap-1.5"><Navigation className="h-3.5 w-3.5 text-[#4091c9]" />{driverLocation ? 'Driver position' : routeStart ? 'Previous delivery' : 'Waiting for driver GPS'}</span><span>{route ? `${(route.distance / 1000).toFixed(1)} km` : routeStart ? 'Calculating route' : 'Route starts when delivery begins'}</span><span>{route ? `${Math.max(1, Math.round(route.duration / 60))} min` : 'Please wait'}</span></div>
      {routeError && <p className="px-4 pb-3 text-xs text-amber-700">{routeError}</p>}
    </section>
  );
}
