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
  isAvailableNow: boolean;
  isProBono: boolean;
  isVerified: boolean;
  profileImage: string;
  description: string;
  languages: string[];
  barAdmissions: string[];
  responseTime: string;
  reviews: { name: string; rating: number; comment: string }[];
  keywords: string[];
}

interface LawyerMapProps {
  lawyers: Lawyer[];
  hoveredLawyerId?: number | null;
  onMarkerClick?: (lawyer: Lawyer) => void;
}

export default function LawyerMap({ lawyers, hoveredLawyerId, onMarkerClick }: LawyerMapProps) {
  // Center map on Colombo, Sri Lanka
  const center: [number, number] = [6.9271, 79.8612];

  // Create custom icon for hovered marker
  const createCustomIcon = (isHovered: boolean, isAvailable: boolean) => {
    const iconColor = isAvailable ? '#10b981' : '#3b82f6'; // Green for available, blue for others
    const iconSize = isHovered ? 35 : 25;
    
    return L.divIcon({
      html: `<div style="
        background: ${iconColor}; 
        width: ${iconSize}px; 
        height: ${iconSize}px; 
        border-radius: 50%; 
        border: 3px solid white; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${iconSize * 0.4}px;
        color: white;
        font-weight: bold;
        transform: ${isHovered ? 'scale(1.2)' : 'scale(1)'};
        transition: all 0.2s ease;
        z-index: ${isHovered ? '1000' : '999'};
      ">⚖️</div>`,
      className: 'custom-lawyer-marker',
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize/2, iconSize/2],
    });
  };

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
        
        {lawyers.map((lawyer) => {
          const isHovered = hoveredLawyerId === lawyer.id;
          const customIcon = createCustomIcon(isHovered, lawyer.isAvailableNow);
          
          return (
            <Marker 
              key={lawyer.id} 
              position={[lawyer.coordinates.lat, lawyer.coordinates.lng]}
              icon={customIcon}
              eventHandlers={{
                click: () => onMarkerClick?.(lawyer),
              }}
              zIndexOffset={isHovered ? 1000 : 0}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-sm">{lawyer.name}</h3>
                    {lawyer.isVerified && (
                      <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-1">📍 {lawyer.location}</p>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs">⭐ {lawyer.rating}</span>
                      <span className="text-xs text-gray-500">({lawyer.reviewCount})</span>
                    </div>
                    {lawyer.isAvailableNow && (
                      <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
                        🟢 Available Now
                      </span>
                    )}
                    {lawyer.isProBono && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                        💙 Pro Bono
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium mb-1">LKR {lawyer.hourlyRate.toLocaleString()}/hr</p>
                  <div className="mb-2">
                    {lawyer.specializations.slice(0, 2).map((spec) => (
                      <span key={spec} className="text-xs bg-gray-100 text-gray-700 px-1 rounded mr-1">
                        {spec}
                      </span>
                    ))}
                  </div>
                  {lawyer.reviews.length > 0 && (
                    <div className="text-xs text-gray-600 italic mb-2">
                      "{lawyer.reviews[0].comment.substring(0, 50)}..."
                    </div>
                  )}
                  <button 
                    className="w-full bg-blue-600 text-white text-xs py-1 px-2 rounded hover:bg-blue-700 transition-colors"
                    onClick={() => onMarkerClick?.(lawyer)}
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}