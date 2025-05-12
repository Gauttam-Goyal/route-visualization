import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Box, Typography } from '@mui/material';
import { LocationData, RouteData } from '../../types';
import { getHexagonCentroidsForRoutes } from '../../services/mapService';

// Fix for Leaflet marker icons in React
const defaultIcon = L.icon({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface HexagonMapProps {
    locationData: LocationData;
    filteredRoutes: RouteData[];
}

const HexagonMap: React.FC<HexagonMapProps> = ({ locationData, filteredRoutes }) => {
    const [visibleCentroids, setVisibleCentroids] = useState<any[]>([]);
    const [mapCenter, setMapCenter] = useState<[number, number]>([23.0, 80.0]); // Default: Central India
    const [zoom, setZoom] = useState(5); // Default zoom level to show both cities

    useEffect(() => {
        console.log('Location Data:', locationData);
        console.log('Filtered Routes:', filteredRoutes);
        
        // Get hexagon centroids that match the filtered routes
        const centroids = getHexagonCentroidsForRoutes(locationData.hexagonCentroids, filteredRoutes);
        console.log('Visible Centroids:', centroids);
        setVisibleCentroids(centroids);

        // Update map center if there are DC locations for the filtered routes
        if (filteredRoutes.length > 0 && locationData.dcLocations.length > 0) {
            const dcCodes = new Set(filteredRoutes.map(route => route.dc_code));
            const relevantDCs = locationData.dcLocations.filter(dc => dcCodes.has(dc.dc_code));
            console.log('Relevant DCs:', relevantDCs);

            if (relevantDCs.length > 0) {
                // Center on the first relevant DC
                setMapCenter([relevantDCs[0].lat, relevantDCs[0].lng]);
                setZoom(12); // Zoom in when showing specific city
            }
        }
    }, [locationData, filteredRoutes]);

    // Helper: get all polylines for selected routes
    const getRoutePolylines = (routes: RouteData[]) => {
        console.log('Processing routes for polylines:', routes);
        return routes.flatMap((route, routeIndex) => {
            console.log(`Processing route ${routeIndex + 1}:`, route);
            const activities = route.activities.sort((a, b) => a.sequence - b.sequence);
            console.log('Sorted activities:', activities);

            return activities.slice(0, -1).map((activity, index) => {
                const nextActivity = activities[index + 1];
                console.log(`Creating polyline from activity ${index} to ${index + 1}:`, {
                    from: [activity.lat, activity.lng],
                    to: [nextActivity.lat, nextActivity.lng]
                });

                // Use different colors for different types of connections
                let color = '#FF0000'; // Default red for regular routes
                let weight = 3;
                let opacity = 0.8;

                if (activity.type === 'depot' || nextActivity.type === 'depot') {
                    // Depot connections in blue
                    color = '#0000FF';
                    weight = 4;
                    opacity = 0.9;
                } else if (activity.cluster_id === nextActivity.cluster_id) {
                    // Same cluster connections in green
                    color = '#00FF00';
                    weight = 3;
                    opacity = 0.7;
                }

                return (
                    <Polyline
                        key={`${routeIndex}-${index}`}
                        positions={[
                            [activity.lat, activity.lng],
                            [nextActivity.lat, nextActivity.lng]
                        ]}
                        pathOptions={{
                            color: color,
                            weight: weight,
                            opacity: opacity,
                            lineJoin: 'round',
                            lineCap: 'round'
                        }}
                    >
                        <Tooltip>
                            <div>
                                <strong>Route:</strong> {route.fe_number}<br />
                                <strong>DC Code:</strong> {route.dc_code}<br />
                                <strong>From:</strong> {activity.type}<br />
                                <strong>To:</strong> {nextActivity.type}<br />
                                <strong>From Cluster:</strong> {activity.cluster_id || 'N/A'}<br />
                                <strong>To Cluster:</strong> {nextActivity.cluster_id || 'N/A'}<br />
                                <strong>Segment Distance:</strong> {nextActivity.distance_from_prev}m<br />
                                <strong>Total Route Distance:</strong> {parseInt(route.total_distance).toLocaleString()}m
                            </div>
                        </Tooltip>
                    </Polyline>
                );
            });
        });
    };

    const polylines = getRoutePolylines(filteredRoutes);
    console.log('Final polylines to render:', polylines);

    return (
        <Box height="100%" width="100%">
            <MapContainer
                center={mapCenter}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* DC Locations */}
                {locationData.dcLocations
                    .filter(dc => filteredRoutes.some(route => route.dc_code === dc.dc_code))
                    .map((dc, idx) => (
                        <Marker
                            key={`dc-${idx}`}
                            position={[dc.lat, dc.lng]}
                        >
                            <Popup>
                                <Typography variant="body2">
                                    <strong>DC:</strong> {dc.dc_code}<br />
                                    <strong>City:</strong> {dc.city}
                                </Typography>
                            </Popup>
                        </Marker>
                    ))}

                {/* Route Polylines */}
                {polylines}

                {/* Hexagon Centroids */}
                {visibleCentroids.map((centroid, idx) => (
                    <CircleMarker
                        key={`centroid-${idx}`}
                        center={[centroid.lat, centroid.lng]}
                        radius={8}
                        pathOptions={{
                            fillColor: centroid.cluster_id ? `hsl(${(centroid.cluster_id * 30) % 360}, 70%, 50%)` : 'blue',
                            color: 'white',
                            weight: 2,
                            fillOpacity: 0.9
                        }}
                    >
                        <Popup>
                            <Typography variant="body2">
                                <strong>Cluster ID:</strong> {centroid.cluster_id || 'N/A'}<br />
                                <strong>Hexagon ID:</strong> {centroid.hexagon_id}
                            </Typography>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
        </Box>
    );
};

export default HexagonMap;