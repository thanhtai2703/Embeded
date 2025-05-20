import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import mqttService from '../services/MQTTService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const GarageSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [hcsr04Enabled, setHcsr04Enabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const toggleHCSR04 = (value: boolean) => {
    setHcsr04Enabled(value);
    mqttService.publishHCSR04Control(value);
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
        <Text style={styles.headerTitle}>Garage Settings</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.settingsList}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="car" size={24} color="#4CAF50" />
              <View>
                <Text style={styles.settingName}>Automatic Door Opening</Text>
                <Text style={styles.settingDescription}>Enable/disable automatic door opening when a vehicle is detected</Text>
              </View>
            </View>
            <Switch
              value={hcsr04Enabled}
              onValueChange={toggleHCSR04}
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
  settingsList: {
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 70,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  settingName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default GarageSettingsScreen;