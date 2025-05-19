#include <Wire.h>              // For I2C communication
#include <Adafruit_GFX.h>      // Graphics library
#include <Adafruit_SH110X.h>   // SH1106 OLED display library
#include <ESP32Servo.h>        // Servo library for ESP32
#include <WiFi.h>              // WiFi library
#include <PubSubClient.h>      // MQTT library
#include <WiFiClientSecure.h>  // For secure WiFi connection
#include <DHT.h>               // DHT sensor library
#include <ArduinoJson.h>       // JSON library for formatting data

// Pin definitions
#define TRIG_PIN 5             // HC-SR04 trigger pin
#define ECHO_PIN 18            // HC-SR04 echo pin
#define SERVO_PIN 13           // Servo motor control pin
#define DHT_PIN 4              // DHT11 data pin
#define DHT_TYPE DHT11         // DHT sensor type
#define OLED_RESET -1          // Reset pin (or -1 if sharing Arduino reset pin)
#define I2C_ADDRESS 0x3C       // I2C address for the OLED display (typical: 0x3C)
#define LIGHT_SENSOR_PIN 35    // MH-series light sensor analog pin
#define LED_PIN 2              // LED pin for night light
#define LED_PIN2 14            // Second LED pin for night light
#define LIVING_ROOM_LED_PIN 32 // LED pin for living room light
#define BEDROOM_LED_PIN 33     // LED pin for bedroom light

// Constants
#define DISTANCE_THRESHOLD 30  // Distance threshold in cm to trigger door opening
#define DOOR_OPEN_ANGLE 90     // Angle for open door position
#define DOOR_CLOSED_ANGLE 0    // Angle for closed door position
#define DOOR_OPEN_TIME 5000    // Time to keep door open in milliseconds (minimum time)
#define LIGHT_THRESHOLD 3000   // Threshold for light sensor (adjust as needed)

// WiFi credentials
const char* ssid = "ttt";         // Replace with your WiFi SSID
const char* password = "thanhtai111"; // Replace with your WiFi password

// MQTT Broker settings
const char* mqtt_broker = "b5619a98.ala.asia-southeast1.emqxsl.com";  // EMQX Cloud broker address
const int mqtt_port = 8883;  
const char* mqtt_username = "thanhtai";             
const char* mqtt_password = "thanhtai";              
const char* client_id = "esp32_garage"; // MQTT client ID
// Root CA Certificate for TLS/SSL connection
const char* root_ca = R"EOF(
-----BEGIN CERTIFICATE-----
MIIDrzCCApegAwIBAgIQCDvgVpBCRrGhdWrJWZHHSjANBgkqhkiG9w0BAQUFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBD
QTAeFw0wNjExMTAwMDAwMDBaFw0zMTExMTAwMDAwMDBaMGExCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IENBMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4jvhEXLeqKTTo1eqUKKPC3eQyaKl7hLOllsB
CSDMAZOnTjC3U/dDxGkAV53ijSLdhwZAAIEJzs4bg7/fzTtxRuLWZscFs3YnFo97
nh6Vfe63SKMI2tavegw5BmV/Sl0fvBf4q77uKNd0f3p4mVmFaG5cIzJLv07A6Fpt
43C/dxC//AH2hdmoRBBYMql1GNXRor5H4idq9Joz+EkIYIvUX7Q6hL+hqkpMfT7P
T19sdl6gSzeRntwi5m3OFBqOasv+zbMUZBfHWymeMr/y7vrTC0LUq7dBMtoM1O/4
gdW7jVg/tRvoSSiicNoxBN33shbyTApOB6jtSj1etX+jkMOvJwIDAQABo2MwYTAO
BgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUA95QNVbR
TLtm8KPiGxvDl7I90VUwHwYDVR0jBBgwFoAUA95QNVbRTLtm8KPiGxvDl7I90VUw
DQYJKoZIhvcNAQEFBQADggEBAMucN6pIExIK+t1EnE9SsPTfrgT1eXkIoyQY/Esr
hMAtudXH/vTBH1jLuG2cenTnmCmrEbXjcKChzUyImZOMkXDiqw8cvpOp/2PV5Adg
06O/nVsJ8dWO41P0jmP6P6fbtGbfYmbW0W5BjfIttep3Sp+dWOIrWcBAI+0tKIJF
PnlUkiaY4IBIqDfv8NZ5YBberOgOzW6sRBc4L0na4UU+Krk2U886UAb3LujEV0ls
YSEY1QSteDwsOoBrp+uvFRTp2InBuThs4pFsiv9kuXclVzDAGySj4dzp30d8tbQk
CAUw7C29C79Fv1C5qfPrmAESrciIxpg0X40KPMbp1ZWVbd4=
-----END CERTIFICATE-----
)EOF";

