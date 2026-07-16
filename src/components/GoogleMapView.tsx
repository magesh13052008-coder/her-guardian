import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";


declare global {
  interface Window {
    google?: any;
    __herGuardianMapInit?: () => void;
    __herGuardianMapReady?: boolean;
    __herGuardianMapPromise?: Promise<void>;
  }
}

// Local aliases so we don't depend on @types/google.maps
type GMap = any;
type GMarker = any;
type GCircle = any;
type GPolyline = any;

const loadGoogleMaps = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.__herGuardianMapReady && window.google?.maps) return Promise.resolve();
  if (window.__herGuardianMapPromise) return window.__herGuardianMapPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;
  if (!key) return Promise.reject(new Error("Google Maps key missing"));

  window.__herGuardianMapPromise = new Promise<void>((resolve, reject) => {
    window.__herGuardianMapInit = () => {
      window.__herGuardianMapReady = true;
      resolve();
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__herGuardianMapInit${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return window.__herGuardianMapPromise;
};

export type MapMarker = { lat: number; lng: number; label?: string; color?: string };

export function GoogleMapView({
  center,
  zoom = 15,
  markers = [],
  showAccuracy,
  accuracy,
  trail,
  className,
  height = 320,
}: {
  center: { lat: number; lng: number } | null;
  zoom?: number;
  markers?: MapMarker[];
  showAccuracy?: boolean;
  accuracy?: number | null;
  trail?: { lat: number; lng: number }[];
  className?: string;
  height?: number;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GMap | null>(null);
  const overlays = useRef<{ markers: GMarker[]; circle?: GCircle; line?: GPolyline }>({ markers: [] });
  const [err, setErr] = useState<string | null>(null);


  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current || !center) return;
        if (!mapRef.current) {
          mapRef.current = new window.google!.maps.Map(ref.current, {
            center,
            zoom,
            disableDefaultUI: true,
            zoomControl: true,
            styles: [
              { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
              { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
              { elementType: "labels.text.fill", stylers: [{ color: "#ec4899" }] },
              { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a44" }] },
              { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0a1f" }] },
              { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            ],
          });
        } else {
          mapRef.current.setCenter(center);
        }
      })
      .catch((e) => setErr(e.message));
    return () => { cancelled = true; };
  }, [center?.lat, center?.lng, zoom]);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    // Clear
    overlays.current.markers.forEach((m) => m.setMap(null));
    overlays.current.circle?.setMap(null);
    overlays.current.line?.setMap(null);
    overlays.current = { markers: [] };

    markers.forEach((m) => {
      const marker = new window.google!.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: mapRef.current!,
        title: m.label,
        icon: {
          path: window.google!.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: m.color ?? "#ec4899",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      overlays.current.markers.push(marker);
    });

    if (showAccuracy && accuracy && center) {
      overlays.current.circle = new window.google!.maps.Circle({
        map: mapRef.current,
        center,
        radius: accuracy,
        fillColor: "#ec4899",
        fillOpacity: 0.12,
        strokeColor: "#ec4899",
        strokeOpacity: 0.5,
        strokeWeight: 1,
      });
    }

    if (trail && trail.length > 1) {
      overlays.current.line = new window.google!.maps.Polyline({
        path: trail.map((p) => ({ lat: p.lat, lng: p.lng })),
        geodesic: true,
        strokeColor: "#a855f7",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: mapRef.current,
      });
    }
  }, [JSON.stringify(markers), showAccuracy, accuracy, JSON.stringify(trail), center?.lat, center?.lng]);

  if (err) return <div className={className} style={{ height }}>
    <div className="glass rounded-xl h-full grid place-items-center text-xs text-red-300 px-4 text-center">{err}</div>
  </div>;

  if (!center) return <div className={className} style={{ height }}>
    <div className="glass rounded-xl h-full grid place-items-center text-xs text-muted-foreground">{t("map.waitingGps")}</div>
  </div>;


  return <div ref={ref} className={`rounded-xl overflow-hidden ${className ?? ""}`} style={{ height }} />;
}
