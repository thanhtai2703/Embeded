import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import mqttService from '../services/MQTTService';

interface EnvironmentCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  iconColor: string;
}

const EnvironmentCard: React.FC<EnvironmentCardProps> = 
  ({ title, icon, value, iconColor }) => (
    <View style={styles.environmentCard}>
      <Ionicons name={icon} size={32} color={iconColor} />
      <Text style={styles.environmentValue}>{value}</Text>
      <Text style={styles.environmentTitle}>{title}</Text>
    </View>
  );

interface DeviceRowProps {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  isEnabled?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
}

const DeviceRow: React.FC<DeviceRowProps> = ({ name, icon, isEnabled, onToggle, onPress }) => (
  <TouchableOpacity 
    style={styles.deviceRow} 
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.deviceInfo}>
      <Ionicons name={icon} size={24} color="#333" />
      <Text style={styles.deviceName}>{name}</Text>
    </View>
    {onToggle && (
      <Switch
        value={isEnabled}
        onValueChange={onToggle}
        trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
        thumbColor="#fff"
      />
    )}
  </TouchableOpacity>
);

const BottomNav: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('home');

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => setActiveTab('home')}
      >
        <Ionicons 
          name="home" 
          size={24} 
          color={activeTab === 'home' ? '#007AFF' : '#666'} 
        />
        <Text style={[
          styles.navText,
          activeTab === 'home' && styles.activeNavText
        ]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => setActiveTab('notifications')}
      >
        <Ionicons 
          name="notifications" 
          size={24} 
          color={activeTab === 'notifications' ? '#007AFF' : '#666'} 
        />
        <Text style={[
          styles.navText,
          activeTab === 'notifications' && styles.activeNavText
        ]}>Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => setActiveTab('profile')}
      >
        <Ionicons 
          name="person" 
          size={24} 
          color={activeTab === 'profile' ? '#007AFF' : '#666'} 
        />
        <Text style={[
          styles.navText,
          activeTab === 'profile' && styles.activeNavText
        ]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const HomeMenu: React.FC = () => {
  const [devices, setDevices] = useState({
    fan: false,
    garage: false,
    mainDoor: false,
  });

  const [security, setSecurity] = useState({
    alarm: false,
  });
  
  // State for sensor data
  const [sensorData, setSensorData] = useState({
    temperature: '-- °C',
    humidity: '-- %',
    isConnected: false,
    isLoading: true
  });

  const toggleDevice = (device: keyof typeof devices) => {
    setDevices((prev: typeof devices) => ({
      ...prev,
      [device]: !prev[device],
    }));
  };

  const toggleSecurity = (item: keyof typeof security) => {
    setSecurity((prev: typeof security) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const handleLightPress = () => {
    // Navigation logic will be added here
    console.log('Navigate to Light screen');
  };

  // Connect to MQTT and handle sensor data
  useEffect(() => {
    const connectToMQTT = async () => {
      try {
        setSensorData(prev => ({ ...prev, isLoading: true }));
        const connected = await mqttService.connect();
        setSensorData(prev => ({ ...prev, isConnected: connected }));
        
        // Handle incoming MQTT messages
        mqttService.onMessage((message) => {
          console.log('Received MQTT message:', message);
          
          if (message.temperature !== undefined && message.humidity !== undefined) {
            setSensorData(prev => ({
              ...prev,
              temperature: `${message.temperature.toFixed(1)} °C`,
              humidity: `${message.humidity.toFixed(1)} %`,
              isLoading: false
            }));
          }
        });
      } catch (error) {
        console.error('Failed to connect to MQTT:', error);
        setSensorData(prev => ({ ...prev, isConnected: false, isLoading: false }));
      }
    };

    connectToMQTT();

    // Cleanup function
    return () => {
      mqttService.disconnect();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HOME</Text>
      </View>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <View style={styles.content}>
          <View style={styles.environmentSection}>
            <Text style={styles.sectionTitle}>ENVIRONMENT</Text>
            <View style={styles.environmentCards}>
              {sensorData.isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Connecting to sensors...</Text>
                </View>
              ) : (
                <>
                  <EnvironmentCard
                    title="Temperature"
                    icon="thermometer"
                    value={sensorData.temperature}
                    iconColor="#FF3B30"
                  />
                  <EnvironmentCard
                    title="Humidity"
                    icon="water"
                    value={sensorData.humidity}
                    iconColor="#007AFF"
                  />
                </>
              )}
            </View>
          </View>
          <View style={styles.devicesSection}>
            <Text style={styles.sectionTitle}>DEVICES</Text>
            <View style={styles.devicesList}>
              <DeviceRow
                name="Light"
                icon="bulb"
                onPress={handleLightPress}
              />
              <DeviceRow
                name="Fan"
                icon="refresh"
                isEnabled={devices.fan}
                onToggle={() => toggleDevice('fan')}
              />
              <DeviceRow
                name="Garage"
                icon="car"
                isEnabled={devices.garage}
                onToggle={() => toggleDevice('garage')}
              />
              <DeviceRow
                name="Main door"
                icon="home"
                isEnabled={devices.mainDoor}
                onToggle={() => toggleDevice('mainDoor')}
              />
            </View>
          </View>
          <View style={styles.securitySection}>
            <Text style={styles.sectionTitle}>SECURITY</Text>
            <View style={styles.devicesList}>
              <DeviceRow
                name="Alarm System"
                icon="shield"
                isEnabled={security.alarm}
                onToggle={() => toggleSecurity('alarm')}
              />
            </View>
          </View>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
  },
  headerTitle: {
    flex: 1,
    marginTop: 20,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  environmentSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  environmentCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  environmentCard: {
    flex: 1,
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
  environmentValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  environmentTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  devicesSection: {
    padding: 20,
  },
  devicesList: {
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  securitySection: {
    padding: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navItem: {
    alignItems: 'center',
    padding: 8,
  },
  navText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeNavText: {
    color: '#007AFF',
  },
});

export default HomeMenu;