// MQTT Topics
const char* temp_topic = "sensors/temperature/garage";
const char* humidity_topic = "sensors/humidity/garage";
const char* dht_topic = "sensors/dht11/garage";
const char* light_control_topic = "control/garage/light"; // Topic for receiving light control commands
const char* living_room_light_topic = "control/garage/livingroom"; // Topic for controlling living room LED
const char* bedroom_light_topic = "control/garage/bedroom"; // Topic for controlling bedroom LED
const char* combined_topic = "sensors/all/room1"; // Topic for InfluxDB Cloud integration

// Initialize the OLED display
Adafruit_SH1106G display = Adafruit_SH1106G(128, 64, &Wire, OLED_RESET);

// Initialize the servo
Servo garageDoorServo;

// Initialize the DHT sensor
DHT dht(DHT_PIN, DHT_TYPE);

// Initialize WiFi client with SSL/TLS support
WiFiClientSecure espClient;

// Initialize MQTT client
PubSubClient mqtt_client(espClient);

// Variables
float distance = 0.0;          // Distance measured by ultrasonic sensor
float filteredDistance = 0.0;  // Filtered distance after debouncing
bool doorOpen = false;         // Door state
float temperature = 0.0;       // Temperature from DHT11
float humidity = 0.0;          // Humidity from DHT11
int lightValue = 0;            // Light sensor reading
bool ledOn = false;            // LED state
bool led2On = false;           // Second LED state
bool livingRoomLedOn = false;  // Living room LED state
bool bedroomLedOn = false;     // Bedroom LED state
bool autoLightEnabled = false;  // Auto light control enabled by default
unsigned long doorOpenTime = 0; // Time when door was opened
unsigned long lastDistanceCheckTime = 0; // Last time distance was checked
const unsigned long distanceCheckInterval = 200; // Check distance every 200ms
unsigned long lastLightCheckTime = 0;    // Last time light was checked
const unsigned long lightCheckInterval = 1000; // Check light every 1 second

// MQTT timing variables
unsigned long lastPublishTime = 0;
const unsigned long publishInterval = 2000; // Publish to MQTT every 2 seconds

// WiFi and MQTT connection status
bool wifiConnected = false;
bool mqttConnected = false;

// Variables for door control and debouncing
bool vehicleDetected = false;                // Flag to indicate if vehicle is detected
unsigned long vehicleDetectionTime = 0;      // Time when vehicle was first detected
const unsigned long VEHICLE_DEBOUNCE_TIME = 1000; // Debounce time for vehicle detection (1 second)

// Distance filtering variables
const int DISTANCE_SAMPLES = 5;              // Number of samples for distance averaging
float distanceSamples[DISTANCE_SAMPLES];     // Array to store distance samples
int sampleIndex = 0;                         // Current index in the samples array

// Function declarations
void readUltrasonicSensor();
void readDHTSensor();
void readLightSensor();
void openDoor();
void closeDoor();
void updateDisplay();
void setup_wifi();
void reconnect_mqtt();
void publishDHTData();
void handleLightControl();
void publishLightData();
void mqtt_callback(char* topic, byte* payload, unsigned int length); // MQTT message callback

