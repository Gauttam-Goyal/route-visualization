import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Drawer } from '@mui/material';
import Dashboard from './components/Layout/Dashboard';
import Header from './components/Layout/Header';
import { RouteData, LocationData, Filters } from './types';
import { loadCityData } from './services/cityDataService';
import { CityName } from './utils/constants';

function extractLocationsFromRoutes(routes: RouteData[]): LocationData {
  const dcLocations: LocationData['dcLocations'] = [];
  const hexagonCentroids: LocationData['hexagonCentroids'] = [];
  const hexagonCustomerMapping: LocationData['hexagonCustomerMapping'] = [];

  routes.forEach(route => {
    if (route.activities && Array.isArray(route.activities)) {
      const depot = route.activities.find(a => a.type === 'depot');
      if (depot && !dcLocations.some(dc => dc.dc_code === route.dc_code)) {
        dcLocations.push({
          dc_code: route.dc_code,
          city: route.city,
          lat: depot.lat,
          lng: depot.lng
        });
      }
      route.activities.forEach(a => {
        if (a.type === 'delivery' && a.hexagon_index && !hexagonCentroids.some(h => h.hexagon_id === String(a.hexagon_index))) {
          hexagonCentroids.push({
            hexagon_id: String(a.hexagon_index),
            cluster_id: a.cluster_id,
            lat: a.lat,
            lng: a.lng
          });
        }
      });
    }
  });
  return { dcLocations, hexagonCentroids, hexagonCustomerMapping };
}

function App() {
  const [routeData, setRouteData] = useState<RouteData[]>([]);
  const [locationData, setLocationData] = useState<LocationData>({
    dcLocations: [],
    hexagonCentroids: [],
    hexagonCustomerMapping: []
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    city: [],
    dcCode: [],
    feNumber: [],
    date: [],
    dateRange: [null, null] as (Date | null)[]
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load city data when city filter changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (filters.city.length > 0) {
          const cityName = filters.city[0].toUpperCase() as CityName;
          const cityData = await loadCityData(cityName);
          setRouteData(cityData);
          
          // Extract locations but preserve existing hexagonCustomerMapping
          const extractedLocations = extractLocationsFromRoutes(cityData);
          setLocationData(prevData => ({
            ...extractedLocations,
            hexagonCustomerMapping: prevData.hexagonCustomerMapping
          }));
        } else {
          setRouteData([]);
          setLocationData({
            dcLocations: [],
            hexagonCentroids: [],
            hexagonCustomerMapping: []
          });
        }
      } catch (error) {
        console.error('Error loading city data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters.city]);

  // Load hexagon customer mapping data
  useEffect(() => {
    const loadHexagonMapping = async () => {
      if (filters.city.length === 0) return;
      
      try {
        // Use the correct file based on the selected city
        const cityName = filters.city[0].toLowerCase();
        const response = await fetch(process.env.PUBLIC_URL + `/data/hexagon_customer_mapping_${cityName}.csv`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        
        const lines = text.trim().split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
          throw new Error('CSV file is empty or invalid');
        }

        const [header, ...rows] = lines;

        const mappingData = rows.map(row => {
          const [city, dc_code, fe_number, ofd_date, hexagon_index, hexagon_lat, hexagon_lng, delivery_count, rto_percentage, delivery_details] = row.split(',').map(val => val.trim());
          return {
            city,
            dc_code,
            fe_number,
            ofd_date,
            hexagon_index,
            hexagon_lat: parseFloat(hexagon_lat),
            hexagon_lng: parseFloat(hexagon_lng),
            delivery_count: parseInt(delivery_count),
            rto_percentage: parseFloat(rto_percentage)
          };
        });

        setLocationData(prevData => ({
          ...prevData,
          hexagonCustomerMapping: mappingData
        }));
      } catch (error) {
        console.error('Error loading hexagon customer mapping:', error);
        // Initialize with empty array on error
        setLocationData(prevData => ({
          ...prevData,
          hexagonCustomerMapping: []
        }));
      }
    };

    loadHexagonMapping();
  }, [filters.city]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Drawer
        anchor="left"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      >
        <Box sx={{ width: 250, p: 2 }}>
          <Typography variant="h6">Menu</Typography>
          {/* Add menu items here */}
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Dashboard
          routeData={routeData}
          locationData={locationData}
          loading={loading}
          filters={filters}
          setFilters={setFilters}
        />
      </Box>
    </Box>
  );
}

export default App;