import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Drawer } from '@mui/material';
import Dashboard from './components/Layout/Dashboard';
import Header from './components/Layout/Header';
import { RouteData, LocationData, Filters } from './types';
import { RAW_DATA } from './data/rawData';

function parseCSVData(raw: string): RouteData[] {
  const lines = raw.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const match = line.match(/(?:"[^"]*"|[^,])+/g);
    if (!match) return undefined;
    const obj: any = {};
    headers.forEach((header, i) => {
      let value: any = match[i];
      if (header === 'activities') {
        try {
          // Remove the outer quotes and parse the JSON string
          const jsonStr = value.replace(/^"|"$/g, '');
          const parsed = JSON.parse(jsonStr);
          value = parsed[0].activities;
        } catch (error) {
          console.error('Error parsing activities:', error);
          value = [];
        }
        obj[header] = value;
      } else {
        obj[header] = value ?? '';
      }
    });
    return obj as RouteData;
  }).filter((x): x is RouteData => !!x);
}

function extractLocationsFromRoutes(routes: RouteData[]): LocationData {
  const dcLocations: LocationData['dcLocations'] = [];
  const hexagonCentroids: LocationData['hexagonCentroids'] = [];
  routes.forEach(route => {
    if (route.activities && Array.isArray(route.activities)) {
      // Add depot as DC
      const depot = route.activities.find(a => a.type === 'depot');
      if (depot && !dcLocations.some(dc => dc.dc_code === route.dc_code)) {
        dcLocations.push({
          dc_code: route.dc_code,
          city: route.city,
          lat: depot.lat,
          lng: depot.lng
        });
      }
      // Add all unique hexagons
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
  return { dcLocations, hexagonCentroids };
}

function App() {
  const [routeData, setRouteData] = useState<RouteData[]>([]);
  const [locationData, setLocationData] = useState<LocationData>({
    dcLocations: [],
    hexagonCentroids: []
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    city: [],
    dcCode: [],
    feNumber: [],
    dateRange: [null, null] as (Date | null)[]
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const parsedRoutes = parseCSVData(RAW_DATA);
    setRouteData(parsedRoutes);
    setLocationData(extractLocationsFromRoutes(parsedRoutes));
    setLoading(false);
  }, []);

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