void setup() {
  // Initialize serial communication for debugging
  Serial.begin(115200);
  Serial.println("ESP32 Automatic Garage System with DHT11");
  
  // Initialize HC-SR04 pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  Serial.println("HC-SR04 sensor initialized");
  
  // Initialize the DHT sensor
  dht.begin();
  Serial.println("DHT11 sensor initialized");
  
  // Initialize the light sensor and LED pins
  pinMode(LIGHT_SENSOR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(LED_PIN2, OUTPUT);
  pinMode(LIVING_ROOM_LED_PIN, OUTPUT);
  pinMode(BEDROOM_LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // LED off initially
  digitalWrite(LED_PIN2, LOW); // Second LED off initially
  digitalWrite(LIVING_ROOM_LED_PIN, LOW); // Living room LED off initially
  digitalWrite(BEDROOM_LED_PIN, LOW); // Bedroom LED off initially
  Serial.println("Light sensor and LEDs initialized");
  
  // Initialize the OLED display
  display.begin(I2C_ADDRESS, true); // true = reset
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);
  display.println("ESP32 Garage System");
  display.println("Initializing...");
  display.display();
  delay(2000);
  Serial.println("OLED display initialized");
  
  // Initialize the servo motor
  ESP32PWM::allocateTimer(0);
  garageDoorServo.setPeriodHertz(50);    // Standard 50Hz servo
  garageDoorServo.attach(SERVO_PIN, 500, 2400); // Adjust min/max pulse width if needed
  garageDoorServo.write(DOOR_CLOSED_ANGLE); // Initial position - door closed
  Serial.println("Servo motor initialized");
  
  // Initialize distance samples array
  for (int i = 0; i < DISTANCE_SAMPLES; i++) {
    distanceSamples[i] = 400; // Initialize with a large value (no object detected)
  }
  
  // Setup WiFi connection
  setup_wifi();
  
  if (wifiConnected) {
    // Set the root CA certificate for SSL/TLS
    espClient.setCACert(root_ca);
    Serial.println("SSL/TLS certificate configured");
    
    // Configure MQTT connection
    mqtt_client.setServer(mqtt_broker, mqtt_port);
    mqtt_client.setCallback(mqtt_callback);
    Serial.println("MQTT callback function set");
    
    // Connect to MQTT broker
    reconnect_mqtt();
  }
  
  // Take initial sensor readings
  readDHTSensor();
  readLightSensor();
  
  // Display welcome message
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("ESP32 Garage System");
  display.println("System Ready");
  display.display();
  Serial.println("System ready");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Check if connected to MQTT broker
  if (wifiConnected && !mqtt_client.connected()) {
    reconnect_mqtt();
  }
  if (mqttConnected) {
    mqtt_client.loop();
  }
  
  // Check distance at regular intervals
  if (currentTime - lastDistanceCheckTime >= distanceCheckInterval) {
    lastDistanceCheckTime = currentTime;
    readUltrasonicSensor();
    
    // Vehicle detection with debouncing
    if (filteredDistance <= DISTANCE_THRESHOLD) {
      if (!vehicleDetected) {
        // First time detecting vehicle
        vehicleDetected = true;
        vehicleDetectionTime = currentTime;
        Serial.println("Potential vehicle detected, starting debounce timer");
      } else if (!doorOpen && (currentTime - vehicleDetectionTime >= VEHICLE_DEBOUNCE_TIME)) {
        // Vehicle has been detected consistently for the debounce period
        Serial.println("Vehicle confirmed! Opening door...");
        openDoor();
      }
    } else {
      // No vehicle detected
      if (vehicleDetected) {
        Serial.println("Vehicle no longer detected");
        vehicleDetected = false;
        
        // Close the door immediately when vehicle moves away
        if (doorOpen) {
          Serial.println("Closing door immediately");
          closeDoor();
        }
      }
    }
  }
  
  // Check light sensor at regular intervals
  if (currentTime - lastLightCheckTime >= lightCheckInterval) {
    lastLightCheckTime = currentTime;
    readLightSensor();
    handleLightControl();
  }
  
  // Read DHT11 sensor and publish to MQTT - less frequently to reduce load
  if (currentTime - lastPublishTime >= publishInterval) {
    lastPublishTime = currentTime;
    readDHTSensor();
    publishDHTData();
    publishLightData(); // Also publish light sensor data
  }
  
  // Door control logic - prioritize this over display updates
  // Note: The main door closing logic is now in the vehicle detection section
  // This is just a fallback for the minimum open time
  if (doorOpen && currentTime - doorOpenTime >= DOOR_OPEN_TIME) {
    // Only close the door if no vehicle is detected and minimum open time has passed
    if (filteredDistance > DISTANCE_THRESHOLD) {
      Serial.println("Minimum door open time elapsed. Closing door...");
      closeDoor();
    }
  }
  
  // Update display - limit updates to reduce I2C bus load
  static unsigned long lastDisplayUpdate = 0;
  unsigned long displayUpdateInterval = 3000; // Standard update interval
  if (currentTime - lastDisplayUpdate >= displayUpdateInterval) {
    lastDisplayUpdate = currentTime;
    updateDisplay();
  }
}

// Function to read distance from HC-SR04 ultrasonic sensor with filtering
void readUltrasonicSensor() {
  // Clear the trigger pin
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  
  // Set the trigger pin HIGH for 10 microseconds
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Read the echo pin, convert the time to distance in cm
  // Sound travels at approximately 343 meters per second (or 0.0343 cm/microsecond)
  // The pulse travels to the object and back, so we divide by 2
  long duration = pulseIn(ECHO_PIN, HIGH);
  float rawDistance = duration * 0.0343 / 2;
  
  // Ignore obviously invalid readings (too far or too close)
  if (rawDistance > 400 || rawDistance < 2) {
    Serial.println("Invalid distance reading, ignoring");
    return; // Keep previous distance value
  }
  
  // Store the new reading in the samples array
  distanceSamples[sampleIndex] = rawDistance;
  sampleIndex = (sampleIndex + 1) % DISTANCE_SAMPLES;
  
  // Calculate the average of all samples
  float sum = 0;
  for (int i = 0; i < DISTANCE_SAMPLES; i++) {
    sum += distanceSamples[i];
  }
  
  // Update the raw and filtered distance values
  distance = rawDistance;
  filteredDistance = sum / DISTANCE_SAMPLES;
  
  // Serial.print("Raw Distance: ");
  // Serial.print(distance);
  // Serial.print(" cm, Filtered: ");
  // Serial.print(filteredDistance);
  // Serial.println(" cm");
}

// Function to read temperature and humidity from DHT11 sensor
void readDHTSensor() {
  // Reading temperature and humidity can take up to 250ms
  humidity = dht.readHumidity();
  temperature = dht.readTemperature(); // Read temperature in Celsius
  
  // Check if any reads failed and exit early (to try again)
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print(" °C, Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");
}

// Function to open the garage door
void openDoor() {
  doorOpen = true;
  doorOpenTime = millis();
  
  // Move servo to open position
  garageDoorServo.write(DOOR_OPEN_ANGLE);
  
  Serial.println("Door opened");
}

// Function to close the garage door
void closeDoor() {
  doorOpen = false;
  
  // Move servo to closed position
  garageDoorServo.write(DOOR_CLOSED_ANGLE);
  delay(100);  // Short delay to ensure command is processed
  
  Serial.println("Door closed");
}

// Variables to track previous state for display optimization
float lastDisplayedDistance = -1;
bool lastDisplayedDoorState = false;
float lastDisplayedTemperature = -1;
float lastDisplayedHumidity = -1;
int lastDisplayedLightValue = -1;
bool lastDisplayedLedState = false;
bool lastDisplayedLed2State = false;

// Function to set up WiFi connection
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 20) {
    delay(500);
    Serial.print(".");
    attempt++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("");
    Serial.println("WiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    Serial.println("");
    Serial.println("WiFi connection failed");
  }
}

