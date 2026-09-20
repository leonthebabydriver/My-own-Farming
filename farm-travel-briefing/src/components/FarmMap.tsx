"use client";

/**
 * Small sidebar map showing a pin for every currently-filtered farm that
 * has GPS coordinates (a handful don't — see the `lat`/`lng` comment on the
 * Farm type — those just don't get a pin rather than showing one in the
 * wrong place).
 *
 * Leaflet touches `window`/`document` at import time, so this whole file
 * only ever runs in the browser — the homepage imports it with
 * `next/dynamic` and `ssr: false`, never directly.
 */

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import type { Farm } from "@/data/farms";
import type { Lang } from "@/lib/i18n";

// Next.js doesn't serve Leaflet's default marker images from node_modules,
// so they're copied into /public/leaflet (see public/leaflet/) and pointed
// at explicitly here — otherwise every pin silently renders as a broken
// image icon.
const markerIcon = new L.Icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Rough center of the three farm regions (Taipei/Taoyuan/Tainan), zoomed
// out enough that switching areas doesn't need a re-center.
const DEFAULT_CENTER: [number, number] = [24.3, 121.2];
const DEFAULT_ZOOM = 7;

export default function FarmMap({
  farms,
  lang,
  viewBriefingLabel,
}: {
  farms: Farm[];
  lang: Lang;
  viewBriefingLabel: string;
}) {
  const pinned = useMemo(() => farms.filter((f) => f.lat && f.lng), [farms]);

  // If every visible farm is clustered in one city, center/zoom there
  // instead of showing all of Taiwan.
  const bounds = useMemo(() => {
    if (pinned.length === 0) return null;
    const lats = pinned.map((f) => f.lat!);
    const lngs = pinned.map((f) => f.lng!);
    return L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
  }, [pinned]);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      bounds={bounds ?? undefined}
      boundsOptions={{ padding: [24, 24] }}
      scrollWheelZoom={false}
      className="h-56 w-full rounded"
      style={{ zIndex: 0 }}
    >
      {/* Esri's basemap, not the standard OpenStreetMap one — OSM's raster
          tiles render place names in the local language (Chinese, here),
          with no built-in way to force English. Esri's World Street Map
          labels places in English worldwide and needs no API key. Note the
          {y}/{x} order (reversed from the usual {x}/{y}) — that's Esri's
          own tile addressing scheme, not a typo. */}
      <TileLayer
        attribution="Tiles &copy; Esri"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
      />
      {pinned.map((farm) => (
        <Marker key={farm.id} position={[farm.lat!, farm.lng!]} icon={markerIcon}>
          <Popup>
            <div className="flex flex-col gap-1">
              <span className="font-medium">
                {lang === "zh" && farm.nameZh ? farm.nameZh : farm.name}
              </span>
              <Link
                href={`/briefing?farmId=${encodeURIComponent(farm.id)}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {viewBriefingLabel}
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
