/**
 * Utility functions for location handling, geolocation, and Google Maps integration
 */

/**
 * Generate a Google Maps search URL from a location string
 */
export function getGoogleMapsUrl(location: string | null | undefined): string | null {
  if (!location || location.trim() === "") return null;
  
  // Encode the location for URL
  const encodedLocation = encodeURIComponent(location.trim());
  return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
}

/**
 * Generate a Google Maps directions URL from a location string
 */
export function getGoogleMapsDirectionsUrl(location: string | null | undefined): string | null {
  if (!location || location.trim() === "") return null;
  
  const encodedLocation = encodeURIComponent(location.trim());
  return `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}`;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  
  return distance;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Get user's current location using browser Geolocation API
 * Returns a Promise with coordinates or null if denied/unavailable
 */
export function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("Error getting location:", error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Geocode a location string to coordinates using a geocoding service
 * This is a simple implementation - you may want to use a service like Google Geocoding API
 * For now, this returns null and we'll use string matching for proximity
 */
export async function geocodeLocation(
  location: string
): Promise<{ lat: number; lng: number } | null> {
  // TODO: Implement geocoding using a service like Google Geocoding API or OpenStreetMap Nominatim
  // For now, return null - we'll use string-based matching
  return null;
}



