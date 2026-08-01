import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet/dist/leaflet-src.esm.js';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = { lat: 14.6760, lng: 121.0437 };
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

export default function LocationPicker({ latitude, longitude, onLocationChange }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [isFindingLocation, setIsFindingLocation] = useState(false);
  const [searchError, setSearchError] = useState('');

  const updateAddressFromGeocode = (address = {}) => {
    const street = [address.house_number, address.road, address.neighbourhood]
      .filter(Boolean)
      .join(' ')
      .trim();
    const city = address.city || address.town || address.village || address.county || '';
    const state = address.state || address.region || '';
    const postalCode = address.postcode || '';
    const country = address.country || '';

    onLocationChange('street', street);
    onLocationChange('city', city);
    onLocationChange('state', state);
    onLocationChange('postalCode', postalCode);
    onLocationChange('country', country);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      setSearchError('');
      const params = new URLSearchParams({ format: 'json', lat: String(lat), lon: String(lng), addressdetails: '1' });
      const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }
      const result = await response.json();
      updateAddressFromGeocode(result.address || {}, result.display_name || '');
    } catch (error) {
      setSearchError('Unable to resolve the selected location. Please try again or use search.');
    }
  };

  const moveMarkerTo = (lat, lng, shouldReverseGeocode = true) => {
    const coords = [lat, lng];
    if (markerRef.current) {
      markerRef.current.setLatLng(coords);
    }
    if (mapRef.current) {
      mapRef.current.flyTo(coords, 14, {
        duration: 1.2,
      });
    }
    onLocationChange('latitude', Number(lat.toFixed(6)));
    onLocationChange('longitude', Number(lng.toFixed(6)));
    if (shouldReverseGeocode) {
      reverseGeocode(lat, lng);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported by your browser.');
      return;
    }

    setIsFindingLocation(true);
    setSearchError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setIsFindingLocation(false);
        moveMarkerTo(lat, lng);
      },
      (error) => {
        setIsFindingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          setSearchError('Location permission denied. Please allow access to use GPS lookup.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setSearchError('Current location is unavailable. Please try again.');
        } else {
          setSearchError('Unable to access your location. Please try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

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

    const icon = L.divIcon({
      className: '',
      html: '<span class="block h-4 w-4 rounded-full border-2 border-white bg-[#4091c9] shadow-lg"></span>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    markerRef.current = L.marker([latitude ?? DEFAULT_CENTER.lat, longitude ?? DEFAULT_CENTER.lng], {
      draggable: true,
      icon,
    }).addTo(map);

    map.on('click', (event) => {
      const lat = Number(event.latlng.lat.toFixed(6));
      const lng = Number(event.latlng.lng.toFixed(6));
      moveMarkerTo(lat, lng);
    });

    markerRef.current.on('dragend', (event) => {
      const position = event.target.getLatLng();
      moveMarkerTo(position.lat, position.lng);
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [onLocationChange, latitude, longitude]);

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
      <div className="p-4">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#4091c9] hover:bg-[#f0f8ff] focus:outline-none"
        >
          {isFindingLocation ? 'Locating...' : 'Use Current Location'}
        </button>
        {searchError && <p className="mt-3 text-sm text-amber-700">{searchError}</p>}
      </div>

      <div ref={containerRef} className="h-[360px] w-full" />
    </div>
  );
}
