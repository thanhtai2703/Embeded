import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import mqttService from '../services/MQTTService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LightsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [lights, setLights] = useState({
    livingRoom: false,
    bedroom: false,
    garageDoor: false,  // LED at pin 2 (garage door)
    mainDoor: false,    // LED at pin 14 (main door)
    garageLight: false, // New garage light
  });
  const [AutoLight, setAutoLight] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const toggleLight = (light: keyof typeof lights) => {
    const newValue = !lights[light];
    setLights(prev => ({
      ...prev,
      [light]: newValue,
    }));
    
    // Send MQTT message to control the corresponding LED
    if (isConnected) {
      if (light === 'livingRoom') {
        mqttService.publishLivingRoomLightControl(newValue);
      } else if (light === 'bedroom') {
        mqttService.publishBedroomLightControl(newValue);
      } else if (light === 'garageDoor') {
        mqttService.publishGarageDoorLedControl(newValue);
      } else if (light === 'mainDoor') {
        mqttService.publishMainDoorLedControl(newValue);
      } else if (light === 'garageLight') {
        mqttService.publishGarageLightControl(newValue);
      }
    }
  };

  const toggleAutoLight = (value: boolean) => {
    setAutoLight(value);
    mqttService.publishAutoLightControl(value);
  };

  useEffect(() => {
    // Connect to MQTT if not already connected
    if (!mqttService.isClientConnected()) {
      mqttService.connect()
        .then(() => setIsConnected(true))
        .catch(error => {
          console.error('Failed to connect to MQTT:', error);
          setIsConnected(false);
        });
    } else {
      setIsConnected(true);
    }

    return () => {
      // No need to disconnect as the service is a singleton
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
        <Text style={styles.headerTitle}>Lights</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.lightsList}>
          <View style={styles.lightRow}>
            <View style={styles.lightInfo}>
              <Ionicons name="bulb" size={24} color="#333" />
              <Text style={styles.lightName}>Living Room Light</Text>
            </View>
            <Switch
              value={lights.livingRoom}
              onValueChange={() => toggleLight('livingRoom')}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.lightRow}>
            <View style={styles.lightInfo}>
              <Ionicons name="bulb" size={24} color="#333" />
              <Text style={styles.lightName}>Bedroom Light</Text>
            </View>
            <Switch
              value={lights.bedroom}
              onValueChange={() => toggleLight('bedroom')}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.lightRow}>
            <View style={styles.lightInfo}>
              <Ionicons name="car-sport" size={24} color="#333" />
              <Text style={styles.lightName}>Garage Door Light</Text>
            </View>
            <Switch
              value={lights.garageDoor}
              onValueChange={() => toggleLight('garageDoor')}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor="#fff"
              disabled={!isConnected}
            />
          </View>
          <View style={styles.lightRow}>
            <View style={styles.lightInfo}>
              <Ionicons name="home" size={24} color="#333" />
              <Text style={styles.lightName}>Main Door Light</Text>
            </View>
            <Switch
              value={lights.mainDoor}
              onValueChange={() => toggleLight('mainDoor')}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor="#fff"
              disabled={!isConnected}
            />
          </View>
          <View style={styles.lightRow}>
            <View style={styles.lightInfo}>
              <Ionicons name="flashlight" size={24} color="#333" />
              <Text style={styles.lightName}>Garage Light</Text>
            </View>
            <Switch
              value={lights.garageLight}
              onValueChange={() => toggleLight('garageLight')}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor="#fff"
              disabled={!isConnected}
            />
          </View>
          <View style={styles.lightRow}>
            <View style={styles.lightInfo}>
              <Ionicons name="car" size={24} color="#333" />
              <Text style={styles.lightName}>Auto Light</Text>
            </View>
            <Switch
              value={AutoLight}
              onValueChange={toggleAutoLight}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor="#fff"
              disabled={!isConnected}
            />
          </View>
        </View>
      </View>
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
  lightsList: {
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
  lightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    height: 70,
  },
  lightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lightName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default LightsScreen;