// Function to reconnect to MQTT broker
void reconnect_mqtt() {
  // Loop until we're reconnected or max retries reached
  int retry_count = 0;
  while (!mqtt_client.connected() && retry_count < 3 && wifiConnected) {
    Serial.print("Attempting secure MQTT connection to ");
    Serial.print(mqtt_broker);
    Serial.print(":");
    Serial.print(mqtt_port);
    Serial.println("...");
    
    // Attempt to connect with client ID, username and password
    if (mqtt_client.connect(client_id, mqtt_username, mqtt_password)) {
      Serial.println("Connected to EMQX Cloud successfully");
      mqttConnected = true;
      
      // Subscribe to the light control topics
      mqtt_client.subscribe(light_control_topic);
      mqtt_client.subscribe(living_room_light_topic);
      mqtt_client.subscribe(bedroom_light_topic);
      Serial.print("Subscribed to topics: ");
      Serial.println(light_control_topic);
      Serial.println(living_room_light_topic);
      Serial.println(bedroom_light_topic);
    } else {
      retry_count++;
      Serial.print("Failed to connect, rc=");
      Serial.print(mqtt_client.state());
      Serial.println(" Retrying in 5 seconds");
      delay(5000);
    }
  }
  
  if (!mqtt_client.connected() && wifiConnected) {
    mqttConnected = false;
    Serial.println("Failed to connect to MQTT broker after multiple attempts");
    Serial.println("Will continue in offline mode and retry later");
  }
}

