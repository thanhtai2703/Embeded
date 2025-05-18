import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import mqttService from '../services/MQTTService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SecurityScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Connect to MQTT and get current security status
  useEffect(() => {
    const connectAndSubscribe = async () => {
      try {
        // Connect to MQTT broker if not already connected
        if (!mqttService.isClientConnected()) {
          const connected = await mqttService.connect();
          setIsConnected(connected);
        } else {
          setIsConnected(true);
        }

        // Subscribe to messages
        mqttService.onMessage((message) => {
          if (message.security_mode !== undefined) {
            // Update security mode state based on received data
            setSecurityEnabled(message.security_mode === 'ON');
            setIsLoading(false);
          }
        });
      } catch (error) {
        console.error('Failed to connect to MQTT:', error);
        setIsConnected(false);
        setIsLoading(false);
        Alert.alert('Connection Error', 'Failed to connect to the smart home system.');
      }
    };

    connectAndSubscribe();
  }, []);

  // Toggle security mode
  const toggleSecurity = () => {
    const newState = !securityEnabled;
    setSecurityEnabled(newState);
    
    // Send command to ESP32 via MQTT
    if (isConnected) {
      mqttService.publishSecurityControl(newState);
      
      // Show confirmation message
      Alert.alert(
        'Security Mode',
        `Security mode has been ${newState ? 'enabled' : 'disabled'}.`,
        [{ text: 'OK' }]
      );
    } else {
      // Show error if not connected
      Alert.alert(
        'Connection Error',
        'Cannot control security mode: Not connected to the smart home system.',
        [{ text: 'OK' }]
      );
      // Revert the state change since we couldn't send the command
      setSecurityEnabled(!newState);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security System</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.securityCard}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="shield" 
              size={80} 
              color={securityEnabled ? "#FF3B30" : "#999"} 
            />
          </View>
          
          <Text style={styles.statusText}>
            Security Mode is currently
            <Text style={{
              color: securityEnabled ? '#FF3B30' : '#999',
              fontWeight: 'bold'
            }}> {securityEnabled ? 'ENABLED' : 'DISABLED'}</Text>
          </Text>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Enable Security Mode</Text>
            <Switch
              value={securityEnabled}
              onValueChange={toggleSecurity}
              trackColor={{ false: '#e0e0e0', true: '#FF3B30' }}
              thumbColor="#fff"
              disabled={!isConnected}
            />
          </View>
          
          <Text style={styles.description}>
            When enabled, the security system will monitor for unauthorized presence and trigger an alarm if detected.
          </Text>
          
          {!isConnected && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={24} color="#FFA500" />
              <Text style={styles.warningText}>Not connected to the smart home system</Text>
            </View>
          )}
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
    flex: 1,
  },
  securityCard: {
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
    alignItems: 'center',
  },
  iconContainer: {
    marginVertical: 20,
  },
  statusText: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  warningText: {
    marginLeft: 10,
    color: '#FFA500',
    fontSize: 14,
  },
});

export default SecurityScreen;