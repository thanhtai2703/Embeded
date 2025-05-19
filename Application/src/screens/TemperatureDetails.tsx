import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import mqttService from '../services/MQTTService';
import apiService from '../services/APIService';
import { LineChart } from 'react-native-chart-kit';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface HistoricalData {
  time: string;
  value: number;
}

const TemperatureDetails: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [temperature, setTemperature] = useState<number | null>(null);
  const [garageTemperature, setGarageTemperature] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // MainHome history data
  const [mainHomeHistoryData, setMainHomeHistoryData] = useState<HistoricalData[]>([]);
  const [mainHomeHistoryLoading, setMainHomeHistoryLoading] = useState<boolean>(true);
  const [mainHomeHistoryError, setMainHomeHistoryError] = useState<string | null>(null);
  
  // Garage history data
  const [garageHistoryData, setGarageHistoryData] = useState<HistoricalData[]>([]);
  const [garageHistoryLoading, setGarageHistoryLoading] = useState<boolean>(true);
  const [garageHistoryError, setGarageHistoryError] = useState<string | null>(null);
  
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(24); // Default to 24 hours
  const screenWidth = Dimensions.get('window').width;

  // Fetch historical temperature data for both locations
  const fetchHistoricalData = async (timeRange: number = selectedTimeRange) => {
    // Fetch MainHome data
    setMainHomeHistoryLoading(true);
    setMainHomeHistoryError(null);
    
    // Fetch Garage data
    setGarageHistoryLoading(true);
    setGarageHistoryError(null);
    
    try {
      const mainHomeData = await apiService.getMainHomeTemperatureHistory(timeRange);
      setMainHomeHistoryData(mainHomeData);
    } catch (error) {
      console.error('Error fetching MainHome temperature history:', error);
      setMainHomeHistoryError('Failed to load MainHome temperature history');
    } finally {
      setMainHomeHistoryLoading(false);
    }
    
    try {
      const garageData = await apiService.getGarageTemperatureHistory(timeRange);
      setGarageHistoryData(garageData);
    } catch (error) {
      console.error('Error fetching Garage temperature history:', error);
      setGarageHistoryError('Failed to load Garage temperature history');
    } finally {
      setGarageHistoryLoading(false);
    }
  };

  // Handle time range selection
  const handleTimeRangeChange = (hours: number) => {
    setSelectedTimeRange(hours);
    fetchHistoricalData(hours);
  };

  useEffect(() => {
    // Connect to MQTT if not already connected
    if (!mqttService.isClientConnected()) {
      mqttService.connect()
        .then(() => setLoading(false))
        .catch(error => {
          console.error('Failed to connect to MQTT:', error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    // Subscribe to MQTT messages
    const handleMessage = (message: any) => {
      // Check if the message contains temperature data
      if (message.temperature !== undefined) {
        // Check the location to determine which temperature to update
        const location = message.location || 'MainHome'; // Default to MainHome if location not specified
        
        // Use case-insensitive comparison for more reliable location matching
        const locationLower = location.toLowerCase();
        
        if (locationLower === 'mainhome' || locationLower === 'main home' || locationLower === 'main') {
          setTemperature(message.temperature);
        } else if (locationLower.includes('garage')) {
          setGarageTemperature(message.temperature);
        }
      }
    };

    mqttService.onMessage(handleMessage);
    
    // Fetch historical data
    fetchHistoricalData(selectedTimeRange);

    return () => {
      // No need to unsubscribe as the service is a singleton
      // and will be used across the app
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Temperature Details</Text>
      </View>
      
      {/* Time Range Selector - Common for both charts */}
      <View style={styles.timeRangeSelectorContainer}>
        <Text style={styles.sectionTitle}>Select Time Range</Text>
        <View style={styles.timeRangeSelector}>
          <TouchableOpacity 
            style={[styles.timeButton, selectedTimeRange === 1 && styles.selectedTimeButton]} 
            onPress={() => handleTimeRangeChange(1)}
          >
            <Text style={[styles.timeButtonText, selectedTimeRange === 1 && styles.selectedTimeButtonText]}>1h</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.timeButton, selectedTimeRange === 6 && styles.selectedTimeButton]} 
            onPress={() => handleTimeRangeChange(6)}
          >
            <Text style={[styles.timeButtonText, selectedTimeRange === 6 && styles.selectedTimeButtonText]}>6h</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.timeButton, selectedTimeRange === 24 && styles.selectedTimeButton]} 
            onPress={() => handleTimeRangeChange(24)}
          >
            <Text style={[styles.timeButtonText, selectedTimeRange === 24 && styles.selectedTimeButtonText]}>24h</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.timeButton, selectedTimeRange === 168 && styles.selectedTimeButton]} 
            onPress={() => handleTimeRangeChange(168)}
          >
            <Text style={[styles.timeButtonText, selectedTimeRange === 168 && styles.selectedTimeButtonText]}>7d</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* MainHome Temperature Section */}
          <View style={styles.temperatureCard}>
            <View style={styles.locationHeader}>
              <Ionicons name="home" size={24} color="#333" />
              <Text style={styles.locationTitle}>MainHome</Text>
            </View>
            <View style={styles.temperatureDisplay}>
              <Ionicons name="thermometer" size={48} color="#FF3B30" />
              {loading ? (
                <ActivityIndicator size="large" color="#FF3B30" style={styles.loader} />
              ) : (
                <Text style={styles.temperatureValue}>
                  {temperature !== null ? `${temperature.toFixed(1)} °C` : 'No data'}
                </Text>
              )}
              <Text style={styles.temperatureLabel}>Current Temperature</Text>
            </View>
          </View>
          
          {/* MainHome Temperature History Chart */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>MainHome Temperature History</Text>
            {mainHomeHistoryLoading ? (
              <ActivityIndicator size="large" color="#FF3B30" style={styles.loader} />
            ) : mainHomeHistoryError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={24} color="#FF3B30" />
                <Text style={styles.errorText}>{mainHomeHistoryError}</Text>
              </View>
            ) : mainHomeHistoryData.length === 0 ? (
              <Text style={styles.noDataText}>No historical data available</Text>
            ) : (
              <View style={styles.chartContainer}>
                <LineChart
                  data={{
                    labels: mainHomeHistoryData.map(item => {
                      const date = new Date(item.time);
                      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                    }).filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 6)) === 0), // Show only 6 labels for readability
                    datasets: [
                      {
                        data: mainHomeHistoryData.map(item => item.value),
                        color: () => '#FF3B30',
                        strokeWidth: 2
                      }
                    ]
                  }}
                  width={screenWidth - 40}
                  height={250}
                  chartConfig={{
                    yAxisSuffix: '°C',
                    yAxisMin: 0,
                    yAxisMax: 100,
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 1,
                    color: () => '#FF3B30',
                    labelColor: () => '#666',
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#FF3B30'
                    }
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16
                  }}
                />
              </View>
            )}
          </View>
          
          {/* Garage Temperature Section */}
          <View style={styles.temperatureCard}>
            <View style={styles.locationHeader}>
              <Ionicons name="car" size={24} color="#333" />
              <Text style={styles.locationTitle}>Garage</Text>
            </View>
            <View style={styles.temperatureDisplay}>
              <Ionicons name="thermometer" size={48} color="#FF3B30" />
              {loading ? (
                <ActivityIndicator size="large" color="#FF3B30" style={styles.loader} />
              ) : (
                <Text style={styles.temperatureValue}>
                  {garageTemperature !== null ? `${garageTemperature.toFixed(1)} °C` : 'No data'}
                </Text>
              )}
              <Text style={styles.temperatureLabel}>Current Temperature</Text>
            </View>
          </View>
          
          {/* Garage Temperature History Chart */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Garage Temperature History</Text>
            {garageHistoryLoading ? (
              <ActivityIndicator size="large" color="#FF3B30" style={styles.loader} />
            ) : garageHistoryError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={24} color="#FF3B30" />
                <Text style={styles.errorText}>{garageHistoryError}</Text>
              </View>
            ) : garageHistoryData.length === 0 ? (
              <Text style={styles.noDataText}>No historical data available</Text>
            ) : (
              <View style={styles.chartContainer}>
                <LineChart
                  data={{
                    labels: garageHistoryData.map(item => {
                      const date = new Date(item.time);
                      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                    }).filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 6)) === 0), // Show only 6 labels for readability
                    datasets: [
                      {
                        data: garageHistoryData.map(item => item.value),
                        color: () => '#FF3B30',
                        strokeWidth: 2
                      }
                    ]
                  }}
                  width={screenWidth - 40}
                  height={250}
                  chartConfig={{
                    yAxisSuffix: '°C',
                    yAxisMin: 0,
                    yAxisMax: 100,
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 1,
                    color: () => '#FF3B30',
                    labelColor: () => '#666',
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#FF3B30'
                    }
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16
                  }}
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  timeRangeSelectorContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  temperatureCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  temperatureDisplay: {
    alignItems: 'center',
    width: '100%',
  },
  temperatureValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 10,
  },
  temperatureLabel: {
    fontSize: 16,
    color: '#666',
  },
  loader: {
    marginVertical: 20,
  },
  infoSection: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 5,
  },
  timeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
  },
  selectedTimeButton: {
    backgroundColor: '#FF3B30',
  },
  timeButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  selectedTimeButtonText: {
    color: '#fff',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF3B30',
    marginLeft: 10,
    fontSize: 16,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    padding: 20,
  },
});

export default TemperatureDetails;