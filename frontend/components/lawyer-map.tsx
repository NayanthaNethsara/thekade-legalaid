"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Lawyer {
  id: number;
  name: string;
  specializations: string[];
  rating: number;
  reviewCount: number;
  experience: string;
  hourlyRate: number;
  consultationFee: number;
  location: string;
  distance: string;
  coordinates: { lat: number; lng: number };
  availability: string;
  isProBono: boolean;
  profileImage: string;
  description: string;
  languages: string[];
  barAdmissions: string[];
  responseTime: string;
}

interface LawyerMapProps {
  lawyers: Lawyer[];
  onMarkerClick?: (lawyer: Lawyer) => void;
}

export default function LawyerMap({ lawyers, onMarkerClick }: LawyerMapProps) {
  // Center map on Colombo, Sri Lanka
  const center: [number, number] = [6.9271, 79.8612];

  return (
    <div className="w-full h-full">
      <MapContainer
        center={center}
        zoom={8}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {lawyers.map((lawyer) => (
          <Marker 
            key={lawyer.id} 
            position={[lawyer.coordinates.lat, lawyer.coordinates.lng]}
            eventHandlers={{
              click: () => onMarkerClick?.(lawyer),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold text-sm">{lawyer.name}</h3>
                <p className="text-xs text-gray-600 mb-1">{lawyer.location}</p>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs">⭐ {lawyer.rating}</span>
                  {lawyer.isProBono && (
                    <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
                      Pro Bono
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium">LKR {lawyer.hourlyRate.toLocaleString()}/hr</p>
                <div className="mt-1">
                  {lawyer.specializations.slice(0, 2).map((spec) => (
                    <span key={spec} className="text-xs bg-blue-100 text-blue-800 px-1 rounded mr-1">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}