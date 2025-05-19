import { Platform } from 'react-native';

// Use localhost for iOS simulator, 10.0.2.2 for Android emulator
// For physical devices, use the actual IP address of your computer
const BASE_URL = Platform.OS === 'ios' ? 'http://localhost:5000' : 'http://10.0.2.2:5000';

interface HistoricalData {
  time: string;
  value: number;
}

interface HistoricalDataResponse {
  data: HistoricalData[];
  error?: string;
}

type Location = 'MainHome' | 'Garage';

class APIService {
  /**
   * Fetch historical temperature data from the server
   * @param timeRange Time range in hours (default: 24)
   * @param location Data location (default: MainHome)
   * @returns Promise with historical temperature data
   */
  async getTemperatureHistory(timeRange: number = 24, location: Location = 'MainHome'): Promise<HistoricalData[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/temperature/history?hours=${timeRange}&location=${location}`);
      const data: HistoricalDataResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch temperature history');
      }
      
      return data.data;
    } catch (error) {
      console.error(`Error fetching ${location} temperature history:`, error);
      throw error;
    }
  }

  /**
   * Fetch historical humidity data from the server
   * @param timeRange Time range in hours (default: 24)
   * @param location Data location (default: MainHome)
   * @returns Promise with historical humidity data
   */
  async getHumidityHistory(timeRange: number = 24, location: Location = 'MainHome'): Promise<HistoricalData[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/humidity/history?hours=${timeRange}&location=${location}`);
      const data: HistoricalDataResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch humidity history');
      }
      
      return data.data;
    } catch (error) {
      console.error(`Error fetching ${location} humidity history:`, error);
      throw error;
    }
  }
  
  /**
   * Fetch historical temperature data from the Garage
   * @param timeRange Time range in hours (default: 24)
   * @returns Promise with historical temperature data
   */
  async getGarageTemperatureHistory(timeRange: number = 24): Promise<HistoricalData[]> {
    return this.getTemperatureHistory(timeRange, 'Garage');
  }

  /**
   * Fetch historical humidity data from the Garage
   * @param timeRange Time range in hours (default: 24)
   * @returns Promise with historical humidity data
   */
  async getGarageHumidityHistory(timeRange: number = 24): Promise<HistoricalData[]> {
    return this.getHumidityHistory(timeRange, 'Garage');
  }

  /**
   * Fetch historical temperature data from the MainHome
   * @param timeRange Time range in hours (default: 24)
   * @returns Promise with historical temperature data
   */
  async getMainHomeTemperatureHistory(timeRange: number = 24): Promise<HistoricalData[]> {
    return this.getTemperatureHistory(timeRange, 'MainHome');
  }

  /**
   * Fetch historical humidity data from the MainHome
   * @param timeRange Time range in hours (default: 24)
   * @returns Promise with historical humidity data
   */
  async getMainHomeHumidityHistory(timeRange: number = 24): Promise<HistoricalData[]> {
    return this.getHumidityHistory(timeRange, 'MainHome');
  }
}

// Create a singleton instance
const apiService = new APIService();

export default apiService;