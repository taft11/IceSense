import { useEffect, useRef } from 'react';
import * as L from 'leaflet/dist/leaflet-src.esm.js';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = { lat: 14.6760, lng: 121.0437 };

export default function LocationPicker({ latitude, longitude, onLocationChange }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude ?? DEFAULT_CENTER.lat, longitude ?? DEFAULT_CENTER.lng],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    markerRef.current = L.circleMarker(
      [latitude ?? DEFAULT_CENTER.lat, longitude ?? DEFAULT_CENTER.lng],
      {
        radius: 8,
        weight: 2,
        color: '#4091c9',
        fillColor: '#4091c9',
        fillOpacity: 0.95,
      }
    ).addTo(map);

    map.on('click', (event) => {
      const lat = Number(event.latlng.lat.toFixed(6));
      const lng = Number(event.latlng.lng.toFixed(6));
      markerRef.current?.setLatLng([lat, lng]);
      map.setView([lat, lng]);
      onLocationChange('latitude', lat);
      onLocationChange('longitude', lng);
    });

    mapRef.current = map;

    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);
    window.requestAnimationFrame(() => handleResize());

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapRef.current === map) {
        map.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [onLocationChange]);

  useEffect(() => {
    if (!mapRef.current || latitude == null || longitude == null) return;
    const coords = [latitude, longitude];
    if (markerRef.current) {
      markerRef.current.setLatLng(coords);
    }
    mapRef.current.setView(coords, 14);
  }, [latitude, longitude]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm font-semibold text-gray-700">Pin location</p>
        <p className="mt-1 text-sm text-gray-500">Click the map to place a pin and capture a more accurate delivery location.</p>
      </div>
      <div ref={containerRef} className="h-[280px] w-full" />
    </div>
  );
}
