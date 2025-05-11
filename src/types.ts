export interface RouteData {
    id?: string;
    dc_code: string;
    fe_number: string;
    city: string;
    total_distance: string;
    date: string;
    activities: any[];
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
}

export interface Filters {
    city: string[];
    dcCode: string[];
    feNumber: string[];
    dateRange: (Date | null)[];
}

export interface DistanceMetrics {
    avgDistance: number;
    totalRoutes: number;
    totalDistance: number;
    cityAverage?: number;
    dcAverage?: number;
    feAverage?: number;
} 