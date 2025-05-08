import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ControlButtonProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isActive?: boolean;
}

const ControlButton: React.FC<ControlButtonProps> = ({ title, icon, onPress, isActive = false }) => (
  <TouchableOpacity
    style={[styles.controlButton, isActive && styles.activeButton]}
    onPress={onPress}
  >
    <Ionicons name={icon} size={32} color={isActive ? '#fff' : '#333'} />
    <Text style={[styles.buttonText, isActive && styles.activeButtonText]}>{title}</Text>
  </TouchableOpacity>
);

const HomeMenu: React.FC = () => {
  const [controls, setControls] = React.useState({
    garage: false,
    light: false,
    gas: false,
  });

  const toggleControl = (control: keyof typeof controls) => {
    setControls(prev => ({
      ...prev,
      [control]: !prev[control],
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Smart Home Control</Text>
      <View style={styles.controlsContainer}>
        <ControlButton
          title="Garage Door"
          icon="car"
          onPress={() => toggleControl('garage')}
          isActive={controls.garage}
        />
        <ControlButton
          title="Lights"
          icon="bulb"
          onPress={() => toggleControl('light')}
          isActive={controls.light}
        />
        <ControlButton
          title="Gas"
          icon="flame"
          onPress={() => toggleControl('gas')}
          isActive={controls.gas}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 20,
  },
  controlButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '45%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  activeButtonText: {
    color: '#fff',
  },
});

export default HomeMenu; 