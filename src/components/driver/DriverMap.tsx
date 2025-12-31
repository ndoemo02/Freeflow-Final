import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, HeatmapLayer, DirectionsRenderer } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '1rem',
};

// Start center (New York or custom)
const center = {
    lat: 40.7128,
    lng: -74.0060
};

// Dark mode map styles
const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#263c3f" }],
        },
        {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b9a76" }],
        },
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
        },
        {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }],
        },
        {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#9ca5b3" }],
        },
        {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }],
        },
        {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }],
        },
        {
            featureType: "road.highway",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f3d19c" }],
        },
        {
            featureType: "transit",
            elementType: "geometry",
            stylers: [{ color: "#2f3948" }],
        },
        {
            featureType: "transit.station",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
        },
        {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#515c6d" }],
        },
        {
            featureType: "water",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#17263c" }],
        },
    ],
};

// Heatmap gradient
const heatmapGradient = [
    'rgba(0, 255, 255, 0)',
    'rgba(0, 255, 255, 1)',
    'rgba(0, 191, 255, 1)',
    'rgba(0, 127, 255, 1)',
    'rgba(0, 63, 255, 1)',
    'rgba(0, 0, 255, 1)',
    'rgba(0, 0, 223, 1)',
    'rgba(0, 0, 191, 1)',
    'rgba(0, 0, 159, 1)',
    'rgba(0, 0, 127, 1)',
    'rgba(63, 0, 91, 1)',
    'rgba(127, 0, 63, 1)',
    'rgba(191, 0, 31, 1)',
    'rgba(255, 0, 0, 1)' // High demand
];

import { fetchDemandForecast } from '../../lib/driverApi';

// Mock data generator for heatmap NO LONGER USED

interface DriverMapProps {
    isOnline: boolean;
}

export const DriverMap: React.FC<DriverMapProps> = ({ isOnline }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "", // Ensure this is in .env
        libraries: ['visualization', 'places']
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [heatmapData, setHeatmapData] = useState<google.maps.visualization.WeightedLocation[]>([]);
    const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    // Fetch Heatmap Data
    useEffect(() => {
        if (isLoaded) {
            fetchDemandForecast().then(points => {
                const weightedPoints = points.map(p => ({
                    location: new google.maps.LatLng(p.lat, p.lng),
                    weight: p.weight
                }));
                setHeatmapData(weightedPoints);
            });
        }
    }, [isLoaded]);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    // Calculate Routing (Suggested Route)
    useEffect(() => {
        if (isLoaded && map && isOnline) {
            const directionsService = new google.maps.DirectionsService();

            // Simulate "Suggested Route" logic: Start -> Hot Zone 1 -> Hot Zone 2
            const origin = center;
            const destination = { lat: center.lat + 0.03, lng: center.lng + 0.02 }; // Simulating a hotspot destination

            // We can use waypoints to guide through other hot zones
            const waypoint1 = { lat: center.lat + 0.015, lng: center.lng + 0.01 };

            directionsService.route({
                origin: origin,
                destination: destination,
                waypoints: [
                    { location: new google.maps.LatLng(waypoint1.lat, waypoint1.lng), stopover: false }
                ],
                travelMode: google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: false
            }, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    setDirectionsResponse(result);
                } else {
                    console.error(`error fetching directions ${result}`);
                }
            });
        } else {
            setDirectionsResponse(null);
        }
    }, [isLoaded, map, isOnline]);

    // Offline grayscale filter
    // Applying filter to the map container. Since the container is handled by the lib, 
    // we can wrap it or style the containerStyle prop dynamically.
    const currentContainerStyle = useMemo(() => {
        if (!isOnline) {
            return {
                ...containerStyle,
                filter: 'grayscale(100%) brightness(0.7)',
                transition: 'filter 0.5s ease-in-out'
            };
        }
        return {
            ...containerStyle,
            filter: 'grayscale(0%) brightness(1)',
            transition: 'filter 0.5s ease-in-out'
        };
    }, [isOnline]);

    if (!isLoaded) return <div className="w-full h-full bg-[#1e1e1e] animate-pulse rounded-2xl"></div>;

    return (
        <GoogleMap
            mapContainerStyle={currentContainerStyle}
            center={center}
            zoom={13}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={mapOptions}
        >
            {/* Heatmap Layer - Only show when Online? Or always show to entice? Keeping always for now, but grayscale handles the "offline" look */}
            {heatmapData.length > 0 && (
                <HeatmapLayer
                    data={heatmapData}
                    options={{
                        radius: 30,
                        opacity: 0.8,
                        gradient: heatmapGradient
                    }}
                />
            )}

            {/* Suggested Route Polyline */}
            {isOnline && directionsResponse && (
                <DirectionsRenderer
                    options={{
                        directions: directionsResponse,
                        suppressMarkers: false, // Show markers for start/end
                        polylineOptions: {
                            strokeColor: "#a855f7", // Purple/Accent color
                            strokeOpacity: 0.6,
                            strokeWeight: 5
                        }
                    }}
                />
            )}
        </GoogleMap>
    );
};
