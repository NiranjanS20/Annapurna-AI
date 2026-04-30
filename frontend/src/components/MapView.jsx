import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
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

const MapView = ({ center, markers = [], onSelect, height = '320px', selectable = false }) => {
  const defaultCenter = center || { lat: 28.6139, lng: 77.2090 };

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapContainer center={[defaultCenter.lat, defaultCenter.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution={MAP_TILES_ATTRIBUTION} url={MAP_TILES_URL} />
        {selectable && <LocationPicker onSelect={onSelect} />}
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
