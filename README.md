# Route Visualization Application

A React-based application for visualizing and analyzing delivery routes with interactive maps and analytics.

## Features

- Interactive map visualization of delivery routes
- Route analysis with distance metrics
- Filtering by city, distribution center, and field executive
- Cluster-based route visualization
- Distance analysis charts

## Deployment Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Vercel account (for deployment)

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

### Deployment to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy the application:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

### Environment Variables

The application uses the following environment variables:

- `REACT_APP_MAP_CENTER_LAT`: Default map center latitude
- `REACT_APP_MAP_CENTER_LNG`: Default map center longitude
- `REACT_APP_MAP_ZOOM`: Default map zoom level

Set these in your Vercel project settings if needed.

## Build

To create a production build:

```bash
npm run build
```

This will create a `build` directory with optimized production files.

## License

MIT
