import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Grid,
    Card,
    CardContent,
    Tabs,
    Tab,
    Button,
    MenuItem
} from '@mui/material';
import { RouteData, LocationData } from '../../types';
import L from 'leaflet';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';

interface ClusterPayoutViewProps {
    routeData: RouteData[];
    locationData: LocationData;
    thresholds: ThresholdConfig;
    onThresholdsChange: (thresholds: ThresholdConfig) => void;
    onPayoutCalculated: (payouts: PayoutSummary[], calculations: PayoutCalculation[]) => void;
}

interface DirectPayoutViewProps {
    routeData: RouteData[];
    locationData: LocationData;
    thresholds: DirectDistanceThresholdConfig;
    onThresholdsChange: (thresholds: DirectDistanceThresholdConfig) => void;
    onPayoutCalculated: (payouts: PayoutSummary[], calculations: DirectDistancePayout[]) => void;
}

interface PayoutsViewProps {
    routeData: RouteData[];
    locationData: LocationData;
    onPayoutCalculated?: (payouts: PayoutSummary[], calculations: PayoutCalculation[] | DirectDistancePayout[] | FlatDistancePayout[]) => void;
}

interface ThresholdConfig {
    dcToHexThreshold: number;  // in meters
    hexToHexThreshold: number; // in meters
    dcToHexIncentivePerMeter: number;
    hexToHexIncentivePerMeter: number;
    baseShipmentPrice: number;  // Added base price
    returnIncentivePerMeter: number; // Added for return journey incentive
    returnJourneyStrategy: 'proportional' | 'weighted'; // Added strategy selector
}

interface PayoutCalculation {
    hexagonId: string;
    clusterId: string;
    dcCode: string;
    feNumber: string;
    date: string;
    totalShipments: number;
    dcToHexDistance: number;
    dcToHexExcess: number;
    dcToHexIncentive: number;
    hexToHexDistance: number;
    hexToHexExcess: number;
    hexToHexIncentive: number;
    returnJourneyShare: number;
    totalIncentive: number;
    baseEarnings: number;
    totalEarnings: number;
    incentivePerShipment: number;
    earningsPerShipment: number;
    earningsPerShipmentPreRto: number;
    earningsPerShipmentPostRto: number;
    connectedHexId: string | null;
    isFirstHexInCluster: boolean;
    incomingHexId: string | null;
    rtoPercentage: number;
    clusterRtoPercentage: number;
}

interface PayoutSummary {
    dcCode: string;
    totalShipments: number;
    totalIncentivesPreRto: number;
    totalIncentivesPostRto: number;
    totalBaseEarnings: number;
    totalEarningsPreRto: number;
    totalEarningsPostRto: number;
    avgEarningsPerShipmentPreRto: number;
    avgEarningsPerShipmentPostRto: number;
    pilots: {
        [feNumber: string]: {
            shipments: number;
            incentivesPreRto: number;
            incentivesPostRto: number;
            baseEarnings: number;
            totalEarningsPreRto: number;
            totalEarningsPostRto: number;
            earningsPerShipmentPreRto: number;
            earningsPerShipmentPostRto: number;
        }
    }
}

interface DirectDistanceThresholdConfig {
    distanceThreshold: number;  // in meters
    incentivePerMeter: number;  // in rupees per meter
    baseShipmentPrice: number;  // base price per shipment
}

interface DirectDistancePayout {
    hexagonId: string;
    dcCode: string;
    feNumber: string;
    date: string;
    totalShipments: number;
    directDistance: number;
    excessDistance: number;
    distanceIncentive: number;
    baseEarnings: number;
    totalEarnings: number;
    earningsPerShipment: number;
    earningsPerShipmentPreRto: number;
    earningsPerShipmentPostRto: number;
    rtoPercentage: number;
}

interface FlatDistancePayoutViewProps {
    routeData: RouteData[];
    locationData: LocationData;
    thresholds: FlatDistanceThresholdConfig;
    onThresholdsChange: (thresholds: FlatDistanceThresholdConfig) => void;
    onPayoutCalculated: (payouts: PayoutSummary[], calculations: FlatDistancePayout[]) => void;
}

interface FlatDistanceThresholdConfig {
    distanceThreshold: number;  // in meters
    flatIncentive: number;     // flat incentive amount in rupees
    baseShipmentPrice: number; // base price per shipment
}

interface FlatDistancePayout {
    hexagonId: string;
    dcCode: string;
    feNumber: string;
    date: string;
    totalShipments: number;
    directDistance: number;
    excessDistance: number;
    flatIncentive: number;
    baseEarnings: number;
    totalEarnings: number;
    earningsPerShipment: number;
    earningsPerShipmentPreRto: number;
    earningsPerShipmentPostRto: number;
    rtoPercentage: number;
}

const DEFAULT_THRESHOLDS: ThresholdConfig = {
    dcToHexThreshold: 5000,  // 5 km
    hexToHexThreshold: 2000, // 2 km
    dcToHexIncentivePerMeter: 0.5,  // Rs 0.5 per meter excess
    hexToHexIncentivePerMeter: 0.3,  // Rs 0.3 per meter excess
    baseShipmentPrice: 50,   // Rs 50 per shipment base price
    returnIncentivePerMeter: 2, // Rs 2 per meter for return journey
    returnJourneyStrategy: 'proportional' // Default to proportional strategy
};

const DEFAULT_DIRECT_DISTANCE_THRESHOLDS: DirectDistanceThresholdConfig = {
    distanceThreshold: 5000,  // 5 km
    incentivePerMeter: 0.5,   // Rs 0.5 per meter
    baseShipmentPrice: 50,    // Rs 50 per shipment
};

const DEFAULT_FLAT_DISTANCE_THRESHOLDS: FlatDistanceThresholdConfig = {
    distanceThreshold: 5000,  // 5 km
    flatIncentive: 100,      // ₹100 flat incentive
    baseShipmentPrice: 50,    // ₹50 per shipment
};

const MAX_RTO_PERCENTAGE = 30; // Cap RTO at 30%

const PayoutsView: React.FC<PayoutsViewProps> = ({ routeData, locationData, onPayoutCalculated }) => {
    const [viewMode, setViewMode] = React.useState<'cluster' | 'direct' | 'flat' | 'comparison'>('cluster');
    const [clusterPayouts, setClusterPayouts] = React.useState<PayoutSummary[]>([]);
    const [directPayouts, setDirectPayouts] = React.useState<PayoutSummary[]>([]);
    const [flatPayouts, setFlatPayouts] = React.useState<PayoutSummary[]>([]);
    const [payoutCalculations, setPayoutCalculations] = React.useState<PayoutCalculation[]>([]);
    const [directPayoutCalculations, setDirectPayoutCalculations] = React.useState<DirectDistancePayout[]>([]);
    const [flatPayoutCalculations, setFlatPayoutCalculations] = React.useState<FlatDistancePayout[]>([]);
    
    // Initialize thresholds from localStorage or defaults
    const [clusterThresholds, setClusterThresholds] = React.useState<ThresholdConfig>(() => {
        const stored = localStorage.getItem('clusterThresholds');
        return stored ? JSON.parse(stored) : DEFAULT_THRESHOLDS;
    });

    const [directThresholds, setDirectThresholds] = React.useState<DirectDistanceThresholdConfig>(() => {
        const stored = localStorage.getItem('directThresholds');
        return stored ? JSON.parse(stored) : DEFAULT_DIRECT_DISTANCE_THRESHOLDS;
    });

    const [flatThresholds, setFlatThresholds] = React.useState<FlatDistanceThresholdConfig>(() => {
        const stored = localStorage.getItem('flatThresholds');
        return stored ? JSON.parse(stored) : DEFAULT_FLAT_DISTANCE_THRESHOLDS;
    });

    // Save thresholds to localStorage whenever they change
    React.useEffect(() => {
        localStorage.setItem('clusterThresholds', JSON.stringify(clusterThresholds));
    }, [clusterThresholds]);

    React.useEffect(() => {
        localStorage.setItem('directThresholds', JSON.stringify(directThresholds));
    }, [directThresholds]);

    React.useEffect(() => {
        localStorage.setItem('flatThresholds', JSON.stringify(flatThresholds));
    }, [flatThresholds]);

    // Calculate payouts for all view modes when component mounts
    React.useEffect(() => {
        // Calculate cluster-based payouts
        const clusterView = (
            <ClusterBasedPayoutView 
                routeData={routeData} 
                locationData={locationData}
                thresholds={clusterThresholds}
                onThresholdsChange={setClusterThresholds}
                onPayoutCalculated={(payouts: PayoutSummary[], calculations: PayoutCalculation[]) => {
                    setClusterPayouts(payouts);
                    setPayoutCalculations(calculations);
                    onPayoutCalculated?.(payouts, calculations);
                }}
            />
        );

        // Calculate direct distance payouts
        const directView = (
            <DirectDistancePayoutView 
                routeData={routeData} 
                locationData={locationData}
                thresholds={directThresholds}
                onThresholdsChange={setDirectThresholds}
                onPayoutCalculated={(payouts: PayoutSummary[], calculations: DirectDistancePayout[]) => {
                    setDirectPayouts(payouts);
                    setDirectPayoutCalculations(calculations);
                    onPayoutCalculated?.(payouts, calculations);
                }}
            />
        );

        // Calculate flat distance payouts
        const flatView = (
            <FlatDistancePayoutView
                routeData={routeData}
                locationData={locationData}
                thresholds={flatThresholds}
                onThresholdsChange={setFlatThresholds}
                onPayoutCalculated={(payouts: PayoutSummary[], calculations: FlatDistancePayout[]) => {
                    setFlatPayouts(payouts);
                    setFlatPayoutCalculations(calculations);
                    onPayoutCalculated?.(payouts, calculations);
                }}
            />
        );
    }, [routeData, locationData, clusterThresholds, directThresholds, flatThresholds, onPayoutCalculated]);

    return (
        <Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={viewMode} onChange={(_, newValue) => setViewMode(newValue)}>
                    <Tab label="Cluster-based Payouts" value="cluster" />
                    <Tab label="Direct Distance Payouts" value="direct" />
                    <Tab label="Flat Distance Payouts" value="flat" />
                    <Tab label="System Comparison" value="comparison" />
                </Tabs>
            </Box>

            {viewMode === 'cluster' ? (
                <ClusterBasedPayoutView 
                    routeData={routeData} 
                    locationData={locationData}
                    thresholds={clusterThresholds}
                    onThresholdsChange={setClusterThresholds}
                    onPayoutCalculated={(payouts: PayoutSummary[], calculations: PayoutCalculation[]) => {
                        setClusterPayouts(payouts);
                        setPayoutCalculations(calculations);
                        onPayoutCalculated?.(payouts, calculations);
                    }}
                />
            ) : viewMode === 'direct' ? (
                <DirectDistancePayoutView 
                    routeData={routeData} 
                    locationData={locationData}
                    thresholds={directThresholds}
                    onThresholdsChange={setDirectThresholds}
                    onPayoutCalculated={(payouts: PayoutSummary[], calculations: DirectDistancePayout[]) => {
                        setDirectPayouts(payouts);
                        setDirectPayoutCalculations(calculations);
                        onPayoutCalculated?.(payouts, calculations);
                    }}
                />
            ) : viewMode === 'flat' ? (
                <FlatDistancePayoutView
                    routeData={routeData}
                    locationData={locationData}
                    thresholds={flatThresholds}
                    onThresholdsChange={setFlatThresholds}
                    onPayoutCalculated={(payouts: PayoutSummary[], calculations: FlatDistancePayout[]) => {
                        setFlatPayouts(payouts);
                        setFlatPayoutCalculations(calculations);
                        onPayoutCalculated?.(payouts, calculations);
                    }}
                />
            ) : (
                <PayoutComparison
                    clusterPayouts={clusterPayouts}
                    directPayouts={directPayouts}
                    flatPayouts={flatPayouts}
                    routeData={routeData}
                    payoutCalculations={payoutCalculations}
                    directPayoutCalculations={directPayoutCalculations}
                    flatPayoutCalculations={flatPayoutCalculations}
                />
            )}
        </Box>
    );
};

