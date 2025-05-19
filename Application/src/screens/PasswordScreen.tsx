import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import mqttService from '../services/MQTTService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Connect to MQTT
  useEffect(() => {
    const connectToMQTT = async () => {
      try {
        // Connect to MQTT broker if not already connected
        if (!mqttService.isClientConnected()) {
          const connected = await mqttService.connect();
          setIsConnected(connected);
        } else {
          setIsConnected(true);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to connect to MQTT:', error);
        setIsConnected(false);
        setIsLoading(false);
        Alert.alert('Connection Error', 'Failed to connect to the smart home system.');
      }
    };

    connectToMQTT();
  }, []);

  // Handle password change
  const handleChangePassword = () => {
    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirmation do not match');
      return;
    }

    if (newPassword.length !== 4 || !/^\d+$/.test(newPassword)) {
      Alert.alert('Error', 'Password must be exactly 4 digits');
      return;
    }

    // Send password change command via MQTT
    if (isConnected) {
      mqttService.publishPasswordChange(currentPassword, newPassword);
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Show success message
      Alert.alert(
        'Password Change Request',
        'Password change request has been sent. If the current password is correct, the door password will be updated.',
        [{ text: 'OK' }]
      );
    } else {
      // Show error if not connected
      Alert.alert(
        'Connection Error',
        'Cannot change password: Not connected to the smart home system.',
        [{ text: 'OK' }]
      );
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
        <Text style={styles.headerTitle}>Change Door Password</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.passwordCard}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="key" 
              size={80} 
              color="#007AFF" 
            />
          </View>
          
          <Text style={styles.description}>
            Change the 4-digit password used to unlock the main door.
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current 4-digit password"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new 4-digit password"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new 4-digit password"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.changeButton, !isConnected && styles.disabledButton]}
            onPress={handleChangePassword}
            disabled={!isConnected}
          >
            <Text style={styles.changeButtonText}>Change Password</Text>
          </TouchableOpacity>
          
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
  passwordCard: {
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
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  changeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 10,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    width: '100%',
  },
  warningText: {
    color: '#856404',
    marginLeft: 10,
    fontSize: 14,
  },
});

export default PasswordScreen;