// Function to publish DHT11 data to MQTT broker
void publishDHTData() {
  // Only publish if MQTT is connected
  if (!mqttConnected) {
    Serial.println("MQTT not connected, skipping publish");
    return;
  }
  
  // Create a JSON document for the combined data
  StaticJsonDocument<200> jsonDoc;
  jsonDoc["temperature"] = temperature;
  jsonDoc["humidity"] = humidity;
  jsonDoc["unit"] = "celsius";
  jsonDoc["timestamp"] = millis();
  jsonDoc["location"] = "garage"; // Add location tag for InfluxDB
  jsonDoc["device"] = "ESP32-Garage"; // Add device identifier
  
  // Serialize JSON to a string
  char jsonBuffer[200];
  serializeJson(jsonDoc, jsonBuffer);
  
  // Publish individual topics
  char tempStr[10];
  char humStr[10];
  dtostrf(temperature, 1, 2, tempStr);
  dtostrf(humidity, 1, 2, humStr);
  
  mqtt_client.publish(temp_topic, tempStr);
  mqtt_client.publish(humidity_topic, humStr);
  
  // Publish combined JSON data
  mqtt_client.publish(dht_topic, jsonBuffer);
  
  // Publish to the topic that InfluxDB is listening to
  mqtt_client.publish(combined_topic, jsonBuffer);
  
  Serial.println("Data published to MQTT broker and InfluxDB Cloud");
}

// Function to read light sensor value
void readLightSensor() {
  // Read the analog value from the light sensor
  lightValue = analogRead(LIGHT_SENSOR_PIN);
  
  Serial.print("Light sensor value: ");
  Serial.println(lightValue);
}

// Function to control LEDs based on light level and auto light setting
void handleLightControl() {
  // Only control lights automatically if auto light is enabled
  if (autoLightEnabled) {
    // If light level is below threshold (darker), turn on LEDs
    if (lightValue > LIGHT_THRESHOLD && (!ledOn || !led2On)) {
      digitalWrite(LED_PIN, HIGH);
      digitalWrite(LED_PIN2, HIGH);
      ledOn = true;
      led2On = true;
      Serial.println("LEDs turned ON due to low light");
    }
    // If light level is above threshold (brighter), turn off LEDs
    else if (lightValue <= LIGHT_THRESHOLD && (ledOn || led2On)) {
      digitalWrite(LED_PIN, LOW);
      digitalWrite(LED_PIN2, LOW);
      ledOn = false;
      led2On = false;
      Serial.println("LEDs turned OFF due to sufficient light");
    }
  }
  // If auto light is disabled, ensure LEDs are off
  else if (!autoLightEnabled && (ledOn || led2On)) {
    digitalWrite(LED_PIN, LOW);
    digitalWrite(LED_PIN2, LOW);
    ledOn = false;
    led2On = false;
  }
}