const ClusterBasedPayoutView: React.FC<ClusterPayoutViewProps> = ({ 
    routeData, 
    locationData, 
    thresholds,
    onThresholdsChange,
    onPayoutCalculated 
}) => {
    const [payoutCalculations, setPayoutCalculations] = React.useState<PayoutCalculation[]>([]);
    const [payoutSummary, setPayoutSummary] = React.useState<PayoutSummary[]>([]);

    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        return L.latLng(lat1, lng1).distanceTo(L.latLng(lat2, lng2));
    };

    const calculatePayouts = React.useCallback(() => {
        const calculations: PayoutCalculation[] = [];
        const processedPairs = new Set<string>();
        const hexToHexIncentives = new Map<string, { regular: number; returnShare: number }>();
        const clusterRtoPercentages = new Map<string, { total: number; count: number }>();

        // First pass: Calculate cluster RTO percentages
        routeData.forEach(route => {
            const activities = route.activities.filter(a => a.type === 'delivery' && a.cluster_id);
            activities.forEach(activity => {
                if (!activity.cluster_id) return;
                const clusterId = String(activity.cluster_id);
                const hexagonId = String(activity.hexagon_index);
                
                // Get RTO percentage for this hexagon
                const hexagonMapping = locationData.hexagonCustomerMapping.find(mapping => 
                    String(mapping.hexagon_index) === hexagonId &&
                    mapping.dc_code === route.dc_code &&
                    mapping.fe_number === route.fe_number &&
                    mapping.ofd_date === route.date
                );
                
                if (hexagonMapping) {
                    if (!clusterRtoPercentages.has(clusterId)) {
                        clusterRtoPercentages.set(clusterId, { total: 0, count: 0 });
                    }
                    const clusterRto = clusterRtoPercentages.get(clusterId)!;
                    clusterRto.total += hexagonMapping.rto_percentage;
                    clusterRto.count++;
                }
            });
        });

        // Calculate average RTO percentage for each cluster
        const avgClusterRtoPercentages = new Map<string, number>();
        clusterRtoPercentages.forEach((value, clusterId) => {
            avgClusterRtoPercentages.set(clusterId, value.total / value.count);
        });

        routeData.forEach(route => {
            const dc = locationData.dcLocations.find(dc => dc.dc_code === route.dc_code);
            if (!dc) return;

            // Sort activities by sequence
            const activities = [...route.activities].sort((a, b) => a.sequence - b.sequence);

            // Group hexagons by cluster
            const clusterGroups = new Map<number, {
                hexagons: typeof activities,
                totalShipments: number,
                firstHexagon: typeof activities[0] | null
            }>();

            // First pass: Group hexagons by cluster and calculate total shipments per cluster
            activities.forEach(activity => {
                if (activity.type !== 'delivery' || !activity.hexagon_index || !activity.cluster_id) return;

                if (!clusterGroups.has(activity.cluster_id)) {
                    clusterGroups.set(activity.cluster_id, {
                        hexagons: [],
                        totalShipments: 0,
                        firstHexagon: null
                    });
                }

                const group = clusterGroups.get(activity.cluster_id)!;
                group.hexagons.push(activity);

                // Count shipments for this hexagon
                const shipments = locationData.hexagonCustomerMapping
                    .filter(mapping => 
                        String(mapping.hexagon_index) === String(activity.hexagon_index) &&
                        mapping.dc_code === route.dc_code &&
                        mapping.fe_number === route.fe_number &&
                        mapping.ofd_date === route.date
                    )
                    .reduce((sum, mapping) => sum + (mapping.delivery_count || 0), 0);

                group.totalShipments += shipments;

                // Track first hexagon in cluster
                if (!group.firstHexagon || activity.sequence < group.firstHexagon.sequence) {
                    group.firstHexagon = activity;
                }
            });

            // Calculate DC to first cluster incentive
            const cluster1 = clusterGroups.get(1);
            let dcToCluster1Incentive = 0;
            
            if (cluster1 && cluster1.firstHexagon) {
                // Use the distance_from_prev for the first hexagon of cluster 1
                const dcToCluster1Distance = cluster1.firstHexagon.distance_from_prev || 0;
                const dcToCluster1Excess = Math.max(0, dcToCluster1Distance - thresholds.dcToHexThreshold);
                dcToCluster1Incentive = dcToCluster1Excess * thresholds.dcToHexIncentivePerMeter;
            }

            // Calculate cluster to cluster incentives
            const sortedClusterIds = Array.from(clusterGroups.keys()).sort((a, b) => a - b);
            
            // Store cluster-to-cluster distances for display
            const clusterToClusterDistances = new Map<string, number>();
            
            for (let i = 0; i < sortedClusterIds.length - 1; i++) {
                const currentClusterId = sortedClusterIds[i];
                const nextClusterId = sortedClusterIds[i + 1];
                
                const currentCluster = clusterGroups.get(currentClusterId)!;
                const nextCluster = clusterGroups.get(nextClusterId)!;

                if (currentCluster.firstHexagon && nextCluster.firstHexagon) {
                    // Calculate distance from first hex of current cluster to first hex of next cluster
                    let clusterToClusterDistance = 0;
                    let currentHexagon = currentCluster.firstHexagon;
                    
                    // Keep track of visited hexagons to avoid infinite loops
                    const visitedHexagons = new Set<string>();
                    
                    while (currentHexagon) {
                        // Mark current hexagon as visited
                        visitedHexagons.add(String(currentHexagon.hexagon_index));
                        
                        // Find the next hexagon in sequence
                        const nextHexagon = activities.find(a => 
                            a.type === 'delivery' &&
                            a.hexagon_index &&
                            a.sequence > currentHexagon.sequence &&
                            !visitedHexagons.has(String(a.hexagon_index))
                        );
                        
                        if (!nextHexagon) break;
                        
                        // Add the distance to next hexagon
                        clusterToClusterDistance += nextHexagon.distance_from_prev || 0;
                        
                        // If we've reached the first hexagon of next cluster, we're done
                        if (nextHexagon.hexagon_index === nextCluster.firstHexagon.hexagon_index) {
                            break;
                        }
                        
                        // Move to next hexagon
                        currentHexagon = nextHexagon;
                    }

                    // Store the distance for display
                    const distanceKey = `${currentClusterId}-${nextClusterId}`;
                    clusterToClusterDistances.set(distanceKey, clusterToClusterDistance);

                    const clusterToClusterExcess = Math.max(0, clusterToClusterDistance - thresholds.hexToHexThreshold);
                    const clusterToClusterIncentive = clusterToClusterExcess * thresholds.hexToHexIncentivePerMeter;

                    // Store incentive for next cluster
                    if (clusterToClusterIncentive > 0) {
                        nextCluster.hexagons.forEach(activity => {
                            const incentiveKey = `${route.fe_number}-${route.date}-${activity.hexagon_index}`;
                            const hexShipments = locationData.hexagonCustomerMapping
                                .filter(mapping => 
                                    String(mapping.hexagon_index) === String(activity.hexagon_index) &&
                                    mapping.dc_code === route.dc_code &&
                                    mapping.fe_number === route.fe_number &&
                                    mapping.ofd_date === route.date
                                )
                                .reduce((sum, mapping) => sum + (mapping.delivery_count || 0), 0);
                            
                            const perHexagonIncentive = clusterToClusterIncentive / nextCluster.totalShipments * hexShipments;
                            hexToHexIncentives.set(incentiveKey, { 
                                regular: perHexagonIncentive,
                                returnShare: 0  // Will be set in return journey calculation
                            });
                        });
                    }
                }
            }

            // Calculate return journey incentive
            const returnActivity = activities.find(a => a.type === 'depot' && a.sequence > 0);
            if (returnActivity && returnActivity.distance_from_prev) {
                const returnDistance = returnActivity.distance_from_prev;
                const totalReturnIncentive = returnDistance * thresholds.returnIncentivePerMeter;

                if (thresholds.returnJourneyStrategy === 'proportional') {
                    // Existing proportional distribution strategy
                    // Calculate total inter-cluster distances
                    let totalInterClusterDistance = 0;
                    const clusterDistances = new Map<number, number>();

                    // First cluster: DC to first hex
                    if (cluster1 && cluster1.firstHexagon) {
                        totalInterClusterDistance += cluster1.firstHexagon.distance_from_prev || 0;
                        clusterDistances.set(1, cluster1.firstHexagon.distance_from_prev || 0);
                    }

                    // Between clusters
                    for (let i = 0; i < sortedClusterIds.length - 1; i++) {
                        const currentClusterId = sortedClusterIds[i];
                        const nextClusterId = sortedClusterIds[i + 1];
                        const distanceKey = `${currentClusterId}-${nextClusterId}`;
                        const distance = clusterToClusterDistances.get(distanceKey) || 0;
                        totalInterClusterDistance += distance;
                        clusterDistances.set(nextClusterId, distance);
                    }

                    // Distribute return incentive to clusters based on their distances
                    clusterGroups.forEach((cluster, clusterId) => {
                        const clusterDistance = clusterDistances.get(clusterId) || 0;
                        const clusterReturnIncentive = (clusterDistance / totalInterClusterDistance) * totalReturnIncentive;

                        // Distribute cluster's share among its hexagons based on shipments
                        cluster.hexagons.forEach(activity => {
                            const hexShipments = locationData.hexagonCustomerMapping
                                .filter(mapping => 
                                    String(mapping.hexagon_index) === String(activity.hexagon_index) &&
                                    mapping.dc_code === route.dc_code &&
                                    mapping.fe_number === route.fe_number &&
                                    mapping.ofd_date === route.date
                                )
                                .reduce((sum, mapping) => sum + (mapping.delivery_count || 0), 0);

                            const hexReturnIncentive = (hexShipments / cluster.totalShipments) * clusterReturnIncentive;
                            const incentiveKey = `${route.fe_number}-${route.date}-${activity.hexagon_index}`;
                            const currentIncentive = hexToHexIncentives.get(incentiveKey) || { regular: 0, returnShare: 0 };
                            hexToHexIncentives.set(incentiveKey, {
                                regular: currentIncentive.regular,
                                returnShare: hexReturnIncentive
                            });
                        });
                    });
                } else {
                    // New weighted distribution strategy
                    // Calculate total weighted sum (sequence * shipments)
                    let totalWeightedSum = 0;
                    const hexagonWeights = new Map<string, { weight: number; shipments: number }>();

                    activities.forEach(activity => {
                        if (activity.type === 'delivery' && activity.hexagon_index) {
                            const hexShipments = locationData.hexagonCustomerMapping
                                .filter(mapping => 
                                    String(mapping.hexagon_index) === String(activity.hexagon_index) &&
                                    mapping.dc_code === route.dc_code &&
                                    mapping.fe_number === route.fe_number &&
                                    mapping.ofd_date === route.date
                                )
                                .reduce((sum, mapping) => sum + (mapping.delivery_count || 0), 0);

                            const weight = activity.sequence * hexShipments;
                            totalWeightedSum += weight;
                            hexagonWeights.set(String(activity.hexagon_index), { 
                                weight, 
                                shipments: hexShipments 
                            });
                        }
                    });

                    // Distribute return incentive based on weighted proportions
                    activities.forEach(activity => {
                        if (activity.type === 'delivery' && activity.hexagon_index) {
                            const hexId = String(activity.hexagon_index);
                            const hexWeight = hexagonWeights.get(hexId);
                            
                            if (hexWeight) {
                                const hexReturnIncentive = (hexWeight.weight / totalWeightedSum) * totalReturnIncentive;
                                const incentiveKey = `${route.fe_number}-${route.date}-${hexId}`;
                                const currentIncentive = hexToHexIncentives.get(incentiveKey) || { regular: 0, returnShare: 0 };
                                hexToHexIncentives.set(incentiveKey, {
                                    regular: currentIncentive.regular,
                                    returnShare: hexReturnIncentive
                                });
                            }
                        }
                    });
                }
            }

            // Create final calculations for each hexagon
            activities.forEach(activity => {
                if (activity.type === 'depot' && activity.sequence > 0) {
                    // This is the return to depot activity
                    calculations.push({
                        hexagonId: 'Return to DC',
                        clusterId: 'N/A',
                        dcCode: route.dc_code,
                        feNumber: route.fe_number,
                        date: route.date,
                        totalShipments: 0,
                        dcToHexDistance: activity.distance_from_prev || 0,
                        dcToHexExcess: 0,
                        dcToHexIncentive: 0,
                        hexToHexDistance: 0,
                        hexToHexExcess: 0,
                        hexToHexIncentive: 0,
                        returnJourneyShare: 0,
                        totalIncentive: activity.distance_from_prev ? activity.distance_from_prev * thresholds.returnIncentivePerMeter : 0,
                        baseEarnings: 0,
                        totalEarnings: 0,
                        incentivePerShipment: 0,
                        earningsPerShipment: 0,
                        earningsPerShipmentPreRto: 0,
                        earningsPerShipmentPostRto: 0,
                        connectedHexId: null,
                        isFirstHexInCluster: false,
                        incomingHexId: null,
                        rtoPercentage: 0,
                        clusterRtoPercentage: 0
                    });
                    return;
                }

                if (activity.type !== 'delivery' || !activity.hexagon_index || !activity.cluster_id) return;
                
                const hexagonId = String(activity.hexagon_index);
                const clusterId = String(activity.cluster_id);
                const pairKey = `${route.fe_number}-${route.date}-${hexagonId}`;
                
                if (processedPairs.has(pairKey)) return;
                processedPairs.add(pairKey);

                const currentCluster = clusterGroups.get(activity.cluster_id)!;
                
                // Get hexagon RTO percentage
                const hexagonMapping = locationData.hexagonCustomerMapping.find(mapping => 
                    String(mapping.hexagon_index) === hexagonId &&
                    mapping.dc_code === route.dc_code &&
                    mapping.fe_number === route.fe_number &&
                    mapping.ofd_date === route.date
                );
                
                const rtoPercentage = hexagonMapping?.rto_percentage || 0;
                const clusterRtoPercentage = avgClusterRtoPercentages.get(clusterId) || 0;
                
                // Get shipments for this hexagon
                const totalShipments = locationData.hexagonCustomerMapping
                    .filter(mapping => 
                        String(mapping.hexagon_index) === hexagonId &&
                        mapping.dc_code === route.dc_code &&
                        mapping.fe_number === route.fe_number &&
                        mapping.ofd_date === route.date
                    )
                    .reduce((sum, mapping) => sum + (mapping.delivery_count || 0), 0);

                // Calculate incentives
                const dcToHexIncentive = activity.cluster_id === 1 ? 
                    (dcToCluster1Incentive / currentCluster.totalShipments) * totalShipments : 0;
                
                const incentives = hexToHexIncentives.get(pairKey) || { regular: 0, returnShare: 0 };
                const totalIncentive = dcToHexIncentive + incentives.regular + incentives.returnShare;

                const baseEarnings = totalShipments * thresholds.baseShipmentPrice;
                const totalEarnings = baseEarnings + totalIncentive;
                
                // Apply RTO percentage adjustment only to incentives
                const cappedRtoPercentage = Math.min(rtoPercentage, MAX_RTO_PERCENTAGE);
                const adjustedIncentive = totalIncentive / (1 - (cappedRtoPercentage / 100));
                const earningsPerShipmentPreRto = totalShipments > 0 ? 
                    (baseEarnings + totalIncentive) / totalShipments : 0;
                const earningsPerShipmentPostRto = totalShipments > 0 ? 
                    (baseEarnings + adjustedIncentive) / totalShipments : 0;
                const totalEarningsPreRto = baseEarnings + totalIncentive;
                const totalEarningsPostRto = baseEarnings + adjustedIncentive;

                // Find connected hexagons
                const nextActivity = activities.find(a => 
                    a.sequence > activity.sequence && 
                    a.type === 'delivery' && 
                    a.cluster_id !== activity.cluster_id
                );

                // Get the cluster-to-cluster distance if this is a first hexagon
                let hexToHexDistance = 0;
                let hexToHexExcess = 0;
                
                if (activity === currentCluster.firstHexagon && activity.cluster_id > 1) {
                    const prevClusterId = activity.cluster_id - 1;
                    const distanceKey = `${prevClusterId}-${activity.cluster_id}`;
                    hexToHexDistance = clusterToClusterDistances.get(distanceKey) || 0;
                    hexToHexExcess = Math.max(0, hexToHexDistance - thresholds.hexToHexThreshold);
                }

                calculations.push({
                    hexagonId,
                    clusterId,
                    dcCode: route.dc_code,
                    feNumber: route.fe_number,
                    date: route.date,
                    totalShipments,
                    dcToHexDistance: activity.cluster_id === 1 ? 
                        (currentCluster.firstHexagon?.distance_from_prev || 0) : 0,
                    dcToHexExcess: activity.cluster_id === 1 ? 
                        Math.max(0, (currentCluster.firstHexagon?.distance_from_prev || 0) - thresholds.dcToHexThreshold) : 0,
                    dcToHexIncentive,
                    hexToHexDistance,
                    hexToHexExcess,
                    hexToHexIncentive: incentives.regular + incentives.returnShare,
                    returnJourneyShare: incentives.returnShare,
                    totalIncentive,
                    baseEarnings,
                    totalEarnings: totalEarningsPostRto,
                    incentivePerShipment: totalShipments > 0 ? totalIncentive / totalShipments : 0,
                    earningsPerShipment: earningsPerShipmentPostRto,
                    earningsPerShipmentPreRto,
                    earningsPerShipmentPostRto,
                    connectedHexId: nextActivity ? String(nextActivity.hexagon_index) : null,
                    isFirstHexInCluster: activity === currentCluster.firstHexagon,
                    incomingHexId: null,
                    rtoPercentage,
                    clusterRtoPercentage
                });
            });
        });

        // Update incoming hexagon IDs
        calculations.forEach(calc => {
            const incomingCalc = calculations.find(c => c.connectedHexId === calc.connectedHexId);
            if (incomingCalc) {
                calc.incomingHexId = incomingCalc.hexagonId;
            }
        });

        // Calculate summary statistics
        const summary = new Map<string, PayoutSummary>();
        
        calculations.forEach(calc => {
            // Skip "Return to DC" rows as their incentives are already distributed
            if (calc.hexagonId === 'Return to DC') return;

            if (!summary.has(calc.dcCode)) {
                summary.set(calc.dcCode, {
                    dcCode: calc.dcCode,
                    totalShipments: 0,
                    totalIncentivesPreRto: 0,
                    totalIncentivesPostRto: 0,
                    totalBaseEarnings: 0,
                    totalEarningsPreRto: 0,
                    totalEarningsPostRto: 0,
                    avgEarningsPerShipmentPreRto: 0,
                    avgEarningsPerShipmentPostRto: 0,
                    pilots: {}
                });
            }

            const dcSummary = summary.get(calc.dcCode)!;
            dcSummary.totalShipments += calc.totalShipments;
            dcSummary.totalIncentivesPreRto += calc.totalIncentive;
            dcSummary.totalIncentivesPostRto += calc.totalIncentive / (1 - (calc.clusterRtoPercentage / 100));
            dcSummary.totalBaseEarnings += calc.baseEarnings;
            dcSummary.totalEarningsPreRto += calc.baseEarnings + calc.totalIncentive;
            dcSummary.totalEarningsPostRto += calc.baseEarnings + (calc.totalIncentive / (1 - (calc.clusterRtoPercentage / 100)));

            if (!dcSummary.pilots[calc.feNumber]) {
                dcSummary.pilots[calc.feNumber] = {
                    shipments: 0,
                    incentivesPreRto: 0,
                    incentivesPostRto: 0,
                    baseEarnings: 0,
                    totalEarningsPreRto: 0,
                    totalEarningsPostRto: 0,
                    earningsPerShipmentPreRto: 0,
                    earningsPerShipmentPostRto: 0
                };
            }

            const pilotSummary = dcSummary.pilots[calc.feNumber];
            pilotSummary.shipments += calc.totalShipments;
            pilotSummary.incentivesPreRto += calc.totalIncentive;
            pilotSummary.incentivesPostRto += calc.totalIncentive / (1 - (calc.clusterRtoPercentage / 100));
            pilotSummary.baseEarnings += calc.baseEarnings;
            pilotSummary.totalEarningsPreRto += calc.baseEarnings + calc.totalIncentive;
            pilotSummary.totalEarningsPostRto += calc.baseEarnings + (calc.totalIncentive / (1 - (calc.clusterRtoPercentage / 100)));
            pilotSummary.earningsPerShipmentPreRto = pilotSummary.shipments > 0 ?
                pilotSummary.totalEarningsPreRto / pilotSummary.shipments : 0;
            pilotSummary.earningsPerShipmentPostRto = pilotSummary.shipments > 0 ?
                pilotSummary.totalEarningsPostRto / pilotSummary.shipments : 0;
        });

        // Calculate averages
        summary.forEach(dc => {
            dc.avgEarningsPerShipmentPreRto = dc.totalShipments > 0 ?
                dc.totalEarningsPreRto / dc.totalShipments : 0;
            dc.avgEarningsPerShipmentPostRto = dc.totalShipments > 0 ?
                dc.totalEarningsPostRto / dc.totalShipments : 0;
        });

        setPayoutSummary(Array.from(summary.values()));
        setPayoutCalculations(calculations);
        onPayoutCalculated?.(Array.from(summary.values()), calculations);
    }, [routeData, locationData, thresholds, onPayoutCalculated]);

    React.useEffect(() => {
        calculatePayouts();
    }, [calculatePayouts]);

    const handleThresholdChange = (field: keyof ThresholdConfig) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            onThresholdsChange({
                ...thresholds,
                [field]: value
            });
        }
    };

    // Add formatter function
    const formatTooltipValue = (value: number) => `₹${value.toFixed(2)}`;

    return (
        <Box p={3}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="h6" gutterBottom>Configuration</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={2}>
                                <TextField
                                    label="Base Price per Shipment (₹)"
                                    type="number"
                                    value={thresholds.baseShipmentPrice}
                                    onChange={handleThresholdChange('baseShipmentPrice')}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={2}>
                                <TextField
                                    label="DC to First Cluster-1 Hex Threshold (m)"
                                    type="number"
                                    value={thresholds.dcToHexThreshold}
                                    onChange={handleThresholdChange('dcToHexThreshold')}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={2}>
                                <TextField
                                    label="Hex to Hex Threshold (m)"
                                    type="number"
                                    value={thresholds.hexToHexThreshold}
                                    onChange={handleThresholdChange('hexToHexThreshold')}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={2}>
                                <TextField
                                    label="DC to Hex Incentive (₹/m)"
                                    type="number"
                                    value={thresholds.dcToHexIncentivePerMeter}
                                    onChange={handleThresholdChange('dcToHexIncentivePerMeter')}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={2}>
                                <TextField
                                    label="Hex to Hex Incentive (₹/m)"
                                    type="number"
                                    value={thresholds.hexToHexIncentivePerMeter}
                                    onChange={handleThresholdChange('hexToHexIncentivePerMeter')}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={2}>
                                <TextField
                                    label="Return Journey Incentive (₹/m)"
                                    type="number"
                                    value={thresholds.returnIncentivePerMeter}
                                    onChange={handleThresholdChange('returnIncentivePerMeter')}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={2}>
                                <TextField
                                    select
                                    label="Return Journey Strategy"
                                    value={thresholds.returnJourneyStrategy}
                                    onChange={(e) => onThresholdsChange({
                                        ...thresholds,
                                        returnJourneyStrategy: e.target.value as 'proportional' | 'weighted'
                                    })}
                                    fullWidth
                                >
                                    <MenuItem value="proportional">Proportional to Distance</MenuItem>
                                    <MenuItem value="weighted">Weighted by Sequence</MenuItem>
                                </TextField>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="h6" gutterBottom>DC Level Summary</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={payoutSummary}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="dcCode" />
                                <YAxis tickFormatter={(value) => `₹${value.toFixed(2)}`} />
                                <Tooltip formatter={formatTooltipValue} />
                                <Legend />
                                <Bar dataKey="totalBaseEarnings" name="Base Earnings" fill="#8884d8" />
                                <Bar dataKey="totalIncentivesPreRto" name="Incentives (Pre-RTO)" fill="#82ca9d" />
                                <Bar dataKey="totalIncentivesPostRto" name="Incentives (Post-RTO)" fill="#ffc658" />
                                <Bar dataKey="avgEarningsPerShipmentPreRto" name="Avg Earnings/Shipment (Pre-RTO)" fill="#ff8042" />
                                <Bar dataKey="avgEarningsPerShipmentPostRto" name="Avg Earnings/Shipment (Post-RTO)" fill="#00C49F" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Pilot Level Summary</Typography>
                    <Grid container spacing={2}>
                        {payoutSummary.map(dc => 
                            Object.entries(dc.pilots).map(([feNumber, pilot]) => (
                                <Grid item xs={3} key={`${dc.dcCode}-${feNumber}`}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" color="primary">
                                                FE: {feNumber}
                                            </Typography>
                                            <Typography variant="subtitle1" color="textSecondary">
                                                DC: {dc.dcCode}
                                            </Typography>
                                            <Typography>
                                                Shipments: {pilot.shipments}
                                            </Typography>
                                            <Typography>
                                                Base Earnings: ₹{pilot.baseEarnings.toFixed(2)}
                                            </Typography>
                                            <Box sx={{ mt: 2, borderTop: '1px solid #eee', pt: 1 }}>
                                                <Typography variant="subtitle2" color="primary">Pre-RTO</Typography>
                                                <Typography>
                                                    Incentives: ₹{pilot.incentivesPreRto.toFixed(2)}
                                                </Typography>
                                                <Typography>
                                                    Total Earnings: ₹{pilot.totalEarningsPreRto.toFixed(2)}
                                                </Typography>
                                                <Typography>
                                                    Per Shipment: ₹{pilot.earningsPerShipmentPreRto.toFixed(2)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ mt: 2, borderTop: '1px solid #eee', pt: 1 }}>
                                                <Typography variant="subtitle2" color="error">Post-RTO</Typography>
                                                <Typography>
                                                    Incentives: ₹{pilot.incentivesPostRto.toFixed(2)}
                                                </Typography>
                                                <Typography>
                                                    Total Earnings: ₹{pilot.totalEarningsPostRto.toFixed(2)}
                                                </Typography>
                                                <Typography>
                                                    Per Shipment: ₹{pilot.earningsPerShipmentPostRto.toFixed(2)}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))
                        )}
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Basic Info</TableCell>
                                    <TableCell>Cluster Info</TableCell>
                                    <TableCell>Route Distance</TableCell>
                                    <TableCell>Shipments & Base Pay</TableCell>
                                    <TableCell>Incentive Breakdown</TableCell>
                                    <TableCell>Total Earnings</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {payoutCalculations.map((calc, idx) => {
                                    const connectedClusterId = payoutCalculations.find(
                                        c => c.connectedHexId === calc.connectedHexId
                                    )?.clusterId || 'N/A';

                                    return (
                                        <TableRow 
                                            key={`${calc.hexagonId}-${idx}`}
                                            sx={{
                                                backgroundColor: calc.hexagonId === 'Return to DC' ?
                                                    'rgba(211, 211, 211, 0.3)' :  // light gray for return to DC
                                                    calc.isFirstHexInCluster ? 
                                                        calc.clusterId === '1' ?
                                                            'rgba(144, 238, 144, 0.2)' :  // light green for first hex of cluster 1
                                                            'rgba(255, 255, 0, 0.1)'      // light yellow for first hex of other clusters
                                                        : 'inherit'
                                            }}
                                        >
                                            <TableCell>
                                                <Typography><strong>Hex ID:</strong> {calc.hexagonId}</Typography>
                                                <Typography><strong>DC:</strong> {calc.dcCode}</Typography>
                                                <Typography><strong>FE:</strong> {calc.feNumber}</Typography>
                                                <Typography><strong>Date:</strong> {calc.date}</Typography>
                                            </TableCell>
                                            
                                            <TableCell>
                                                {calc.hexagonId === 'Return to DC' ? (
                                                    <Typography color="textSecondary">Return Journey</Typography>
                                                ) : (
                                                    <Typography>
                                                        <strong>Cluster:</strong> {calc.clusterId}
                                                        {calc.isFirstHexInCluster && (
                                                            <Typography component="span" color="primary">
                                                                {' '}(First Hexagon)
                                                            </Typography>
                                                        )}
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {calc.hexagonId === 'Return to DC' ? (
                                                    <>
                                                        <Typography><strong>Route:</strong> Last Delivery → DC</Typography>
                                                        <Typography><strong>Distance:</strong> {calc.dcToHexDistance.toFixed(2)}m</Typography>
                                                        <Typography><strong>Total Return Incentive:</strong> ₹{calc.totalIncentive.toFixed(2)}</Typography>
                                                        <Typography color="textSecondary">(Distributed among clusters)</Typography>
                                                    </>
                                                ) : calc.clusterId === '1' && calc.isFirstHexInCluster ? (
                                                    <>
                                                        <Typography><strong>Route:</strong> DC → First Hex of Cluster 1</Typography>
                                                        <Typography><strong>Distance:</strong> {calc.dcToHexDistance.toFixed(2)}m</Typography>
                                                        {calc.dcToHexExcess > 0 && (
                                                            <Typography color="error">
                                                                <strong>Excess:</strong> {calc.dcToHexExcess.toFixed(2)}m
                                                            </Typography>
                                                        )}
                                                    </>
                                                ) : calc.isFirstHexInCluster ? (
                                                    <>
                                                        <Typography>
                                                            <strong>Route:</strong> First Hex of Cluster {Number(calc.clusterId) - 1} → First Hex of Cluster {calc.clusterId}
                                                        </Typography>
                                                        <Typography><strong>Distance:</strong> {calc.hexToHexDistance.toFixed(2)}m</Typography>
                                                        {calc.hexToHexExcess > 0 && (
                                                            <Typography color="error">
                                                                <strong>Excess:</strong> {calc.hexToHexExcess.toFixed(2)}m
                                                            </Typography>
                                                        )}
                                                    </>
                                                ) : (
                                                    <Typography color="textSecondary">Internal hexagon</Typography>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {calc.hexagonId === 'Return to DC' ? (
                                                    <Typography color="textSecondary">N/A</Typography>
                                                ) : (
                                                    <>
                                                        <Typography><strong>Shipments:</strong> {calc.totalShipments}</Typography>
                                                        <Typography><strong>Base Pay:</strong> ₹{calc.baseEarnings.toFixed(2)}</Typography>
                                                        <Typography><strong>Per Shipment:</strong> ₹{thresholds.baseShipmentPrice.toFixed(2)}</Typography>
                                                    </>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {calc.hexagonId === 'Return to DC' ? (
                                                    <Typography color="textSecondary">Distributed among clusters</Typography>
                                                ) : calc.clusterId === '1' ? (
                                                    <>
                                                        {calc.dcToHexIncentive > 0 && (
                                                            <Typography>
                                                                <strong>DC→Cluster1:</strong> ₹{calc.dcToHexIncentive.toFixed(2)}
                                                            </Typography>
                                                        )}
                                                        {calc.returnJourneyShare > 0 && (
                                                            <Typography>
                                                                <strong>Return Journey Share:</strong> ₹{calc.returnJourneyShare.toFixed(2)}
                                                            </Typography>
                                                        )}
                                                        <Typography sx={{ mt: 1, borderTop: '1px dashed #ccc', pt: 1 }}>
                                                            <strong>Total Incentive:</strong> ₹{calc.totalIncentive.toFixed(2)}
                                                        </Typography>
                                                    </>
                                                ) : calc.hexToHexIncentive > 0 || calc.returnJourneyShare > 0 ? (
                                                    <>
                                                        {(calc.hexToHexIncentive - calc.returnJourneyShare) > 0 && (
                                                            <Typography>
                                                                <strong>From Prev Cluster:</strong> ₹{(calc.hexToHexIncentive - calc.returnJourneyShare).toFixed(2)}
                                                            </Typography>
                                                        )}
                                                        {calc.returnJourneyShare > 0 && (
                                                            <Typography>
                                                                <strong>Return Journey Share:</strong> ₹{calc.returnJourneyShare.toFixed(2)}
                                                            </Typography>
                                                        )}
                                                        <Typography sx={{ mt: 1, borderTop: '1px dashed #ccc', pt: 1 }}>
                                                            <strong>Total Incentive:</strong> ₹{calc.totalIncentive.toFixed(2)}
                                                        </Typography>
                                                    </>
                                                ) : (
                                                    <Typography color="textSecondary">No incentives</Typography>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {calc.hexagonId === 'Return to DC' ? (
                                                    <Typography color="textSecondary">N/A</Typography>
                                                ) : (
                                                    <>
                                                        <Box sx={{ borderBottom: '1px dashed #ccc', pb: 1, mb: 1 }}>
                                                            <Typography><strong>Before RTO:</strong></Typography>
                                                            <Typography>Total: ₹{(calc.baseEarnings + calc.totalIncentive).toFixed(2)}</Typography>
                                                            <Typography>Per Shipment: ₹{calc.earningsPerShipmentPreRto.toFixed(2)}</Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography><strong>After RTO ({calc.clusterRtoPercentage.toFixed(2)}%):</strong></Typography>
                                                            <Typography>Total: ₹{calc.totalEarnings.toFixed(2)}</Typography>
                                                            <Typography>Per Shipment: ₹{calc.earningsPerShipmentPostRto.toFixed(2)}</Typography>
                                                        </Box>
                                                    </>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>
        </Box>
    );
};

const DirectDistancePayoutView: React.FC<DirectPayoutViewProps> = ({ 
    routeData, 
    locationData, 
    thresholds,
    onThresholdsChange,
    onPayoutCalculated 
}) => {
    const [payoutCalculations, setPayoutCalculations] = React.useState<DirectDistancePayout[]>([]);
    const [payoutSummary, setPayoutSummary] = React.useState<PayoutSummary[]>([]);

    const calculateDirectDistancePayouts = React.useCallback(() => {
        const calculations: DirectDistancePayout[] = [];
        const processedPairs = new Set<string>();

        routeData.forEach(route => {
            route.activities.forEach(activity => {
                if (activity.type !== 'delivery' || !activity.hexagon_index || !activity.distance_from_dc) return;

                const pairKey = `${route.fe_number}-${route.date}-${activity.hexagon_index}`;
                if (processedPairs.has(pairKey)) return;
                processedPairs.add(pairKey);

                // Get shipments and RTO percentage for this hexagon
                const hexagonMapping = locationData.hexagonCustomerMapping
                    .find(mapping => 
                        String(mapping.hexagon_index) === String(activity.hexagon_index) &&
                        mapping.dc_code === route.dc_code &&
                        mapping.fe_number === route.fe_number &&
                        mapping.ofd_date === route.date
                    );

                const totalShipments = hexagonMapping?.delivery_count || 0;
                const rtoPercentage = hexagonMapping?.rto_percentage || 0;

                // Use the pre-calculated distance from DC
                const directDistance = activity.distance_from_dc;
                const excessDistance = Math.max(0, directDistance - thresholds.distanceThreshold);
                const distanceIncentive = excessDistance * thresholds.incentivePerMeter;
                const baseEarnings = totalShipments * thresholds.baseShipmentPrice;
                
                // Apply RTO percentage adjustment only to incentives
                const adjustedIncentive = distanceIncentive / (1 - (rtoPercentage / 100));
                const totalEarningsPreRto = baseEarnings + distanceIncentive;
                const totalEarningsPostRto = baseEarnings + adjustedIncentive;
                const earningsPerShipmentPreRto = totalShipments > 0 ? totalEarningsPreRto / totalShipments : 0;
                const earningsPerShipmentPostRto = totalShipments > 0 ? totalEarningsPostRto / totalShipments : 0;

                calculations.push({
                    hexagonId: String(activity.hexagon_index),
                    dcCode: route.dc_code,
                    feNumber: route.fe_number,
                    date: route.date,
                    totalShipments,
                    directDistance,
                    excessDistance,
                    distanceIncentive,
                    baseEarnings,
                    totalEarnings: totalEarningsPostRto,
                    earningsPerShipment: earningsPerShipmentPostRto,
                    earningsPerShipmentPreRto,
                    earningsPerShipmentPostRto,
                    rtoPercentage
                });
            });
        });

        // Calculate summary statistics
        const summary = new Map<string, PayoutSummary>();
        
        calculations.forEach(calc => {
            if (!summary.has(calc.dcCode)) {
                summary.set(calc.dcCode, {
                    dcCode: calc.dcCode,
                    totalShipments: 0,
                    totalIncentivesPreRto: 0,
                    totalIncentivesPostRto: 0,
                    totalBaseEarnings: 0,
                    totalEarningsPreRto: 0,
                    totalEarningsPostRto: 0,
                    avgEarningsPerShipmentPreRto: 0,
                    avgEarningsPerShipmentPostRto: 0,
                    pilots: {}
                });
            }

            const dcSummary = summary.get(calc.dcCode)!;
            dcSummary.totalShipments += calc.totalShipments;
            dcSummary.totalIncentivesPreRto += calc.distanceIncentive;
            dcSummary.totalIncentivesPostRto += calc.distanceIncentive / (1 - (calc.rtoPercentage / 100));
            dcSummary.totalBaseEarnings += calc.baseEarnings;
            dcSummary.totalEarningsPreRto += calc.baseEarnings + calc.distanceIncentive;
            dcSummary.totalEarningsPostRto += calc.baseEarnings + (calc.distanceIncentive / (1 - (calc.rtoPercentage / 100)));

            if (!dcSummary.pilots[calc.feNumber]) {
                dcSummary.pilots[calc.feNumber] = {
                    shipments: 0,
                    incentivesPreRto: 0,
                    incentivesPostRto: 0,
                    baseEarnings: 0,
                    totalEarningsPreRto: 0,
                    totalEarningsPostRto: 0,
                    earningsPerShipmentPreRto: 0,
                    earningsPerShipmentPostRto: 0
                };
            }

            const pilotSummary = dcSummary.pilots[calc.feNumber];
            pilotSummary.shipments += calc.totalShipments;
            pilotSummary.incentivesPreRto += calc.distanceIncentive;
            pilotSummary.incentivesPostRto += calc.distanceIncentive / (1 - (calc.rtoPercentage / 100));
            pilotSummary.baseEarnings += calc.baseEarnings;
            pilotSummary.totalEarningsPreRto += calc.baseEarnings + calc.distanceIncentive;
            pilotSummary.totalEarningsPostRto += calc.baseEarnings + (calc.distanceIncentive / (1 - (calc.rtoPercentage / 100)));
            pilotSummary.earningsPerShipmentPreRto = pilotSummary.shipments > 0 ?
                pilotSummary.totalEarningsPreRto / pilotSummary.shipments : 0;
            pilotSummary.earningsPerShipmentPostRto = pilotSummary.shipments > 0 ?
                pilotSummary.totalEarningsPostRto / pilotSummary.shipments : 0;
        });

        // Calculate averages
        summary.forEach(dc => {
            dc.avgEarningsPerShipmentPreRto = dc.totalShipments > 0 ?
                dc.totalEarningsPreRto / dc.totalShipments : 0;
            dc.avgEarningsPerShipmentPostRto = dc.totalShipments > 0 ?
                dc.totalEarningsPostRto / dc.totalShipments : 0;
        });

        setPayoutSummary(Array.from(summary.values()));
        setPayoutCalculations(calculations);
        onPayoutCalculated?.(Array.from(summary.values()), calculations);
    }, [routeData, locationData, thresholds, onPayoutCalculated]);

    React.useEffect(() => {
        calculateDirectDistancePayouts();
    }, [calculateDirectDistancePayouts]);

    const handleThresholdChange = (field: keyof DirectDistanceThresholdConfig) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            onThresholdsChange({
                ...thresholds,
                [field]: value
            });
        }
    };

    // Add formatter function
    const formatTooltipValue = (value: number) => `₹${value.toFixed(2)}`;

    return (
        <Box p={3}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="h6" gutterBottom>Direct Distance Configuration</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={4}>
                                <TextField
                                    label="Base Price per Shipment (₹)"
                                    type="number"
                                    value={thresholds.baseShipmentPrice}
                                    onChange={handleThresholdChange('baseShipmentPrice')}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <TextField
                                    label="Distance Threshold (m)"
                                    type="number"
                                    value={thresholds.distanceThreshold}
                                    onChange={handleThresholdChange('distanceThreshold')}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <TextField
                                    label="Distance Incentive (₹/m)"
                                    type="number"
                                    value={thresholds.incentivePerMeter}
                                    onChange={handleThresholdChange('incentivePerMeter')}
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="h6" gutterBottom>DC Level Summary</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={payoutSummary}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="dcCode" />
                                <YAxis tickFormatter={(value) => `₹${value.toFixed(2)}`} />
                                <Tooltip formatter={formatTooltipValue} />
                                <Legend />
                                <Bar dataKey="totalBaseEarnings" name="Base Earnings" fill="#8884d8" />
                                <Bar dataKey="totalIncentivesPreRto" name="Incentives (Pre-RTO)" fill="#82ca9d" />
                                <Bar dataKey="totalIncentivesPostRto" name="Incentives (Post-RTO)" fill="#ffc658" />
                                <Bar dataKey="avgEarningsPerShipmentPreRto" name="Avg Earnings/Shipment (Pre-RTO)" fill="#ff8042" />
                                <Bar dataKey="avgEarningsPerShipmentPostRto" name="Avg Earnings/Shipment (Post-RTO)" fill="#00C49F" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Pilot Level Summary</Typography>
                    <Grid container spacing={2}>
                        {payoutSummary.map(dc => 
                            Object.entries(dc.pilots).map(([feNumber, pilot]) => (
                                <Grid item xs={3} key={`${dc.dcCode}-${feNumber}`}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" color="primary">
                                                FE: {feNumber}
                                            </Typography>
                                            <Typography variant="subtitle1" color="textSecondary">
                                                DC: {dc.dcCode}
                                            </Typography>
                                            <Typography>
                                                Shipments: {pilot.shipments}
                                            </Typography>
                                            <Typography>
                                                Base Earnings: ₹{pilot.baseEarnings.toFixed(2)}
                                            </Typography>
                                            <Box sx={{ mt: 2, borderTop: '1px solid #eee', pt: 1 }}>
                                                <Typography variant="subtitle2" color="primary">Pre-RTO</Typography>
                                                <Typography>
                                                    Incentives: ₹{pilot.incentivesPreRto.toFixed(2)}
                                                </Typography>
                                                <Typography>
                                                    Total Earnings: ₹{pilot.totalEarningsPreRto.toFixed(2)}
                                                </Typography>
                                                <Typography>
                                                    Per Shipment: ₹{pilot.earningsPerShipmentPreRto.toFixed(2)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ mt: 2, borderTop: '1px solid #eee', pt: 1 }}>
                                                <Typography variant="subtitle2" color="error">Post-RTO</Typography>
                                                <Typography>
                                                    Incentives: ₹{pilot.incentivesPostRto.toFixed(2)}
                                                </Typography>
                                                <Typography>
                                                    Total Earnings: ₹{pilot.totalEarningsPostRto.toFixed(2)}
                                                </Typography>
                                                <Typography>
                                                    Per Shipment: ₹{pilot.earningsPerShipmentPostRto.toFixed(2)}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))
                        )}
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Basic Info</TableCell>
                                    <TableCell>Distance Info</TableCell>
                                    <TableCell>Shipments & Base Pay</TableCell>
                                    <TableCell>Distance Incentive</TableCell>
                                    <TableCell>Total Earnings</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {payoutCalculations.map((calc, idx) => (
                                    <TableRow key={`${calc.hexagonId}-${idx}`}>
                                        <TableCell>
                                            <Typography><strong>Hex ID:</strong> {calc.hexagonId}</Typography>
                                            <Typography><strong>DC:</strong> {calc.dcCode}</Typography>
                                            <Typography><strong>FE:</strong> {calc.feNumber}</Typography>
                                            <Typography><strong>Date:</strong> {calc.date}</Typography>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <Typography><strong>Direct Distance:</strong> {calc.directDistance.toFixed(2)}m</Typography>
                                            {calc.excessDistance > 0 && (
                                                <Typography color="error">
                                                    <strong>Excess:</strong> {calc.excessDistance.toFixed(2)}m
                                                </Typography>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <Typography><strong>Shipments:</strong> {calc.totalShipments}</Typography>
                                            <Typography><strong>Base Pay:</strong> ₹{calc.baseEarnings.toFixed(2)}</Typography>
                                            <Typography><strong>Per Shipment:</strong> ₹{thresholds.baseShipmentPrice.toFixed(2)}</Typography>
                                        </TableCell>

                                        <TableCell>
                                            {calc.distanceIncentive > 0 ? (
                                                <>
                                                    <Typography>
                                                        <strong>Distance Incentive:</strong> ₹{calc.distanceIncentive.toFixed(2)}
                                                    </Typography>
                                                    <Typography color="textSecondary">
                                                        ({thresholds.incentivePerMeter.toFixed(2)} ₹/m × {calc.excessDistance.toFixed(2)}m)
                                                    </Typography>
                                                </>
                                            ) : (
                                                <Typography color="textSecondary">No distance incentive</Typography>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <Box sx={{ borderBottom: '1px dashed #ccc', pb: 1, mb: 1 }}>
                                                <Typography><strong>Before RTO:</strong></Typography>
                                                <Typography>Total: ₹{(calc.baseEarnings + calc.distanceIncentive).toFixed(2)}</Typography>
                                                <Typography>Per Shipment: ₹{calc.earningsPerShipmentPreRto.toFixed(2)}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography><strong>After RTO ({calc.rtoPercentage.toFixed(1)}%):</strong></Typography>
                                                <Typography>Total: ₹{calc.totalEarnings.toFixed(2)}</Typography>
                                                <Typography>Per Shipment: ₹{calc.earningsPerShipmentPostRto.toFixed(2)}</Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>
        </Box>
    );
};

const FlatDistancePayoutView: React.FC<FlatDistancePayoutViewProps> = ({ 
    routeData, 
    locationData, 
    thresholds,
    onThresholdsChange,
    onPayoutCalculated 
}) => {
    const [payoutCalculations, setPayoutCalculations] = React.useState<FlatDistancePayout[]>([]);
    const [payoutSummary, setPayoutSummary] = React.useState<PayoutSummary[]>([]);

    const calculateFlatDistancePayouts = React.useCallback(() => {
        const calculations: FlatDistancePayout[] = [];
        const processedPairs = new Set<string>();

        routeData.forEach(route => {
            route.activities.forEach(activity => {
                if (activity.type !== 'delivery' || !activity.hexagon_index || !activity.distance_from_dc) return;

                const pairKey = `${route.fe_number}-${route.date}-${activity.hexagon_index}`;
                if (processedPairs.has(pairKey)) return;
                processedPairs.add(pairKey);

                // Get shipments and RTO percentage for this hexagon
                const hexagonMapping = locationData.hexagonCustomerMapping
                    .find(mapping => 
                        String(mapping.hexagon_index) === String(activity.hexagon_index) &&
                        mapping.dc_code === route.dc_code &&
                        mapping.fe_number === route.fe_number &&
                        mapping.ofd_date === route.date
                    );

                const totalShipments = hexagonMapping?.delivery_count || 0;
                const rtoPercentage = hexagonMapping?.rto_percentage || 0;

                // Use the pre-calculated distance from DC
                const directDistance = activity.distance_from_dc;
                const excessDistance = Math.max(0, directDistance - thresholds.distanceThreshold);
                const flatIncentive = excessDistance > 0 ? thresholds.flatIncentive : 0;
                const baseEarnings = totalShipments * thresholds.baseShipmentPrice;
                
                // Apply RTO percentage adjustment only to incentives
                const cappedRtoPercentage = Math.min(rtoPercentage, MAX_RTO_PERCENTAGE);
                const adjustedIncentive = flatIncentive / (1 - (cappedRtoPercentage / 100));
                const totalEarningsPreRto = baseEarnings + flatIncentive;
                const totalEarningsPostRto = baseEarnings + adjustedIncentive;
                const earningsPerShipmentPreRto = totalShipments > 0 ? totalEarningsPreRto / totalShipments : 0;
                const earningsPerShipmentPostRto = totalShipments > 0 ? totalEarningsPostRto / totalShipments : 0;

                calculations.push({
                    hexagonId: String(activity.hexagon_index),
                    dcCode: route.dc_code,
                    feNumber: route.fe_number,
                    date: route.date,
                    totalShipments,
                    directDistance,
                    excessDistance,
                    flatIncentive,
                    baseEarnings,
                    totalEarnings: totalEarningsPostRto,
                    earningsPerShipment: earningsPerShipmentPostRto,
                    earningsPerShipmentPreRto,
                    earningsPerShipmentPostRto,
                    rtoPercentage
                });
            });
        });

        // Calculate summary statistics
        const summary = new Map<string, PayoutSummary>();
        
        calculations.forEach(calc => {
            if (!summary.has(calc.dcCode)) {
                summary.set(calc.dcCode, {
                    dcCode: calc.dcCode,
                    totalShipments: 0,
                    totalIncentivesPreRto: 0,
                    totalIncentivesPostRto: 0,
                    totalBaseEarnings: 0,
                    totalEarningsPreRto: 0,
                    totalEarningsPostRto: 0,
                    avgEarningsPerShipmentPreRto: 0,
                    avgEarningsPerShipmentPostRto: 0,
                    pilots: {}
                });
            }

            const dcSummary = summary.get(calc.dcCode)!;
            dcSummary.totalShipments += calc.totalShipments;
            dcSummary.totalIncentivesPreRto += calc.flatIncentive;
            dcSummary.totalIncentivesPostRto += calc.flatIncentive / (1 - (calc.rtoPercentage / 100));
            dcSummary.totalBaseEarnings += calc.baseEarnings;
            dcSummary.totalEarningsPreRto += calc.baseEarnings + calc.flatIncentive;
            dcSummary.totalEarningsPostRto += calc.baseEarnings + (calc.flatIncentive / (1 - (calc.rtoPercentage / 100)));

            if (!dcSummary.pilots[calc.feNumber]) {
                dcSummary.pilots[calc.feNumber] = {
                    shipments: 0,
                    incentivesPreRto: 0,
                    incentivesPostRto: 0,
                    baseEarnings: 0,
                    totalEarningsPreRto: 0,
                    totalEarningsPostRto: 0,
                    earningsPerShipmentPreRto: 0,
                    earningsPerShipmentPostRto: 0
                };
            }

            const pilotSummary = dcSummary.pilots[calc.feNumber];
            pilotSummary.shipments += calc.totalShipments;
            pilotSummary.incentivesPreRto += calc.flatIncentive;
            pilotSummary.incentivesPostRto += calc.flatIncentive / (1 - (calc.rtoPercentage / 100));
            pilotSummary.baseEarnings += calc.baseEarnings;
            pilotSummary.totalEarningsPreRto += calc.baseEarnings + calc.flatIncentive;
            pilotSummary.totalEarningsPostRto += calc.baseEarnings + (calc.flatIncentive / (1 - (calc.rtoPercentage / 100)));
            pilotSummary.earningsPerShipmentPreRto = pilotSummary.shipments > 0 ?
                pilotSummary.totalEarningsPreRto / pilotSummary.shipments : 0;
            pilotSummary.earningsPerShipmentPostRto = pilotSummary.shipments > 0 ?
                pilotSummary.totalEarningsPostRto / pilotSummary.shipments : 0;
        });

        // Calculate averages
        summary.forEach(dc => {
            dc.avgEarningsPerShipmentPreRto = dc.totalShipments > 0 ?
                dc.totalEarningsPreRto / dc.totalShipments : 0;
            dc.avgEarningsPerShipmentPostRto = dc.totalShipments > 0 ?
                dc.totalEarningsPostRto / dc.totalShipments : 0;
        });

        setPayoutSummary(Array.from(summary.values()));
        setPayoutCalculations(calculations);
        onPayoutCalculated?.(Array.from(summary.values()), calculations);
    }, [routeData, locationData, thresholds, onPayoutCalculated]);

    React.useEffect(() => {
        calculateFlatDistancePayouts();
    }, [calculateFlatDistancePayouts]);

    const handleThresholdChange = (field: keyof FlatDistanceThresholdConfig) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            onThresholdsChange({
                ...thresholds,
                [field]: value
            });
        }
    };

    // Add formatter function
    const formatTooltipValue = (value: number) => `₹${value.toFixed(2)}`;

    return (
        <Box p={3}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="h6" gutterBottom>Flat Distance Configuration</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={4}>
                                <TextField
                                    label="Base Price per Shipment (₹)"
                                    type="number"
                                    value={thresholds.baseShipmentPrice}
                                    onChange={handleThresholdChange('baseShipmentPrice')}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <TextField
                                    label="Distance Threshold (m)"
                                    type="number"
                                    value={thresholds.distanceThreshold}
                                    onChange={handleThresholdChange('distanceThreshold')}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <TextField
                                    label="Flat Incentive (₹)"
                                    type="number"
                                    value={thresholds.flatIncentive}
                                    onChange={handleThresholdChange('flatIncentive')}
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="h6" gutterBottom>DC Level Summary</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={payoutSummary}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="dcCode" />
                                <YAxis tickFormatter={(value) => `₹${value.toFixed(2)}`} />
                                <Tooltip formatter={formatTooltipValue} />
                                <Legend />
                                <Bar dataKey="totalBaseEarnings" name="Base Earnings" fill="#8884d8" />
                                <Bar dataKey="totalIncentivesPreRto" name="Incentives (Pre-RTO)" fill="#82ca9d" />
                                <Bar dataKey="totalIncentivesPostRto" name="Incentives (Post-RTO)" fill="#ffc658" />
                                <Bar dataKey="avgEarningsPerShipmentPreRto" name="Avg Earnings/Shipment (Pre-RTO)" fill="#ff8042" />
                                <Bar dataKey="avgEarningsPerShipmentPostRto" name="Avg Earnings/Shipment (Post-RTO)" fill="#00C49F" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Pilot Level Summary</Typography>
                    <Grid container spacing={2}>
                        {payoutSummary.map(dc => 
                            Object.entries(dc.pilots).map(([feNumber, pilot]) => (
                                <Grid item xs={3} key={`${dc.dcCode}-${feNumber}`}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" color="primary">
                                                FE: {feNumber}
                                            </Typography>
                                            <Typography variant="subtitle1" color="textSecondary">
                                                DC: {dc.dcCode}
                                            </Typography>
                                            <Typography>
                                                Shipments: {pilot.shipments}
                                            </Typography>
                                            <Typography>
                                                Base Earnings: ₹{pilot.baseEarnings.toFixed(2)}
                                            </Typography>
                                            <Box sx={{ mt: 2, borderTop: '1px solid #eee', pt: 1 }}>
                                                <Typography variant="subtitle2" color="primary">Pre-RTO</Typography>
                                                <Typography>
                                                    Incentives: ₹{pilot.incentivesPreRto.toFixed(2)}
                                                </Typography>
                                                <Typography>
                                                    Total Earnings: ₹{pilot.totalEarningsPreRto.toFixed(2)}
                                                </Typography>
                                                <Typography>
                                                    Per Shipment: ₹{pilot.earningsPerShipmentPreRto.toFixed(2)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ mt: 2, borderTop: '1px solid #eee', pt: 1 }}>
                                                <Typography variant="subtitle2" color="error">Post-RTO</Typography>
                                                <Typography>
                                                    Incentives: ₹{pilot.incentivesPostRto.toFixed(2)}
                                                </Typography>
                                                <Typography>
                                                    Total Earnings: ₹{pilot.totalEarningsPostRto.toFixed(2)}
                                                </Typography>
                                                <Typography>
                                                    Per Shipment: ₹{pilot.earningsPerShipmentPostRto.toFixed(2)}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))
                        )}
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Basic Info</TableCell>
                                    <TableCell>Distance Info</TableCell>
                                    <TableCell>Shipments & Base Pay</TableCell>
                                    <TableCell>Flat Incentive</TableCell>
                                    <TableCell>Total Earnings</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {payoutCalculations.map((calc, idx) => (
                                    <TableRow key={`${calc.hexagonId}-${idx}`}>
                                        <TableCell>
                                            <Typography><strong>Hex ID:</strong> {calc.hexagonId}</Typography>
                                            <Typography><strong>DC:</strong> {calc.dcCode}</Typography>
                                            <Typography><strong>FE:</strong> {calc.feNumber}</Typography>
                                            <Typography><strong>Date:</strong> {calc.date}</Typography>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <Typography><strong>Direct Distance:</strong> {calc.directDistance.toFixed(2)}m</Typography>
                                            {calc.excessDistance > 0 && (
                                                <Typography color="error">
                                                    <strong>Excess:</strong> {calc.excessDistance.toFixed(2)}m
                                                </Typography>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <Typography><strong>Shipments:</strong> {calc.totalShipments}</Typography>
                                            <Typography><strong>Base Pay:</strong> ₹{calc.baseEarnings.toFixed(2)}</Typography>
                                            <Typography><strong>Per Shipment:</strong> ₹{thresholds.baseShipmentPrice.toFixed(2)}</Typography>
                                        </TableCell>

                                        <TableCell>
                                            {calc.flatIncentive > 0 ? (
                                                <>
                                                    <Typography>
                                                        <strong>Flat Incentive:</strong> ₹{calc.flatIncentive.toFixed(2)}
                                                    </Typography>
                                                    <Typography color="textSecondary">
                                                        (Applied when distance &gt; {thresholds.distanceThreshold}m)
                                                    </Typography>
                                                </>
                                            ) : (
                                                <Typography color="textSecondary">No flat incentive</Typography>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <Box sx={{ borderBottom: '1px dashed #ccc', pb: 1, mb: 1 }}>
                                                <Typography><strong>Before RTO:</strong></Typography>
                                                <Typography>Total: ₹{(calc.baseEarnings + calc.flatIncentive).toFixed(2)}</Typography>
                                                <Typography>Per Shipment: ₹{calc.earningsPerShipmentPreRto.toFixed(2)}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography><strong>After RTO ({calc.rtoPercentage.toFixed(1)}%):</strong></Typography>
                                                <Typography>Total: ₹{calc.totalEarnings.toFixed(2)}</Typography>
                                                <Typography>Per Shipment: ₹{calc.earningsPerShipmentPostRto.toFixed(2)}</Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>
        </Box>
    );
};

interface PayoutComparisonProps {
    clusterPayouts: PayoutSummary[];
    directPayouts: PayoutSummary[];
    flatPayouts: PayoutSummary[];
    routeData: RouteData[];
    payoutCalculations: PayoutCalculation[];
    directPayoutCalculations: DirectDistancePayout[];
    flatPayoutCalculations: FlatDistancePayout[];
}

const PayoutComparison: React.FC<PayoutComparisonProps> = ({ 
    clusterPayouts, 
    directPayouts, 
    flatPayouts, 
    routeData,
    payoutCalculations,
    directPayoutCalculations,
    flatPayoutCalculations 
}) => {
    // Custom tooltip formatter for charts
    const formatTooltipValue = (value: number) => `₹${value.toFixed(2)}`;
    const formatPercentageValue = (value: number) => `${value.toFixed(2)}%`;

    const { dcComparison, feComparison, incentiveMetrics } = React.useMemo(() => {
        const dcData = clusterPayouts.map(clusterDC => {
            const directDC = directPayouts.find(d => d.dcCode === clusterDC.dcCode);
            const flatDC = flatPayouts.find(d => d.dcCode === clusterDC.dcCode);
            return {
                dcCode: clusterDC.dcCode,
                // Pre-RTO values
                clusterIncentivesPreRto: Number(clusterDC.totalIncentivesPreRto.toFixed(2)),
                directIncentivesPreRto: Number(directDC?.totalIncentivesPreRto.toFixed(2) || "0"),
                flatIncentivesPreRto: Number(flatDC?.totalIncentivesPreRto.toFixed(2) || "0"),
                clusterTotalEarningsPreRto: Number(clusterDC.totalEarningsPreRto.toFixed(2)),
                directTotalEarningsPreRto: Number(directDC?.totalEarningsPreRto.toFixed(2) || "0"),
                flatTotalEarningsPreRto: Number(flatDC?.totalEarningsPreRto.toFixed(2) || "0"),
                clusterAvgEarningsPreRto: Number(clusterDC.avgEarningsPerShipmentPreRto.toFixed(2)),
                directAvgEarningsPreRto: Number(directDC?.avgEarningsPerShipmentPreRto.toFixed(2) || "0"),
                flatAvgEarningsPreRto: Number(flatDC?.avgEarningsPerShipmentPreRto.toFixed(2) || "0"),
                // Post-RTO values
                clusterIncentivesPostRto: Number(clusterDC.totalIncentivesPostRto.toFixed(2)),
                directIncentivesPostRto: Number(directDC?.totalIncentivesPostRto.toFixed(2) || "0"),
                flatIncentivesPostRto: Number(flatDC?.totalIncentivesPostRto.toFixed(2) || "0"),
                clusterTotalEarningsPostRto: Number(clusterDC.totalEarningsPostRto.toFixed(2)),
                directTotalEarningsPostRto: Number(directDC?.totalEarningsPostRto.toFixed(2) || "0"),
                flatTotalEarningsPostRto: Number(flatDC?.totalEarningsPostRto.toFixed(2) || "0"),
                clusterAvgEarningsPostRto: Number(clusterDC.avgEarningsPerShipmentPostRto.toFixed(2)),
                directAvgEarningsPostRto: Number(directDC?.avgEarningsPerShipmentPostRto.toFixed(2) || "0"),
                flatAvgEarningsPostRto: Number(flatDC?.avgEarningsPerShipmentPostRto.toFixed(2) || "0")
            };
        });

        const feData = clusterPayouts.flatMap(clusterDC => {
            const directDC = directPayouts.find(d => d.dcCode === clusterDC.dcCode);
            const flatDC = flatPayouts.find(d => d.dcCode === clusterDC.dcCode);
            return Object.entries(clusterDC.pilots).map(([feNumber, clusterPilot]) => {
                const directPilot = directDC?.pilots[feNumber];
                const flatPilot = flatDC?.pilots[feNumber];
                return {
                    feNumber,
                    dcCode: clusterDC.dcCode,
                    // Pre-RTO values
                    clusterIncentivesPreRto: Number(clusterPilot.incentivesPreRto.toFixed(2)),
                    directIncentivesPreRto: Number(directPilot?.incentivesPreRto.toFixed(2) || "0"),
                    flatIncentivesPreRto: Number(flatPilot?.incentivesPreRto.toFixed(2) || "0"),
                    clusterTotalEarningsPreRto: Number(clusterPilot.totalEarningsPreRto.toFixed(2)),
                    directTotalEarningsPreRto: Number(directPilot?.totalEarningsPreRto.toFixed(2) || "0"),
                    flatTotalEarningsPreRto: Number(flatPilot?.totalEarningsPreRto.toFixed(2) || "0"),
                    // Post-RTO values
                    clusterIncentivesPostRto: Number(clusterPilot.incentivesPostRto.toFixed(2)),
                    directIncentivesPostRto: Number(directPilot?.incentivesPostRto.toFixed(2) || "0"),
                    flatIncentivesPostRto: Number(flatPilot?.incentivesPostRto.toFixed(2) || "0"),
                    clusterTotalEarningsPostRto: Number(clusterPilot.totalEarningsPostRto.toFixed(2)),
                    directTotalEarningsPostRto: Number(directPilot?.totalEarningsPostRto.toFixed(2) || "0"),
                    flatTotalEarningsPostRto: Number(flatPilot?.totalEarningsPostRto.toFixed(2) || "0")
                };
            });
        });

        // Calculate metrics for each system
        const clusterMetrics = payoutCalculations.reduce((acc, calc) => {
            acc.totalOrders += calc.totalShipments;
            if (calc.totalIncentive > 0) {
                acc.incentivizedOrders += calc.totalShipments;
                acc.totalIncentivesPreRto += calc.totalIncentive;
                acc.totalIncentivesPostRto += calc.totalIncentive / (1 - (calc.clusterRtoPercentage / 100));
            }
            return acc;
        }, {
            totalOrders: 0,
            incentivizedOrders: 0,
            totalIncentivesPreRto: 0,
            totalIncentivesPostRto: 0
        });

        const directMetrics = directPayoutCalculations.reduce((acc, calc) => {
            acc.totalOrders += calc.totalShipments;
            if (calc.distanceIncentive > 0) {
                acc.incentivizedOrders += calc.totalShipments;
                acc.totalIncentivesPreRto += calc.distanceIncentive;
                acc.totalIncentivesPostRto += calc.distanceIncentive / (1 - (calc.rtoPercentage / 100));
            }
            return acc;
        }, {
            totalOrders: 0,
            incentivizedOrders: 0,
            totalIncentivesPreRto: 0,
            totalIncentivesPostRto: 0
        });

        const flatMetrics = flatPayoutCalculations.reduce((acc, calc) => {
            acc.totalOrders += calc.totalShipments;
            if (calc.totalEarnings > 0) {
                acc.incentivizedOrders += calc.totalShipments;
                acc.totalIncentivesPreRto += calc.totalEarnings;
                acc.totalIncentivesPostRto += calc.totalEarnings / (1 - (calc.rtoPercentage / 100));
            }
            return acc;
        }, {
            totalOrders: 0,
            incentivizedOrders: 0,
            totalIncentivesPreRto: 0,
            totalIncentivesPostRto: 0
        });

        const incentiveMetrics = [{
            name: 'Cluster-based',
            percentageIncentivized: (clusterMetrics.incentivizedOrders / clusterMetrics.totalOrders) * 100,
            avgIncentivePerOrderPreRto: clusterMetrics.incentivizedOrders > 0 ? 
                clusterMetrics.totalIncentivesPreRto / clusterMetrics.incentivizedOrders : 0,
            avgIncentivePerOrderPostRto: clusterMetrics.incentivizedOrders > 0 ? 
                clusterMetrics.totalIncentivesPostRto / clusterMetrics.incentivizedOrders : 0
        }, {
            name: 'Direct Distance',
            percentageIncentivized: (directMetrics.incentivizedOrders / directMetrics.totalOrders) * 100,
            avgIncentivePerOrderPreRto: directMetrics.incentivizedOrders > 0 ? 
                directMetrics.totalIncentivesPreRto / directMetrics.incentivizedOrders : 0,
            avgIncentivePerOrderPostRto: directMetrics.incentivizedOrders > 0 ? 
                directMetrics.totalIncentivesPostRto / directMetrics.incentivizedOrders : 0
        }, {
            name: 'Flat Distance',
            percentageIncentivized: (flatMetrics.incentivizedOrders / flatMetrics.totalOrders) * 100,
            avgIncentivePerOrderPreRto: flatMetrics.incentivizedOrders > 0 ? 
                flatMetrics.totalIncentivesPreRto / flatMetrics.incentivizedOrders : 0,
            avgIncentivePerOrderPostRto: flatMetrics.incentivizedOrders > 0 ? 
                flatMetrics.totalIncentivesPostRto / flatMetrics.incentivizedOrders : 0
        }];

        return { dcComparison: dcData, feComparison: feData, incentiveMetrics };
    }, [clusterPayouts, directPayouts, flatPayouts, payoutCalculations, directPayoutCalculations, flatPayoutCalculations]);

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Incentive Distribution Analysis</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>Incentive Distribution Metrics</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={incentiveMetrics}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis yAxisId="left" orientation="left" tickFormatter={formatPercentageValue} />
                                <YAxis yAxisId="right" orientation="right" tickFormatter={formatTooltipValue} />
                                <Tooltip 
                                    formatter={(value: number, name: string) => {
                                        if (name === 'Percentage Incentivized') return `${value.toFixed(2)}%`;
                                        return `₹${value.toFixed(2)}`;
                                    }}
                                />
                                <Legend />
                                <Bar 
                                    yAxisId="left"
                                    dataKey="percentageIncentivized" 
                                    name="Percentage Incentivized" 
                                    fill="#8884d8" 
                                />
                                <Bar 
                                    yAxisId="right"
                                    dataKey="avgIncentivePerOrderPreRto" 
                                    name="Avg Incentive per Order (Pre-RTO)" 
                                    fill="#82ca9d" 
                                />
                                <Bar 
                                    yAxisId="right"
                                    dataKey="avgIncentivePerOrderPostRto" 
                                    name="Avg Incentive per Order (Post-RTO)" 
                                    fill="#ffc658" 
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>Total Incentives by DC</Typography>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" color="primary" gutterBottom>Pre-RTO</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dcComparison}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="dcCode" />
                                    <YAxis tickFormatter={(value) => `₹${value.toFixed(2)}`} />
                                    <Tooltip formatter={formatTooltipValue} />
                                    <Legend />
                                    <Bar dataKey="clusterIncentivesPreRto" name="Cluster-based Incentives" fill="#8884d8" />
                                    <Bar dataKey="directIncentivesPreRto" name="Direct Distance Incentives" fill="#82ca9d" />
                                    <Bar dataKey="flatIncentivesPreRto" name="Flat Distance Incentives" fill="#ffc658" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                        <Box>
                            <Typography variant="h6" color="error" gutterBottom>Post-RTO</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dcComparison}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="dcCode" />
                                    <YAxis tickFormatter={(value) => `₹${value.toFixed(2)}`} />
                                    <Tooltip formatter={formatTooltipValue} />
                                    <Legend />
                                    <Bar dataKey="clusterIncentivesPostRto" name="Cluster-based Incentives" fill="#8884d8" />
                                    <Bar dataKey="directIncentivesPostRto" name="Direct Distance Incentives" fill="#82ca9d" />
                                    <Bar dataKey="flatIncentivesPostRto" name="Flat Distance Incentives" fill="#ffc658" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>Total Earnings by DC</Typography>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" color="primary" gutterBottom>Pre-RTO</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dcComparison}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="dcCode" />
                                    <YAxis tickFormatter={(value) => `₹${value.toFixed(2)}`} />
                                    <Tooltip formatter={formatTooltipValue} />
                                    <Legend />
                                    <Bar dataKey="clusterTotalEarningsPreRto" name="Cluster-based Total Earnings" fill="#8884d8" />
                                    <Bar dataKey="directTotalEarningsPreRto" name="Direct Distance Total Earnings" fill="#82ca9d" />
                                    <Bar dataKey="flatTotalEarningsPreRto" name="Flat Distance Total Earnings" fill="#ffc658" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                        <Box>
                            <Typography variant="h6" color="error" gutterBottom>Post-RTO</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dcComparison}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="dcCode" />
                                    <YAxis tickFormatter={(value) => `₹${value.toFixed(2)}`} />
                                    <Tooltip formatter={formatTooltipValue} />
                                    <Legend />
                                    <Bar dataKey="clusterTotalEarningsPostRto" name="Cluster-based Total Earnings" fill="#8884d8" />
                                    <Bar dataKey="directTotalEarningsPostRto" name="Direct Distance Total Earnings" fill="#82ca9d" />
                                    <Bar dataKey="flatTotalEarningsPostRto" name="Flat Distance Total Earnings" fill="#ffc658" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>Average Earnings per Shipment by DC</Typography>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" color="primary" gutterBottom>Pre-RTO</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dcComparison}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="dcCode" />
                                    <YAxis tickFormatter={(value) => `₹${value.toFixed(2)}`} />
                                    <Tooltip formatter={formatTooltipValue} />
                                    <Legend />
                                    <Bar dataKey="clusterAvgEarningsPreRto" name="Cluster-based Avg Earnings" fill="#8884d8" />
                                    <Bar dataKey="directAvgEarningsPreRto" name="Direct Distance Avg Earnings" fill="#82ca9d" />
                                    <Bar dataKey="flatAvgEarningsPreRto" name="Flat Distance Avg Earnings" fill="#ffc658" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                        <Box>
                            <Typography variant="h6" color="error" gutterBottom>Post-RTO</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dcComparison}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="dcCode" />
                                    <YAxis tickFormatter={(value) => `₹${value.toFixed(2)}`} />
                                    <Tooltip formatter={formatTooltipValue} />
                                    <Legend />
                                    <Bar dataKey="clusterAvgEarningsPostRto" name="Cluster-based Avg Earnings" fill="#8884d8" />
                                    <Bar dataKey="directAvgEarningsPostRto" name="Direct Distance Avg Earnings" fill="#82ca9d" />
                                    <Bar dataKey="flatAvgEarningsPostRto" name="Flat Distance Avg Earnings" fill="#ffc658" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default PayoutsView; 