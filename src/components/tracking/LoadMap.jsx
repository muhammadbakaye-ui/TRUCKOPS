import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

export default function LoadMap({ loads, selectedLoadId, onLoadSelect }) {
  // Default center (US center)
  const defaultCenter = [39.8283, -98.5795];
  
  // Generate mock locations based on load ID for demo
  const getLoadLocation = (load) => {
    if (load.pickup_city && load.pickup_state) {
      // Simplified mock coordinates - in production, use real GPS data
      const hash = load.id.charCodeAt(0);
      return [39 + (hash % 20), -98 + (hash % 30)];
    }
    return defaultCenter;
  };

  return (
    <MapContainer center={defaultCenter} zoom={4} className="h-full w-full rounded-lg overflow-hidden">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {loads.map((load) => (
        <Marker
          key={load.id}
          position={getLoadLocation(load)}
          eventHandlers={{ click: () => onLoadSelect(load.id) }}
          icon={L.icon({
            iconUrl: selectedLoadId === load.id
              ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'
              : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
          })}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{load.truck_number || 'N/A'}</p>
              <p className="text-muted-foreground">{load.dispatch_status}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}