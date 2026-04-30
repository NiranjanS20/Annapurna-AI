import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MAP_TILES_URL, MAP_TILES_ATTRIBUTION } from '../utils/mapConfig';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const LocationPicker = ({ onSelect }) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    }
  });
  return null;
};

const RecenterMap = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], zoom || map.getZoom(), { animate: true });
    }
  }, [center, map, zoom]);
  return null;
};

const MapView = ({ center, markers = [], onSelect, height = '320px', selectable = false, radiusKm }) => {
  const defaultCenter = center || { lat: 22.9734, lng: 78.6569 };
  const zoom = 13;

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapContainer center={[defaultCenter.lat, defaultCenter.lng]} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution={MAP_TILES_ATTRIBUTION} url={MAP_TILES_URL} />
        <RecenterMap center={defaultCenter} zoom={zoom} />
        {selectable && <LocationPicker onSelect={onSelect} />}
        {radiusKm ? (
          <Circle
            center={[defaultCenter.lat, defaultCenter.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.12 }}
          />
        ) : null}
        {markers.map((marker) => (
          <Marker key={marker.id || `${marker.lat}-${marker.lng}`} position={[marker.lat, marker.lng]}>
            {marker.label && <Popup>{marker.label}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
