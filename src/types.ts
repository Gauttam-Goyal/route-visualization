export interface RouteData {
    id?: string;
    dc_code: string;
    fe_number: string;
    city: string;
    total_distance: string;
    date: string;
    activities: any[];
}

export interface HexagonCustomerMapping {
    city: string;
    dc_code: string;
    fe_number: string;
    ofd_date: string;
    hexagon_index: string;
    hexagon_lat: number;
    hexagon_lng: number;
    delivery_count: number;
    rto_percentage: number;
}

export interface LocationData {
    dcLocations: {
        dc_code: string;
        city: string;
        lat: number;
        lng: number;
    }[];
    hexagonCentroids: {
        hexagon_id: string;
        cluster_id?: number;
        lat: number;
        lng: number;
    }[];
    hexagonCustomerMapping: HexagonCustomerMapping[];
}

export interface Filters {
    city: string[];
    dcCode: string[];
    feNumber: string[];
    date: string[];
    dateRange: (Date | null)[];
}

export interface DistanceMetrics {
    avgDistance: number;
    totalRoutes: number;
    totalDistance: number;
    cityAverage?: number;
    dcAverage?: number;
    feAverage?: number;
    dcToHexAverage?: number;
    hexToHexAverage?: number;
}

export interface Activity {
    sequence: number;
    type: 'depot' | 'delivery';
    lat: number;
    lng: number;
    cluster_id?: number;
    hexagon_index?: number;
    distance_from_prev?: number;
    distance_from_dc?: number;
}

export interface PayoutSummary {
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

export interface PayoutCalculation {
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
    connectedHexId: string | null;
    isFirstHexInCluster: boolean;
    incomingHexId: string | null;
}

export interface DirectDistancePayout {
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

export interface FlatDistancePayout {
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