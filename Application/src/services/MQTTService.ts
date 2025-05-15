import mqtt from 'mqtt';
import { Buffer } from 'buffer';
import 'react-native-url-polyfill/auto';

// MQTT Connection Information
const MQTT_BROKER = 'b5619a98.ala.asia-southeast1.emqxsl.com';
const MQTT_PORT = 8084; // WebSocket over TLS/SSL port
const MQTT_USERNAME = 'thanhtai';
const MQTT_PASSWORD = 'thanhtai';
const MQTT_CLIENT_ID = `react-native-mqtt-${Math.random().toString(16).substring(2, 8)}`;

// MQTT Topics - matching the topics used in MainHome.ino
const MQTT_TOPIC_COMBINED = 'sensors/all/room1';
const MQTT_TOPIC_TEMP = 'sensors/temperature/room1';
const MQTT_TOPIC_HUMIDITY = 'sensors/humidity/room1';

type MQTTMessage = {
  temperature?: number;
  humidity?: number;
  gas_level?: number;
  light_level?: number;
  led_status?: string;
  gas_alert?: string;
  door_status?: string;
  timestamp?: string | number;
  unit?: string;
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
}

// Create a singleton instance
const mqttService = new MQTTService();

export default mqttService;