import mqtt from 'mqtt';
import { Buffer } from 'buffer';
import 'react-native-url-polyfill/auto';
import { StringOrCallback } from 'victory-core';

// MQTT Connection Information
const MQTT_BROKER = 'b5619a98.ala.asia-southeast1.emqxsl.com';
const MQTT_PORT = 8084; // WebSocket over TLS/SSL port
const MQTT_USERNAME = 'thanhtai';
const MQTT_PASSWORD = 'thanhtai';
const MQTT_CLIENT_ID = `react-native-mqtt-${Math.random().toString(16).substring(2, 8)}`;

// MQTT Topics - matching the topics used in MainHome.ino
const MQTT_TOPIC_COMBINED = 'sensors/all/room1';
const MQTT_TOPIC_COMBINED_2 ='sensors/all/garage';
const MQTT_TOPIC_TEMP = 'sensors/temperature/room1';
const MQTT_TOPIC_HUMIDITY = 'sensors/humidity/room1';
// Control topics
const MQTT_TOPIC_SECURITY_CONTROL = 'control/security/room1';
const MQTT_TOPIC_PASSWORD_CONTROL = 'control/password/room1';
const MQTT_TOPIC_GARAGE_LIGHT_CONTROL = 'control/garage/light';
const MQTT_TOPIC_GARAGE_LIVING_ROOM_LIGHT = 'control/garage/livingroom';
const MQTT_TOPIC_GARAGE_BEDROOM_LIGHT = 'control/garage/bedroom';
const MQTT_TOPIC_GARAGE_DOOR_LED = 'control/garage/door_led'; // New topic for garage door LED (pin 2)
const MQTT_TOPIC_MAIN_DOOR_LED = 'control/garage/main_door_led'; // New topic for main door LED (pin 14)
const MQTT_TOPIC_GARAGE_LIGHT = 'control/garage/garage_light'; // New topic for garage light
const MQTT_TOPIC_HCSR04_CONTROL = 'control/garage/hcsr04';
// Door control topics
const MQTT_TOPIC_MAINHOME_DOOR_CONTROL = 'control/door/mainhome';
const MQTT_TOPIC_GARAGE_DOOR_CONTROL = 'control/door/garage';

type MQTTMessage = {
  temperature?: number;
  humidity?: number;
  gas_level?: number;
  light_level?: number;
  led_status?: string;
  gas_alert?: string;
  door_status?: string;
  security_mode?: string;
  security_alarm?: string;
  timestamp?: string | number;
  unit?: string;
  location?:string;
};

type MQTTCallback = (message: MQTTMessage) => void;

