import React, { useEffect, useRef, useState } from 'react';
import type { KioskHospital } from '../../api/client';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface MapViewProps {
  hospitals: KioskHospital[];
  selectedId?: string;
  onSelect: (hospital: KioskHospital) => void;
}

// Bangalore center (default)
const DEFAULT_LAT = 12.9716;
const DEFAULT_LON = 77.5946;

function getRecommendationScore(h: KioskHospital): number {
  let score = 0;
  if (h.is_partner) score += 100;
  if (h.rating) score += h.rating * 10;
  if (h.distance_km != null) score += Math.max(0, 50 - h.distance_km * 5);
  score += Math.min(h.user_ratings_total / 100, 20);
  return score;
}

function sortHospitals(hospitals: KioskHospital[]): KioskHospital[] {
  return [...hospitals].sort((a, b) => getRecommendationScore(b) - getRecommendationScore(a));
}

/**
 * MapView — shows hospital locations on a map.
 * - When VITE_GOOGLE_MAPS_API_KEY is set: renders interactive Google Maps JS API with markers.
 * - Otherwise: renders a keyless Google Maps iframe embed.
 */
export const MapView: React.FC<MapViewProps> = ({ hospitals, selectedId, onSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [useApiKey, setUseApiKey] = useState(!!GOOGLE_MAPS_API_KEY);

  // Try loading Google Maps JS API
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapRef.current) {
      setUseApiKey(false);
      return;
    }

    // Check if already loaded
    if ((window as unknown as { google?: { maps?: unknown } }).google?.maps) {
      renderGoogleMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => renderGoogleMap();
    script.onerror = () => setUseApiKey(false);
    document.head.appendChild(script);

    function renderGoogleMap() {
      if (!mapRef.current) return;
      type GoogleMaps = {
        Map: new (el: HTMLElement, opts: Record<string, unknown>) => unknown & {
          fitBounds: (b: unknown, padding?: number) => void;
        };
        Marker: new (opts: Record<string, unknown>) => { addListener: (ev: string, cb: () => void) => void };
        LatLngBounds: new () => { extend: (p: { lat: number; lng: number }) => void };
      };
      const gmap = (window as unknown as { google: { maps: GoogleMaps } }).google.maps;
      const center = hospitals.length > 0
        ? { lat: hospitals[0].lat, lng: hospitals[0].lon }
        : { lat: DEFAULT_LAT, lng: DEFAULT_LON };

      const map = new gmap.Map(mapRef.current, {
        center,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
      });

      const bounds = new gmap.LatLngBounds();
      hospitals.forEach((h) => {
        const position = { lat: h.lat, lng: h.lon };
        bounds.extend(position);

        const marker = new gmap.Marker({
          position,
          map,
          title: h.name,
          icon: {
            url: h.is_partner
              ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
              : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          },
        });

        marker.addListener('click', () => onSelect(h));
      });

      if (hospitals.length > 1) {
        map.fitBounds(bounds, 40);
      }
    }

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitals]);

  if (!useApiKey) {
    // Keyless iframe fallback
    const sorted = sortHospitals(hospitals);
    const first = sorted[0];
    const lat = first?.lat ?? DEFAULT_LAT;
    const lon = first?.lon ?? DEFAULT_LON;
    const q = `${lat},${lon}`;
    return (
      <div className="relative w-full h-full bg-slate-200">
        <iframe
          title="Hospital Map"
          src={`https://maps.google.com/maps?q=${q}&z=13&output=embed`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {/* Overlay hospital list for interaction */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-2 text-xs max-h-24 overflow-y-auto">
          {sorted.slice(0, 5).map((h) => (
            <button
              key={h.id}
              onClick={() => onSelect(h)}
              className={`block w-full text-left px-2 py-1 rounded ${
                selectedId === h.id ? 'bg-blue-100 font-bold' : 'hover:bg-slate-100'
              }`}
            >
              {h.name} {h.is_partner ? '(Partner)' : ''}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full" />;
};

export default MapView;
