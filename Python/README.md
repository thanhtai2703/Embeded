# Smart Home API Server

This API server provides endpoints to retrieve historical temperature and humidity data from InfluxDB Cloud for the smart home application.

## Setup

1. Install the required dependencies:

```bash
pip install -r requirements.txt
```

2. Configure your environment variables by copying the `.env.example` file to `.env` and updating the values:

```bash
cp .env.example .env
```

Make sure to update the InfluxDB configuration with your credentials.

## Running the Server

Start the API server with:

```bash
python api_server.py
```

The server will run on port 5000 by default.

## API Endpoints

### Temperature History

```
GET /api/temperature/history?hours=24
```

Returns historical temperature data for the specified number of hours (default: 24).

### Humidity History

```
GET /api/humidity/history?hours=24
```

Returns historical humidity data for the specified number of hours (default: 24).

### Health Check

```
GET /health
```

Returns the server status and current timestamp.

## Integration with React Native App

The React Native application uses the `APIService.ts` to communicate with this server. Make sure the server is running before trying to view the temperature and humidity charts in the app.

If you're running the app on a physical device, you may need to update the `BASE_URL` in `APIService.ts` to point to the correct IP address where this server is running.