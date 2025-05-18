# Smart Home Application

## Overview

This React Native application provides a user interface for monitoring and controlling a smart home system. It includes features for viewing temperature and humidity data, controlling lights, and managing security settings.

## New Feature: Historical Data Charts

The application now includes charts for visualizing historical temperature and humidity data. These charts are displayed in the Temperature Details and Humidity Details screens.

### Implementation Details

- The charts are implemented using the `victory-native` library
- Historical data is fetched from a Python API server that queries InfluxDB Cloud
- The API service is implemented in `src/services/APIService.ts`
- The chart component is implemented in `src/components/HistoryChart.tsx`

## Setup and Running

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm start
```

3. Run on Android or iOS:

```bash
npm run android
# or
npm run ios
```

## API Server Integration

To view historical data charts, you need to run the Python API server located in the `Python` directory. See the README.md file in that directory for instructions on setting up and running the server.

By default, the application expects the API server to be running at:
- `http://localhost:5000` for iOS simulator
- `http://10.0.2.2:5000` for Android emulator

If you're running the app on a physical device, you may need to update the `BASE_URL` in `src/services/APIService.ts` to point to the correct IP address where the API server is running.