// MQTT message callback function
void mqtt_callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived on topic: ");
  Serial.print(topic);
  Serial.print(". Message: ");
  
  // Convert payload to string for easier handling
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);
  
  // Handle light control topic
  if (String(topic) == light_control_topic) {
    if (message == "ON") {
      autoLightEnabled = true;
      Serial.println("Auto light control enabled");
      // Apply light control immediately based on current light value
      handleLightControl();
    } else if (message == "OFF") {
      autoLightEnabled = false;
      Serial.println("Auto light control disabled");
      // Turn off LEDs when auto light is disabled
      digitalWrite(LED_PIN, LOW);
      digitalWrite(LED_PIN2, LOW);
      ledOn = false;
      led2On = false;
      Serial.println("LEDs turned OFF due to auto light being disabled");
    }
  }
  // Handle living room light control topic
  else if (String(topic) == living_room_light_topic) {
    if (message == "ON") {
      digitalWrite(LIVING_ROOM_LED_PIN, HIGH);
      livingRoomLedOn = true;
      Serial.println("Living room light turned ON");
    } else if (message == "OFF") {
      digitalWrite(LIVING_ROOM_LED_PIN, LOW);
      livingRoomLedOn = false;
      Serial.println("Living room light turned OFF");
    }
  }
  // Handle bedroom light control topic
  else if (String(topic) == bedroom_light_topic) {
    if (message == "ON") {
      digitalWrite(BEDROOM_LED_PIN, HIGH);
      bedroomLedOn = true;
      Serial.println("Bedroom light turned ON");
    } else if (message == "OFF") {
      digitalWrite(BEDROOM_LED_PIN, LOW);
      bedroomLedOn = false;
      Serial.println("Bedroom light turned OFF");
    }
  }
}

// Function to publish light sensor data to MQTT broker
void publishLightData() {
  // Only publish if MQTT is connected
  if (!mqttConnected) {
    Serial.println("MQTT not connected, skipping light data publish");
    return;
  }
  
  // Create a JSON document for the light data
  StaticJsonDocument<200> jsonDoc;
  jsonDoc["light"] = lightValue;
  jsonDoc["led_status"] = ledOn ? "ON" : "OFF";
  jsonDoc["led2_status"] = led2On ? "ON" : "OFF";
  jsonDoc["living_room_led"] = livingRoomLedOn ? "ON" : "OFF";
  jsonDoc["bedroom_led"] = bedroomLedOn ? "ON" : "OFF";
  jsonDoc["auto_light"] = autoLightEnabled ? "ON" : "OFF";
  jsonDoc["timestamp"] = millis();
  jsonDoc["location"] = "garage"; // Add location tag for InfluxDB
  jsonDoc["device"] = "ESP32-Garage"; // Add device identifier
  
  // Serialize JSON to a string
  char jsonBuffer[200]; // Increased buffer size to accommodate the location field
  serializeJson(jsonDoc, jsonBuffer);
  
  // Publish light value as a string
  char lightStr[10];
  itoa(lightValue, lightStr, 10);
  
  // Define a topic for light sensor data
  const char* light_topic = "sensors/light/garage";
  
  // Publish the light value to its own topic
  mqtt_client.publish(light_topic, lightStr);
  
  // Publish the combined JSON data
  const char* light_json_topic = "sensors/light_data/garage";
  mqtt_client.publish(light_json_topic, jsonBuffer);
  
  // Create a JSON document specifically for InfluxDB with just the light value
  StaticJsonDocument<100> influxDoc;
  influxDoc["light_level"] = lightValue;
  influxDoc["location"] = "garage";
  influxDoc["device"] = "ESP32-Garage";
  influxDoc["timestamp"] = millis();
  
  // Serialize the InfluxDB JSON to a string
  char influxBuffer[100];
  serializeJson(influxDoc, influxBuffer);
  
  // Publish to the topic that InfluxDB is listening to
  mqtt_client.publish(combined_topic, influxBuffer);

  Serial.println("Light data published to MQTT broker and InfluxDB Cloud");
}

