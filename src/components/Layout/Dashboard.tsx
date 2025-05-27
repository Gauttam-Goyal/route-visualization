import React from 'react';
import { Box, Paper, Typography, CircularProgress, Tabs, Tab, ButtonGroup, Button } from '@mui/material';
import FilterPanel from '../Filters/FilterPanel';
import HexagonMap from '../Map/HexagonMap';
import DistanceMetrics from '../Analytics/DistanceMetrics';
import DistanceChart from '../Analytics/DistanceChart';
import PayoutsView from '../Analytics/PayoutsView';
import { RouteData, LocationData, Filters, PayoutSummary, PayoutCalculation, DirectDistancePayout, FlatDistancePayout } from '../../types';
import { calculateAverages } from '../../utils/calculations';
import { MAX_ROUTE_DISTANCE, getCityBoundary, AVAILABLE_CITIES } from '../../utils/constants';

interface DashboardProps {
    routeData: RouteData[];
    locationData: LocationData;
    loading: boolean;
    filters: Filters;
    setFilters: (filters: Filters) => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box>
                    {children}
                </Box>
            )}
        </div>
    );
}

const Dashboard: React.FC<DashboardProps> = ({
    routeData,
    locationData,
    loading,
    filters,
    setFilters
}) => {
    const [activeTab, setActiveTab] = React.useState(0);
    const [payoutCalculations, setPayoutCalculations] = React.useState<PayoutCalculation[]>([]);
    const [directPayoutCalculations, setDirectPayoutCalculations] = React.useState<DirectDistancePayout[]>([]);
    const [flatPayoutCalculations, setFlatPayoutCalculations] = React.useState<FlatDistancePayout[]>([]);
    const [viewMode, setViewMode] = React.useState<'route' | 'direct' | 'flat'>('route');

    // Extract unique values for filters
    const filterOptions = React.useMemo(() => {
        // Get all cities
        const cities = AVAILABLE_CITIES.map(city => city.toLowerCase());

        // Get DC codes for the selected city
        const filteredRoutes = filters.city.length > 0
            ? routeData.filter(route => route.city === filters.city[0])
            : [];

        const dcCodes = [...new Set(filteredRoutes.map(route => route.dc_code))].sort();

        // Get FE numbers based on selected DCs
        const feFilteredRoutes = filters.dcCode.includes('ALL')
            ? filteredRoutes // If "ALL" is selected, use all routes for the city
            : filters.dcCode.length > 0
                ? filteredRoutes.filter(route => filters.dcCode.includes(route.dc_code))
                : filteredRoutes;

        const feNumbers = [...new Set(feFilteredRoutes.map(route => route.fe_number))].sort();

        // Get dates based on selected city, DC, and FE
        const dateFilteredRoutes = filters.feNumber.length > 0
            ? feFilteredRoutes.filter(route => filters.feNumber.includes(route.fe_number))
            : feFilteredRoutes;

        const dates = [...new Set(dateFilteredRoutes.map(route => route.date))].sort();

        return { cities, dcCodes, feNumbers, dates };
    }, [routeData, filters.city, filters.dcCode, filters.feNumber]);

    const filteredData = React.useMemo(() => {
        // If no city is selected, return empty array
        if (filters.city.length === 0) {
            return [];
        }

        // Only show routes when at least one DC is selected
        if (filters.dcCode.length === 0) {
            return [];
        }

        return routeData.filter(route => {
            // Check if route distance is within limit
            const routeDistance = parseFloat(route.total_distance);
            if (routeDistance > MAX_ROUTE_DISTANCE) {
                return false;
            }

            // Check if all hexagon coordinates are within city boundaries
            const cityBoundary = getCityBoundary(route.city);
            if (!cityBoundary) {
                console.warn(`No boundary found for city: ${route.city}`);
                return true; // Allow routes even if boundary not found
            }

            // More lenient boundary check - only check if any activity is within bounds
            const anyActivityInBounds = route.activities.some(activity => {
                return activity.lat >= cityBoundary.south &&
                    activity.lat <= cityBoundary.north &&
                    activity.lng >= cityBoundary.west &&
                    activity.lng <= cityBoundary.east;
            });

            if (!anyActivityInBounds) {
                return false;
            }

            // Apply user filters with case-insensitive city comparison
            const isDcSelected = filters.dcCode.includes('ALL') || filters.dcCode.includes(route.dc_code);
            
            return (
                route.city.toLowerCase() === filters.city[0].toLowerCase() && // Case-insensitive city match
                isDcSelected && // Must match selected DC or "ALL"
                (filters.feNumber.length === 0 || filters.feNumber.includes(route.fe_number)) &&
                (filters.date.length === 0 || filters.date.includes(route.date))
            );
        });
    }, [routeData, filters]);

    const metrics = React.useMemo(() => {
        return calculateAverages(filteredData);
    }, [filteredData]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box display="flex" height="100vh">
            <Box width="300px" p={2} borderRight={1} borderColor="divider">
                            <FilterPanel
                                filters={filters}
                                setFilters={setFilters}
                    availableRoutes={routeData}
                    cities={AVAILABLE_CITIES}
                            />
                </Box>

                <Box flex="1">
                <Paper sx={{ mb: 2 }}>
                    <Tabs value={activeTab} onChange={handleTabChange} aria-label="dashboard tabs">
                        <Tab label="Route Analysis" />
                        <Tab label="Payouts" />
                    </Tabs>
                </Paper>

                <TabPanel value={activeTab} index={0}>
                    <Box display="flex" flexDirection="column" gap={3}>
                        <Paper>
                            <Box p={2}>
                                <Typography variant="h6" gutterBottom>Average Distance Metrics</Typography>
                                <DistanceMetrics metrics={metrics} />
                            </Box>
                        </Paper>

                        <Paper>
                            <Box p={2} height="60vh">
                                <Typography variant="h6" gutterBottom>Route Map</Typography>
                                {(() => {
                                    console.log('Dashboard - Current viewMode:', viewMode);
                                    console.log('Dashboard - payoutCalculations:', payoutCalculations);
                                    console.log('Dashboard - directPayoutCalculations:', directPayoutCalculations);
                                    console.log('Dashboard - flatPayoutCalculations:', flatPayoutCalculations);
                                    const currentPayouts = viewMode === 'route' ? payoutCalculations :
                                        viewMode === 'direct' ? directPayoutCalculations :
                                        flatPayoutCalculations;
                                    console.log('Dashboard - Passing payouts to HexagonMap:', currentPayouts);
                                    return (
                                        <HexagonMap
                                            locationData={locationData}
                                            filteredRoutes={filteredData}
                                            payoutCalculations={currentPayouts}
                                            viewMode={viewMode}
                                            onViewModeChange={setViewMode}
                                        />
                                    );
                                })()}
                            </Box>
                        </Paper>

                        <Paper>
                            <Box p={2}>
                                <Typography variant="h6" gutterBottom>Distance Analysis</Typography>
                                <DistanceChart data={filteredData} locationData={locationData} />
                            </Box>
                        </Paper>
                    </Box>
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                    <PayoutsView
                        routeData={filteredData}
                        locationData={locationData}
                        onPayoutCalculated={(payouts: PayoutSummary[], calculations?: PayoutCalculation[] | DirectDistancePayout[] | FlatDistancePayout[]) => {
                            if (calculations) {
                                if (Array.isArray(calculations) && calculations.length > 0) {
                                    if ('clusterId' in calculations[0]) {
                                        setPayoutCalculations(calculations as PayoutCalculation[]);
                                    } else if ('directDistance' in calculations[0]) {
                                        setDirectPayoutCalculations(calculations as DirectDistancePayout[]);
                                    } else {
                                        setFlatPayoutCalculations(calculations as FlatDistancePayout[]);
                                    }
                                }
                            }
                        }}
                    />
                </TabPanel>
            </Box>
        </Box>
    );
};

export default Dashboard;