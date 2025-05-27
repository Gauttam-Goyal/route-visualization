import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import { Box, Typography, Button, ButtonGroup } from '@mui/material';
import { LocationData, RouteData, PayoutCalculation, DirectDistancePayout, FlatDistancePayout } from '../../types';
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
    payoutCalculations: PayoutCalculation[] | DirectDistancePayout[] | FlatDistancePayout[];
    viewMode: 'route' | 'direct' | 'flat';
    onViewModeChange: (mode: 'route' | 'direct' | 'flat') => void;
}

interface Centroid {
    hexagon_id: string;
    lat: number;
    lng: number;
    cluster_id: string | undefined;
    all_cluster_ids?: string[];
}

const HexagonMap: React.FC<HexagonMapProps> = ({ locationData, filteredRoutes, payoutCalculations, viewMode, onViewModeChange }) => {
    const [visibleCentroids, setVisibleCentroids] = useState<Centroid[]>([]);
    const [mapCenter, setMapCenter] = useState<[number, number]>([23.0, 80.0]); // Default: Central India
    const [zoom, setZoom] = useState(5); // Default zoom level to show both cities
    const [currentViewMode, setCurrentViewMode] = useState<HexagonMapProps['viewMode']>(viewMode);

    // Update parent component when view mode changes
    useEffect(() => {
        onViewModeChange(currentViewMode);
    }, [currentViewMode, onViewModeChange]);

    useEffect(() => {
        // Get hexagon centroids that match the filtered routes
        const centroids = getHexagonCentroidsForRoutes(locationData.hexagonCentroids, filteredRoutes);
        setVisibleCentroids(centroids);

        // Update map center if there are DC locations for the filtered routes
        if (filteredRoutes.length > 0 && locationData.dcLocations.length > 0) {
            const dcCodes = new Set(filteredRoutes.map(route => route.dc_code));
            const relevantDCs = locationData.dcLocations.filter(dc => dcCodes.has(dc.dc_code));

            if (relevantDCs.length > 0) {
                // Center on the first relevant DC
                setMapCenter([relevantDCs[0].lat, relevantDCs[0].lng]);
                setZoom(12); // Zoom in when showing specific city
            }
        }
    }, [locationData, filteredRoutes]);

    // Helper: get all polylines for selected routes
    const getRoutePolylines = (routes: RouteData[]) => {
        return routes.flatMap((route, routeIndex) => {
            const activities = route.activities.sort((a, b) => a.sequence - b.sequence);
            const dc = locationData.dcLocations.find(dc => dc.dc_code === route.dc_code);
            if (!dc) return [];

            if (currentViewMode === 'direct' || currentViewMode === 'flat') {
                // For direct and flat views, only show lines from DC to delivery points
                const deliveryActivities = activities.filter(activity => activity.type === 'delivery');
                
                // Find min and max distances for color scaling
                const distances = deliveryActivities
                    .map(activity => activity.distance_from_dc || 0)
                    .filter(distance => distance > 0);
                const maxDistance = Math.max(...distances);
                
                // Function to get color based on distance with smaller ranges
                const getColorForDistance = (distance: number): string => {
                    if (distance <= 1000) {
                        return '#00FF00'; // Green for very short distances (< 1km)
                    } else if (distance <= 2000) {
                        return '#66BB6A'; // Light green for short distances (1-2km)
                    } else if (distance <= 3000) {
                        return '#FFEB3B'; // Yellow for medium-short distances (2-3km)
                    } else if (distance <= 4000) {
                        return '#FFC107'; // Amber for medium distances (3-4km)
                    } else if (distance <= 5000) {
                        return '#FF9800'; // Orange for medium-long distances (4-5km)
                    } else if (distance <= 6000) {
                        return '#FF5722'; // Deep Orange for long distances (5-6km)
                    } else if (distance <= 7000) {
                        return '#F44336'; // Light Red for very long distances (6-7km)
                    } else {
                        return '#D32F2F'; // Deep Red for extreme distances (>7km)
                    }
                };

                return deliveryActivities.map((activity, index) => {
                    const distance = activity.distance_from_dc || 0;
                    const color = getColorForDistance(distance);
                    const distanceInKm = distance / 1000;
                    const flatRate = 50; // ₹50 per kilometer
                    const flatPayout = Math.round(distanceInKm * flatRate);
                    
                    return (
                        <Polyline
                            key={`${routeIndex}-${index}-${currentViewMode}`}
                            positions={[
                                [dc.lat, dc.lng],
                                [activity.lat, activity.lng]
                            ]}
                            pathOptions={{
                                color: color,
                                weight: 2,
                                opacity: 0.8,
                                lineJoin: 'round',
                                lineCap: 'round'
                            }}
                        >
                            <Tooltip>
                                <div>
                                    <strong>Route:</strong> {route.fe_number}<br />
                                    <strong>DC Code:</strong> {route.dc_code}<br />
                                    <strong>Direct Distance:</strong> {activity.distance_from_dc?.toFixed(2)}m<br />
                                    {currentViewMode === 'flat' && (
                                        <>
                                            <strong>Flat Distance Payout:</strong> ₹{flatPayout}<br />
                                        </>
                                    )}
                                    <strong>Distance Range:</strong> {
                                        distance <= 1000 ? '< 1km' :
                                        distance <= 2000 ? '1-2km' :
                                        distance <= 3000 ? '2-3km' :
                                        distance <= 4000 ? '3-4km' :
                                        distance <= 5000 ? '4-5km' :
                                        distance <= 6000 ? '5-6km' :
                                        distance <= 7000 ? '6-7km' :
                                        '> 7km'
                                    }
                                </div>
                            </Tooltip>
                        </Polyline>
                    );
                });
            }

            // For route view, show actual route sequence
            return activities.slice(0, -1).map((activity, index) => {
                const nextActivity = activities[index + 1];

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
                        key={`${routeIndex}-${index}-route`}
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

    // Function to get color based on cluster ID
    const getClusterColor = (clusterId: string | undefined): string => {
        if (!clusterId) return '#808080'; // Gray for undefined
        const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
        const index = Number(clusterId) % colors.length;
        return colors[index];
    };

    // Function to find payout info based on route and hexagon
    const findPayoutInfo = (route: RouteData, hexagonId: string) => {
        if (Array.isArray(payoutCalculations)) {
            return (payoutCalculations as Array<PayoutCalculation | DirectDistancePayout | FlatDistancePayout>).find(calc => 
                calc.dcCode === route.dc_code &&
                calc.feNumber === route.fe_number &&
                calc.date === route.date &&
                'hexagonId' in calc && calc.hexagonId === hexagonId
            );
        }
        return undefined;
    };

    // Function to get popup content
    const getPopupContent = (
        clusterInfo: Array<{
            route_id: string;
            dc_code: string;
            date: string;
            cluster_id: string | undefined;
            shipment_count: number;
            rto_percentage: number;
            payout: number;
            payout_per_shipment: number;
        }>,
        totalShipments: number,
        totalPayouts: number,
        averageRtoPercentage: number,
        displayClusterId: string,
        centroid: Centroid
    ): string => {
        // Find the payout calculation for this hexagon
        const payoutInfo = (payoutCalculations as Array<PayoutCalculation | DirectDistancePayout | FlatDistancePayout>).find(calc => 
            'hexagonId' in calc && 
            String(calc.hexagonId) === String(centroid.hexagon_id)
        );

        let payoutDisplay = '';
        if (payoutInfo) {
            if ('clusterId' in payoutInfo) {
                // Route view - show cluster-based payouts
                const clusterPayout = payoutInfo as PayoutCalculation;
                const rtoAdjustedPayoutPerShipment = totalShipments > 0 ? 
                    (clusterPayout.totalEarnings / totalShipments) / (1 - (averageRtoPercentage / 100)) : 0;
                payoutDisplay = `
                    <strong>Total Payouts:</strong> ₹${clusterPayout.totalEarnings.toFixed(2)}<br />
                    <strong>RTO-Adjusted Payout/Shipment:</strong> ₹${rtoAdjustedPayoutPerShipment.toFixed(2)}<br />
                `;
            } else if ('directDistance' in payoutInfo) {
                // Direct distance view - show direct distance payouts
                const directPayout = payoutInfo as DirectDistancePayout;
                const rtoAdjustedPayoutPerShipment = totalShipments > 0 ? 
                    (directPayout.totalEarnings / totalShipments) / (1 - (averageRtoPercentage / 100)) : 0;
                payoutDisplay = `
                    <strong>Total Payouts:</strong> ₹${directPayout.totalEarnings.toFixed(2)}<br />
                    <strong>RTO-Adjusted Payout/Shipment:</strong> ₹${rtoAdjustedPayoutPerShipment.toFixed(2)}<br />
                    <strong>Direct Distance:</strong> ${directPayout.directDistance.toFixed(2)}m<br />
                `;
            } else {
                // Flat distance view - show flat distance payouts
                const flatPayout = payoutInfo as FlatDistancePayout;
                const rtoAdjustedPayoutPerShipment = totalShipments > 0 ? 
                    (flatPayout.totalEarnings / totalShipments) / (1 - (averageRtoPercentage / 100)) : 0;
                payoutDisplay = `
                    <strong>Total Payouts:</strong> ₹${flatPayout.totalEarnings.toFixed(2)}<br />
                    <strong>RTO-Adjusted Payout/Shipment:</strong> ₹${rtoAdjustedPayoutPerShipment.toFixed(2)}<br />
                `;
            }
        }

        return `
            <div>
                <strong>Cluster ID:</strong> ${displayClusterId}<br />
                <strong>Hexagon ID:</strong> ${centroid.hexagon_id}<br />
                <strong>Location:</strong> [${centroid.lat.toFixed(5)}, ${centroid.lng.toFixed(5)}]<br />
                <strong>Total Shipments:</strong> ${totalShipments}<br />
                <strong>RTO %:</strong> ${averageRtoPercentage.toFixed(2)}%<br />
                ${payoutDisplay}
                <hr />
                <strong>Appears in routes:</strong><br />
                <ul>
                    ${clusterInfo.map(info => 
                        `<li>
                            FE: ${info.route_id} (DC: ${info.dc_code})<br />
                            Date: ${info.date}<br />
                            Cluster: ${info.cluster_id || 'N/A'}<br />
                            Shipments: ${info.shipment_count}
                        </li>`
                    ).join('')}
                </ul>
            </div>
        `;
    };

    return (
        <Box height="100%" width="100%" position="relative">
            <Box sx={{ 
                position: 'absolute', 
                top: 10, 
                right: 10, 
                zIndex: 9999,
                backgroundColor: 'white', 
                padding: 1, 
                borderRadius: 1,
                boxShadow: '0px 2px 4px rgba(0,0,0,0.2)'
            }}>
                <ButtonGroup>
                    <Button 
                        variant={currentViewMode === 'route' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setCurrentViewMode('route')}
                    >
                        Route View
                    </Button>
                    <Button 
                        variant={currentViewMode === 'direct' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setCurrentViewMode('direct')}
                    >
                        Direct View
                    </Button>
                    <Button 
                        variant={currentViewMode === 'flat' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setCurrentViewMode('flat')}
                    >
                        Flat View
                    </Button>
                </ButtonGroup>
            </Box>
            <MapContainer
                center={mapCenter}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Draw DC locations */}
                {locationData.dcLocations.map((dc, idx) => (
                    <Marker
                        key={`dc-${idx}`}
                        position={[dc.lat, dc.lng]}
                        icon={defaultIcon}
                    >
                        <Popup>
                            <Typography variant="body2">
                                <strong>DC Code:</strong> {dc.dc_code}<br />
                                <strong>City:</strong> {dc.city}<br />
                                <strong>Location:</strong> [{dc.lat.toFixed(6)}, {dc.lng.toFixed(6)}]
                            </Typography>
                        </Popup>
                    </Marker>
                ))}

                {/* Draw route polylines */}
                {polylines}

                {/* Draw hexagon centroids */}
                {visibleCentroids.map((centroid, idx) => {
                    // Get routes that include this hexagon
                    const routesWithHexagon = filteredRoutes.filter(route => 
                        route.activities.some(a => 
                            a.type === 'delivery' && 
                            a.hexagon_index && 
                            String(a.hexagon_index) === centroid.hexagon_id
                        )
                    );
                    
                    // Get cluster ID information and shipment counts
                    const clusterInfo = routesWithHexagon.map(route => {
                        const activity = route.activities.find(a => 
                            a.type === 'delivery' && 
                            a.hexagon_index && 
                            String(a.hexagon_index) === centroid.hexagon_id
                        );
                        
                        // Find shipment count and RTO percentage for this route and hexagon
                        const hexagonMapping = locationData.hexagonCustomerMapping.find(mapping => 
                            String(mapping.hexagon_index) === String(centroid.hexagon_id) &&
                            mapping.fe_number === route.fe_number &&
                            mapping.ofd_date === route.date
                        );
                        
                        const shipmentCount = hexagonMapping?.delivery_count || 0;
                        const rtoPercentage = hexagonMapping?.rto_percentage || 0;

                        // Find payout calculation for this route
                        const payoutInfo = (payoutCalculations as Array<PayoutCalculation | DirectDistancePayout | FlatDistancePayout>).find(calc => 
                            'hexagonId' in calc && 
                            calc.hexagonId === String(activity?.hexagon_index) &&
                            calc.dcCode === route.dc_code &&
                            calc.feNumber === route.fe_number &&
                            calc.date === route.date
                        );

                        // Calculate payout for this specific hexagon's shipments
                        const hexagonPayout = payoutInfo ? payoutInfo.totalEarnings : 0;

                        return {
                            route_id: route.fe_number,
                            dc_code: route.dc_code,
                            date: route.date,
                            cluster_id: activity?.cluster_id,
                            shipment_count: shipmentCount,
                            rto_percentage: rtoPercentage,
                            payout: hexagonPayout,
                            payout_per_shipment: shipmentCount > 0 ? hexagonPayout / shipmentCount : 0
                        };
                    });

                    // Calculate total payouts and shipments for this hexagon
                    const totalShipments = clusterInfo.reduce((sum, info) => sum + info.shipment_count, 0);
                    const totalPayouts = clusterInfo.reduce((sum, info) => sum + info.payout, 0);
                    
                    // Calculate average RTO percentage for this hexagon
                    const averageRtoPercentage = clusterInfo.length > 0 ? 
                        clusterInfo.reduce((sum, info) => sum + info.rto_percentage, 0) / clusterInfo.length : 0;
                    
                    // Check if this hexagon has multiple different cluster IDs
                    const hasMultipleClusterIds = centroid.all_cluster_ids && centroid.all_cluster_ids.length > 1;
                    
                    // For display in the tooltip
                    const displayClusterId = hasMultipleClusterIds 
                        ? '*' // Show asterisk when multiple clusters
                        : (centroid.cluster_id || 'N/A');
                    
                    // Color based on the first route's cluster ID
                    const displayColor = hasMultipleClusterIds
                        ? '#FF00FF' // Magenta for multiple clusters  
                        : (centroid.cluster_id ? `hsl(${(Number(centroid.cluster_id) * 30) % 360}, 70%, 50%)` : 'blue');
                    
                    // Create popup content
                    const popupContent = getPopupContent(
                        clusterInfo, 
                        totalShipments, 
                        totalPayouts, 
                        averageRtoPercentage,
                        displayClusterId,
                        centroid
                    );

                    return (
                        <CircleMarker
                            key={`centroid-${idx}`}
                            center={[centroid.lat, centroid.lng]}
                            radius={10}
                            pathOptions={{
                                fillColor: displayColor,
                                color: 'white',
                                weight: 2,
                                fillOpacity: 0.9
                            }}
                        >
                            <Tooltip direction="top" permanent>
                                <strong>{displayClusterId}</strong>
                            </Tooltip>
                            <Popup>
                                <Typography variant="body2" component="div" dangerouslySetInnerHTML={{ __html: popupContent }} />
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </Box>
    );
};

export default HexagonMap;