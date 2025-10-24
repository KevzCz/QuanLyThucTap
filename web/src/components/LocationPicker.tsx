import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => void })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number };
  initialAddress?: string;
  disabled?: boolean;
}

// Default center: Ho Chi Minh City
const defaultCenter: [number, number] = [10.8231, 106.6297];

// Component to handle map click events
function MapClickHandler({ 
  onMapClick, 
  disabled 
}: { 
  onMapClick: (lat: number, lng: number) => void; 
  disabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (!disabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Component to fly to location when it changes
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.flyTo(center, 15, { duration: 1 });
  }, [center, map]);
  
  return null;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
  initialAddress = '',
  disabled = false
}) => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  );
  const [address, setAddress] = useState(initialAddress);
  const [searchInput, setSearchInput] = useState(initialAddress);
  const [isSearching, setIsSearching] = useState(false);

  // Geocode address to get coordinates using Nominatim (OpenStreetMap)
  const geocodeAddress = useCallback(async (addressToGeocode: string) => {
    if (!addressToGeocode.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressToGeocode)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const newLocation = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
        setSelectedLocation(newLocation);
        setAddress(result.display_name);
        onLocationSelect({
          ...newLocation,
          address: result.display_name
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [onLocationSelect]);

  // Reverse geocode coordinates to get address
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        const newAddress = data.display_name;
        setAddress(newAddress);
        setSearchInput(newAddress);
        onLocationSelect({ lat, lng, address: newAddress });
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  }, [onLocationSelect]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (disabled) return;
    
    setSelectedLocation({ lat, lng });
    reverseGeocode(lat, lng);
  }, [disabled, reverseGeocode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    geocodeAddress(searchInput);
  };

  return (
    <div className="space-y-3">
      {/* Search Box */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tìm kiếm địa chỉ hoặc nhấp vào bản đồ..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || !searchInput.trim() || isSearching}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSearching ? '⏳' : '🔍'} Tìm
        </button>
      </form>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border border-gray-300" style={{ height: '400px' }}>
        <MapContainer
          center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : defaultCenter}
          zoom={selectedLocation ? 15 : 12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={!disabled}
          dragging={!disabled}
          doubleClickZoom={!disabled}
          zoomControl={!disabled}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapClickHandler onMapClick={handleMapClick} disabled={disabled} />
          
          {selectedLocation && (
            <>
              <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
              <MapController center={[selectedLocation.lat, selectedLocation.lng]} />
            </>
          )}
        </MapContainer>
      </div>

      {/* Selected Address Display */}
      {address && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">📍</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Địa chỉ đã chọn:</p>
              <p className="text-sm text-green-700 mt-1">{address}</p>
              {selectedLocation && (
                <p className="text-xs text-green-600 mt-1">
                  Tọa độ: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedLocation && !disabled && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          💡 Nhấp vào bản đồ để chọn vị trí hoặc tìm kiếm địa chỉ ở trên
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
