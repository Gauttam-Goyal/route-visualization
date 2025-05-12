// Core data types
export interface RouteData {
    city: string;
    dc_code: string;
    fe_number: string;
    ofd_date: string;
    route: string;
    total_distance: string;
    activities?: Activity[];
}

export interface Activity {
    sequence: number;
    type: 'depot' | 'delivery';
    distance_from_prev?: number;
}

export interface DcLocation {
    city: string;
    dc_code: string;
    lat: number;
    lng: number;
}

export interface HexagonCentroid {
    hexagon_id: string;
    cluster_id: number;
    lat: number;
    lng: number;
}

export interface LocationData {
    dcLocations: DcLocation[];
    hexagonCentroids: HexagonCentroid[];
}

// Application state types
export interface Filters {
    city: string;
    dcCode: string;
    feNumber: string;
    dateRange: (Date | null)[];
}

export interface Metrics {
    cityAverage: number | null;
    dcAverage: number | null;
    feAverage: number | null;
}