// Function to update the OLED display
void updateDisplay() {
  // Check if any values have changed since last update
  // Only update the display if something has changed or it's been a long time
  static bool lastDisplayedAutoLightState = true; // Initialize with default value
  static bool lastDisplayedLivingRoomLedState = false; // Initialize with default value
  static bool lastDisplayedBedroomLedState = false; // Initialize with default value
  bool stateChanged = (abs(lastDisplayedDistance - filteredDistance) > 0.5) || 
                      (lastDisplayedDoorState != doorOpen) || 
                      (abs(lastDisplayedTemperature - temperature) > 0.1) || 
                      (abs(lastDisplayedHumidity - humidity) > 0.1) ||
                      (lastDisplayedLightValue != lightValue) ||
                      (lastDisplayedLedState != ledOn) ||
                      (lastDisplayedLed2State != led2On) ||
                      (lastDisplayedLivingRoomLedState != livingRoomLedOn) ||
                      (lastDisplayedBedroomLedState != bedroomLedOn) ||
                      (lastDisplayedAutoLightState != autoLightEnabled);
  
  static unsigned long lastFullUpdateTime = 0;
  unsigned long currentTime = millis();
  bool timeForFullUpdate = (currentTime - lastFullUpdateTime >= 10000); // Full refresh every 10 seconds
  
  if (stateChanged || timeForFullUpdate) {
    // Save current state for next comparison
    lastDisplayedDistance = filteredDistance;
    lastDisplayedDoorState = doorOpen;
    lastDisplayedTemperature = temperature;
    lastDisplayedHumidity = humidity;
    lastDisplayedLightValue = lightValue;
    lastDisplayedLedState = ledOn;
    lastDisplayedLed2State = led2On;
    lastDisplayedLivingRoomLedState = livingRoomLedOn;
    lastDisplayedBedroomLedState = bedroomLedOn;
    lastDisplayedAutoLightState = autoLightEnabled;
    lastFullUpdateTime = currentTime;
    
    // Clear the display
    display.clearDisplay();
    
    // Display title
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("ESP32 Garage System");
    display.drawLine(0, 10, display.width(), 10, SH110X_WHITE);
    
    // Display distance
    display.setCursor(0, 12);
    display.print("Distance: ");
    display.print(filteredDistance, 1);
    display.println(" cm");
    
    // Display door status
    display.setCursor(0, 22);
    display.print("Door: ");
    display.println(doorOpen ? "OPEN" : "CLOSED");
    
    // Display vehicle detection status
    display.setCursor(0, 32);
    display.print("Vehicle: ");
    display.println(vehicleDetected ? "DETECTED" : "NONE");
    
    // Display temperature and humidity
    display.setCursor(0, 42);
    display.print("Temp: ");
    display.print(temperature, 1);
    display.println(" C");
    
    display.setCursor(0, 52);
    display.print("Humidity: ");
    display.print(humidity, 1);
    display.println(" %");
    
    // Display light level and LED status on a new line
    display.setCursor(0, 62);
    display.print("L:");
    display.print(lightValue);
    display.print(" LED1:");
    display.print(ledOn ? "ON" : "OFF");
    display.print(" Auto:");
    display.print(autoLightEnabled ? "ON" : "OFF");
    
    // Display living room and bedroom LED status
    display.setCursor(70, 42);
    display.print("LR:");
    display.print(livingRoomLedOn ? "ON" : "OFF");
    
    display.setCursor(70, 52);
    display.print("BR:");
    display.print(bedroomLedOn ? "ON" : "OFF");
    
    // Update the display
    display.display();
  }
}