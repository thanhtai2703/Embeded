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

const HumidityDetails: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [humidity, setHumidity] = useState<number | null>(null);
  const [garageHumidity, setGarageHumidity] = useState<number | null>(null);
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

  // Fetch historical humidity data for both locations
  const fetchHistoricalData = async (timeRange: number = selectedTimeRange) => {
    // Fetch MainHome data
    setMainHomeHistoryLoading(true);
    setMainHomeHistoryError(null);
    
    // Fetch Garage data
    setGarageHistoryLoading(true);
    setGarageHistoryError(null);
    
    try {
      const mainHomeData = await apiService.getMainHomeHumidityHistory(timeRange);
      setMainHomeHistoryData(mainHomeData);
    } catch (error) {
      console.error('Error fetching MainHome humidity history:', error);
      setMainHomeHistoryError('Failed to load MainHome humidity history');
    } finally {
      setMainHomeHistoryLoading(false);
    }
    
    try {
      const garageData = await apiService.getGarageHumidityHistory(timeRange);
      setGarageHistoryData(garageData);
    } catch (error) {
      console.error('Error fetching Garage humidity history:', error);
      setGarageHistoryError('Failed to load Garage humidity history');
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
      // Check if the message contains humidity data
      if (message.humidity !== undefined) {
        // Check the location to determine which humidity to update
        const location = message.location || 'MainHome'; // Default to MainHome if location not specified
        
        if (location === 'MainHome') {
          setHumidity(message.humidity);
        } else if (location === 'garage' || location === 'Garage') {
          setGarageHumidity(message.humidity);
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
        <Text style={styles.headerTitle}>Humidity Details</Text>
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
          {/* MainHome Humidity Section */}
          <View style={styles.humidityCard}>
            <View style={styles.locationHeader}>
              <Ionicons name="home" size={24} color="#333" />
              <Text style={styles.locationTitle}>MainHome</Text>
            </View>
            <View style={styles.humidityDisplay}>
              <Ionicons name="water" size={48} color="#007AFF" />
              {loading ? (
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
              ) : (
                <Text style={styles.humidityValue}>
                  {humidity !== null ? `${humidity.toFixed(1)} %` : 'No data'}
                </Text>
              )}
              <Text style={styles.humidityLabel}>Current Humidity</Text>
            </View>
          </View>
          
          {/* MainHome Humidity History Chart */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>MainHome Humidity History</Text>
            {mainHomeHistoryLoading ? (
              <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            ) : mainHomeHistoryError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={24} color="#007AFF" />
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
                        color: () => '#007AFF',
                        strokeWidth: 2
                      }
                    ]
                  }}
                  width={screenWidth - 40}
                  height={220}
                  chartConfig={{
                    yAxisSuffix: '%',
                    yAxisMin: 0,
                    yAxisMax: 100,
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 1,
                    color: () => '#007AFF',
                    labelColor: () => '#666',
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#007AFF'
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
          
          {/* Garage Humidity Section */}
          <View style={[styles.humidityCard, styles.secondCard]}>
            <View style={styles.locationHeader}>
              <Ionicons name="car" size={24} color="#333" />
              <Text style={styles.locationTitle}>Garage</Text>
            </View>
            <View style={styles.humidityDisplay}>
              <Ionicons name="water" size={48} color="#5AC8FA" />
              {loading ? (
                <ActivityIndicator size="large" color="#5AC8FA" style={styles.loader} />
              ) : (
                <Text style={styles.humidityValue}>
                  {garageHumidity !== null ? `${garageHumidity.toFixed(1)} %` : 'No data'}
                </Text>
              )}
              <Text style={styles.humidityLabel}>Current Humidity</Text>
            </View>
          </View>
          
          {/* Garage Humidity History Chart */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Garage Humidity History</Text>
            {garageHistoryLoading ? (
              <ActivityIndicator size="large" color="#5AC8FA" style={styles.loader} />
            ) : garageHistoryError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={24} color="#5AC8FA" />
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
                        color: () => '#5AC8FA',
                        strokeWidth: 2
                      }
                    ]
                  }}
                  width={screenWidth - 40}
                  height={220}
                  chartConfig={{
                    yAxisSuffix: '%',
                    yAxisMin: 0,
                    yAxisMax: 100,
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 1,
                    color: () => '#5AC8FA',
                    labelColor: () => '#666',
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#5AC8FA'
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
  content: {
    padding: 20,
  },
  humidityCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
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
  humidityValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  humidityLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  infoSection: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  timeRangeSelector: {
    flexDirection: 'row',
  },
  timeButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 5,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
  },
  selectedTimeButton: {
    backgroundColor: '#007AFF',
  },
  timeButtonText: {
    fontSize: 12,
    color: '#666',
  },
  selectedTimeButtonText: {
    color: '#fff',
  },
  loader: {
    marginTop: 10,
    marginBottom: 10,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  errorText: {
    color: '#007AFF',
    marginLeft: 10,
    fontSize: 14,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 16,
  },
  // Add missing styles
  timeRangeSelectorContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scrollView: {
    flex: 1,
  },
  // Additional styles from the component
  secondCard: {
    marginTop: 20,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  humidityDisplay: {
    alignItems: 'center',
  },
});

export default HumidityDetails;