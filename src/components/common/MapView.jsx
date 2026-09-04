import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix default icon (leaflet 1.9 requires explicit URLs)
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const providerIcon = L.divIcon({
  html: '<div style="width:28px;height:28px;background:#18181b;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-size:14px">🛵</div>',
  className: 'leaflet-div-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const customerIcon = L.divIcon({
  html: '<div style="width:28px;height:28px;background:#000000;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-size:12px">📍</div>',
  className: 'leaflet-div-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitBounds({ provider, customer }) {
  const map = useMap();
  useEffect(() => {
    if (provider && customer) {
      const bounds = L.latLngBounds([provider, customer]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (provider) {
      map.setView(provider, 14);
    } else if (customer) {
      map.setView(customer, 14);
    }
  }, [provider, customer, map]);
  return null;
}

function DraggableMarker({ position, onMove, draggable }) {
  const handler = useMemo(() => ({
    dragend(e) {
      const ll = e.target.getLatLng();
      onMove?.({ lat: ll.lat, lng: ll.lng });
    },
  }), [onMove]);
  if (!position) return null;
  return <Marker position={[position.lat, position.lng]} icon={defaultIcon} draggable={!!draggable} eventHandlers={handler} />;
}

export default function MapView({
  providerPos,
  customerPos,
  draggable = false,
  onCustomerMove,
  onProviderMove,
  height = '220px',
  showRoute = true,
  interactive = true,
}) {
  const center = providerPos || customerPos || null;
  const hasBoth = providerPos && customerPos;
  if (!center) {
    return (
      <div style={{ height, width: '100%' }} className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-500">
        Location not set — Choose location manually
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%' }} className="rounded-2xl overflow-hidden border border-slate-200">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={interactive}
        dragging={interactive}
        scrollWheelZoom={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds provider={providerPos ? [providerPos.lat, providerPos.lng] : null} customer={customerPos ? [customerPos.lat, customerPos.lng] : null} />
        {customerPos && (
          <Marker position={[customerPos.lat, customerPos.lng]} icon={customerIcon}>
            <Popup>Customer location</Popup>
          </Marker>
        )}
        {providerPos && (
          <Marker position={[providerPos.lat, providerPos.lng]} icon={providerIcon}>
            <Popup>Provider live location</Popup>
          </Marker>
        )}
        {/* Draggable pin for booking address selection */}
        {draggable && customerPos && (
          <DraggableMarker position={customerPos} onMove={onCustomerMove} draggable />
        )}
        {hasBoth && showRoute && (
          <Polyline positions={[[providerPos.lat, providerPos.lng], [customerPos.lat, customerPos.lng]]} pathOptions={{ color: '#18181b', weight: 4, dashArray: '8 8', opacity: 0.85 }} />
        )}
      </MapContainer>
    </div>
  );
}