class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private isConnected: boolean = false;
  private callbacks: Map<string, MQTTCallback[]> = new Map();

  constructor() {
    this.callbacks.set('message', []);
  }

  connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket URL for MQTT connection
        const wsUrl = `wss://${MQTT_BROKER}:${MQTT_PORT}/mqtt`;
        
        // Connection options
        const options = {
          clientId: MQTT_CLIENT_ID,
          username: MQTT_USERNAME,
          password: MQTT_PASSWORD,
          clean: true,
          reconnectPeriod: 5000, // Reconnect every 5 seconds if connection is lost
          connectTimeout: 30 * 1000, // 30 seconds timeout
        };

        console.log('Connecting to MQTT broker:', wsUrl);
        
        // Connect to the MQTT broker
        this.client = mqtt.connect(wsUrl, options);

        // Set up event handlers
        this.client.on('connect', () => {
          console.log('Connected to MQTT broker');
          this.isConnected = true;
          
          // Subscribe to the topics
          this.subscribe(MQTT_TOPIC_COMBINED);
          this.subscribe(MQTT_TOPIC_COMBINED_2);
          this.subscribe(MQTT_TOPIC_TEMP);
          this.subscribe(MQTT_TOPIC_HUMIDITY);
          
          resolve(true);
        });

        this.client.on('error', (err) => {
          console.error('MQTT connection error:', err);
          reject(err);
        });

        this.client.on('message', (topic, message) => {
          console.log(`Received message on topic ${topic}: ${message.toString()}`);
          try {
            const payload = JSON.parse(message.toString());
            const callbacks = this.callbacks.get('message') || [];
            callbacks.forEach(callback => callback(payload));
          } catch (error) {
            console.error('Error parsing MQTT message:', error);
          }
        });

        this.client.on('disconnect', () => {
          console.log('Disconnected from MQTT broker');
          this.isConnected = false;
        });

        this.client.on('reconnect', () => {
          console.log('Attempting to reconnect to MQTT broker');
        });
      } catch (error) {
        console.error('Error setting up MQTT client:', error);
        reject(error);
      }
    });
  }

  subscribe(topic: string): void {
    if (this.client && this.isConnected) {
      this.client.subscribe(topic, (err) => {
        if (err) {
          console.error(`Error subscribing to topic ${topic}:`, err);
        } else {
          console.log(`Subscribed to topic: ${topic}`);
        }
      });
    } else {
      console.warn('Cannot subscribe: MQTT client not connected');
    }
  }

  onMessage(callback: MQTTCallback): void {
    const callbacks = this.callbacks.get('message') || [];
    callbacks.push(callback);
    this.callbacks.set('message', callbacks);
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      console.log('MQTT client disconnected');
    }
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }

  // Function to publish security control message
  publishSecurityControl(enabled: boolean): void {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot publish: MQTT client not connected');
      return;
    }
    
    const message = enabled ? 'ON' : 'OFF';
    this.client.publish(MQTT_TOPIC_SECURITY_CONTROL, message, { qos: 1 });
    console.log(`Published security control message: ${message}`);
  }

  // Function to publish garage auto light control message
  publishAutoLightControl(enabled: boolean): void {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot publish: MQTT client not connected');
      return;
    }
    
    const message = enabled ? 'ON' : 'OFF';
    this.client.publish(MQTT_TOPIC_GARAGE_LIGHT_CONTROL, message, { qos: 1 });
    console.log(`Published auto light control message: ${message}`);
  }

  // Function to publish living room light control message
  publishLivingRoomLightControl(enabled: boolean): void {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot publish: MQTT client not connected');
      return;
    }
    
    const message = enabled ? 'ON' : 'OFF';
    this.client.publish(MQTT_TOPIC_GARAGE_LIVING_ROOM_LIGHT, message, { qos: 1 });
    console.log(`Published living room light control message: ${message}`);
  }

  // Function to publish bedroom light control message
  publishBedroomLightControl(enabled: boolean): void {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot publish: MQTT client not connected');
      return;
    }
    
    const message = enabled ? 'ON' : 'OFF';
    this.client.publish(MQTT_TOPIC_GARAGE_BEDROOM_LIGHT, message, { qos: 1 });
    console.log(`Published bedroom light control message: ${message}`);
  }

  // Function to publish garage door LED control message (pin 2)
  publishGarageDoorLedControl(enabled: boolean): void {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot publish: MQTT client not connected');
      return;
    }
    
    const message = enabled ? 'ON' : 'OFF';
    this.client.publish(MQTT_TOPIC_GARAGE_DOOR_LED, message, { qos: 1 });
    console.log(`Published garage door LED control message: ${message}`);
  }

  // Function to publish main door LED control message (pin 14)
  publishMainDoorLedControl(enabled: boolean): void {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot publish: MQTT client not connected');
      return;
    }
    
    const message = enabled ? 'ON' : 'OFF';
    this.client.publish(MQTT_TOPIC_MAIN_DOOR_LED, message, { qos: 1 });
    console.log(`Published main door LED control message: ${message}`);
  }

  // Function to publish garage light control message
  publishGarageLightControl(enabled: boolean): void {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot publish: MQTT client not connected');
      return;
    }
    
    const message = enabled ? 'ON' : 'OFF';
    this.client.publish(MQTT_TOPIC_GARAGE_LIGHT, message, { qos: 1 });
    console.log(`Published garage light control message: ${message}`);
  }

  // Function to publish HC-SR04 sensor control message
  publishHCSR04Control(enabled: boolean): void {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot publish: MQTT client not connected');
      return;
    }
    
    const message = enabled ? 'ON' : 'OFF';
    this.client.publish(MQTT_TOPIC_HCSR04_CONTROL, message, { qos: 1 });
    console.log(`Published HC-SR04 control message: ${message}`);
  }

  // Function to publish garage door control message
  publishGarageDoorControl(open: boolean): void {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot publish: MQTT client not connected');
      return;
    }
    
    const message = open ? 'OPEN' : 'CLOSE';
    this.client.publish(MQTT_TOPIC_GARAGE_DOOR_CONTROL, message, { qos: 1 });
    console.log(`Published garage door control message: ${message}`);
  }

  // Function to publish main home door control message
  publishMainHomeDoorControl(open: boolean): void {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot publish: MQTT client not connected');
      return;
    }
    
    const message = open ? 'OPEN' : 'CLOSE';
    this.client.publish(MQTT_TOPIC_MAINHOME_DOOR_CONTROL, message, { qos: 1 });
    console.log(`Published main home door control message: ${message}`);
  }

  // Function to publish password change request
  publishPasswordChange(currentPassword: string, newPassword: string): void {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot publish: MQTT client not connected');
      return;
    }
    
    // Create JSON message with current and new password
    const passwordData = {
      current_password: currentPassword,
      new_password: newPassword
    };
    
    const message = JSON.stringify(passwordData);
    this.client.publish(MQTT_TOPIC_PASSWORD_CONTROL, message, { qos: 1 });
    console.log('Published password change request');
  }

  // Function to control MainHome door


  // Function to control Garage door
}

// Create a singleton instance
const mqttService = new MQTTService();

export default mqttService;