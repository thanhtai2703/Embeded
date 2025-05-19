#include <Wire.h>              // For I2C communication
#include <Adafruit_GFX.h>      // Graphics library
#include <Adafruit_SH110X.h>   // SH1106 OLED display library
#include <DHT.h>               // DHT sensor library
#include <Keypad.h>            // Keypad library
#include <ESP32Servo.h>        // Servo library for ESP32
#include <WiFi.h>              // WiFi library
#include <PubSubClient.h>      // MQTT library
#include <WiFiClientSecure.h>  // For secure WiFi connection
#include <ArduinoJson.h>       // JSON library for formatting data

// Pin definitions
#define DHT_PIN 4              // DHT11 data pin
#define DHT_TYPE DHT11         // DHT sensor type
#define OLED_RESET -1          // Reset pin (or -1 if sharing Arduino reset pin)
#define I2C_ADDRESS 0x3C       // I2C address for the OLED display (typical: 0x3C)
#define SERVO_PIN 15           // Servo motor control pin
#define MQ135_PIN 34           // MQ135 gas sensor analog pin
#define BUZZER_PIN 5           // Buzzer pin for gas leak alert
#define LIGHT_SENSOR_PIN 35    // MH-series light sensor analog pin
#define LED_PIN 2              // LED pin for night light

// Security system pins
#define SECURITY_BUZZER_PIN 19 // Additional buzzer for security alert
#define TRIG_PIN 17            // HC-SR04 trigger pin
#define ECHO_PIN 18            // HC-SR04 echo pin

// WiFi credentials
const char* ssid = "ttt";         // Replace with your WiFi SSID
const char* password = "thanhtai111"; // Replace with your WiFi password

// MQTT Broker settings
const char* mqtt_broker = "b5619a98.ala.asia-southeast1.emqxsl.com";  // EMQX Cloud broker address
const int mqtt_port = 8883;  // MQTT over TLS/SSL port
const char* mqtt_username = "thanhtai";              // Replace if your broker requires authentication
const char* mqtt_password = "thanhtai";              // Replace if your broker requires authentication
const char* client_id = "esp32_smart_home"; // MQTT client ID

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
const char* temp_topic = "sensors/temperature/room1";
const char* humidity_topic = "sensors/humidity/room1";
const char* gas_topic = "sensors/gas/room1";
const char* light_topic = "sensors/light/room1";
const char* security_topic = "sensors/security/room1"; // New topic for security status
// Combined topic for all sensor data
const char* sensors_topic = "sensors/all/room1";
// Control topics
const char* security_control_topic = "control/security/room1"; // Topic for receiving security control commands
const char* password_control_topic = "control/password/room1"; // Topic for receiving password change commands

// Keypad configuration
#define ROW_NUM 4              // 4 rows
#define COL_NUM 4              // 4 columns

// Define the keypad layout
char keys[ROW_NUM][COL_NUM] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};

// Connect keypad ROW0, ROW1, ROW2 and ROW3 to these Arduino pins
byte rowPins[ROW_NUM] = {32, 33, 25, 26}; // Connect to the row pinouts of the keypad
// Connect keypad COL0, COL1, COL2 and COL3 to these Arduino pins
byte colPins[COL_NUM] = {27, 14, 12, 13}; // Connect to the column pinouts of the keypad

// Initialize the OLED display
Adafruit_SH1106G display = Adafruit_SH1106G(128, 64, &Wire, OLED_RESET);

// Initialize the DHT sensor
DHT dht(DHT_PIN, DHT_TYPE);

// Initialize the keypad
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROW_NUM, COL_NUM);

// Initialize the servo
Servo doorServo;

// Initialize WiFi client with SSL/TLS support
WiFiClientSecure espClient;

// Initialize MQTT client
PubSubClient mqtt_client(espClient);

// Variables to store sensor readings
float temperature = 0.0;
float humidity = 0.0;
int gasValue = 0;              // Variable to store gas sensor reading
int lightValue = 0;            // Variable to store light sensor reading
bool gasLeakDetected = false;  // Flag for gas leak detection
bool ledOn = false;            // Flag for LED state
enum GasAlertLevel {
  NORMAL,
  WARNING,
  DANGER
};
GasAlertLevel gasAlertLevel = NORMAL;  // Current gas alert level

// Security system variables
float distance = 0.0;          // Distance measured by ultrasonic sensor
bool securityModeEnabled = false; // Flag for security mode status
bool personDetected = false;   // Flag for person detection
bool securityAlarmActive = false; // Flag for security alarm status
unsigned long personDetectionTime = 0; // Time when person was first detected
const unsigned long PERSON_DETECTION_THRESHOLD = 5000; // 5 seconds threshold for security alarm

// Gas sensor thresholds for different alert levels
#define GAS_WARNING_THRESHOLD 1000  // Lower threshold for initial warning
#define GAS_DANGER_THRESHOLD 1500   // Higher threshold for danger alarm

// Light sensor threshold for LED control
#define LIGHT_THRESHOLD 3000    // Threshold for MH-series sensor (adjust as needed)

// Password variables
char correctPassword[5] = "1234"; // 4-digit password + null terminator (changed from const to allow updates)
char enteredPassword[5] = "";           // Buffer to store entered password
int passwordIndex = 0;                  // Current position in password entry
bool doorOpen = false;                  // Door state
bool passwordChanged = false;           // Flag to indicate password was changed

// Timing variables
unsigned long lastUpdateTime = 0;
const unsigned long updateInterval = 2000; // Update every 2 seconds
unsigned long doorCloseTime = 0;
const unsigned long doorOpenDuration = 5000; // Door stays open for 5 seconds

// MQTT timing variables
unsigned long lastPublishTime = 0;
const unsigned long publishInterval = 2000; // Publish to MQTT every 2 seconds

// WiFi connection status
bool wifiConnected = false;
bool mqttConnected = false;

void checkPassword();
void resetPassword();
void updatePasswordDisplay();
void closeDoor();
void openDoor();
void readDHTSensor();
void readGasSensor();
void readLightSensor();
void updateDisplay();
void displayPasswordError();
void handleGasLeak();
void handleLightControl();

// Security system functions
void readUltrasonicSensor();
void handleSecuritySystem();
void toggleSecurityMode();
void triggerSecurityAlarm();
void stopSecurityAlarm();

// MQTT and WiFi functions
void setup_wifi();
void reconnect_mqtt();
void publishSensorData();
void mqtt_callback(char* topic, byte* payload, unsigned int length);

// Password management function
void changePassword(const char* newPassword);

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
    Serial.println("WiFi connection failed! Operating in offline mode.");
  }
}

// MQTT message callback function
void mqtt_callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived on topic: ");
  Serial.print(topic);
  Serial.print(". Message: ");
  
  // Convert payload to string for easier handling
  char message[length + 1];
  for (unsigned int i = 0; i < length; i++) {
    message[i] = (char)payload[i];
  }
  message[length] = '\0'; // Null-terminate the string
  
  Serial.println(message);
  
  // Check if this is a security control message
  if (strcmp(topic, security_control_topic) == 0) {
    // Handle security control message
    if (strcmp(message, "ON") == 0 && !securityModeEnabled) {
      // Turn security mode ON if it's currently OFF
      toggleSecurityMode();
      Serial.println("Security mode turned ON via MQTT");
      
      // Show security mode status on display
      display.clearDisplay();
      display.setTextSize(1);
      display.setCursor(0, 0);
      display.println("ESP32 Smart Home");
      display.drawLine(0, 10, display.width(), 10, SH110X_WHITE);
      
      display.setCursor(0, 25);
      display.setTextSize(2);
      display.println("SECURITY");
      display.println("ENABLED");
      display.display();
      delay(2000); // Show message for 2 seconds
      
      // Return to normal display
      updateDisplay();
    } 
    else if (strcmp(message, "OFF") == 0 && securityModeEnabled) {
      // Turn security mode OFF if it's currently ON
      toggleSecurityMode();
      Serial.println("Security mode turned OFF via MQTT");
      
      // Show security mode status on display
      display.clearDisplay();
      display.setTextSize(1);
      display.setCursor(0, 0);
      display.println("ESP32 Smart Home");
      display.drawLine(0, 10, display.width(), 10, SH110X_WHITE);
      
      display.setCursor(0, 25);
      display.setTextSize(2);
      display.println("SECURITY");
      display.println("DISABLED");
      display.display();
      delay(2000); // Show message for 2 seconds
      
      // Return to normal display
      updateDisplay();
    }
  }
  // Check if this is a password change message
  else if (strcmp(topic, password_control_topic) == 0) {
    // Parse JSON message
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, message);
    
    if (error) {
      Serial.print("deserializeJson() failed: ");
      Serial.println(error.c_str());
      return;
    }
    
    // Extract current and new password
    const char* currentPassword = doc["current_password"];
    const char* newPassword = doc["new_password"];
    
    // Verify current password is correct
    if (strcmp(currentPassword, correctPassword) == 0) {
      // Change the password
      changePassword(newPassword);
      
      // Show password changed message on display
      display.clearDisplay();
      display.setTextSize(1);
      display.setCursor(0, 0);
      display.println("ESP32 Smart Home");
      display.drawLine(0, 10, display.width(), 10, SH110X_WHITE);
      
      display.setCursor(0, 25);
      display.setTextSize(2);
      display.println("PASSWORD");
      display.println("CHANGED");
      display.display();
      delay(2000); // Show message for 2 seconds
      
      // Return to normal display
      updateDisplay();
    } else {
      Serial.println("Password change failed: Current password incorrect");
      
      // Show error message on display
      display.clearDisplay();
      display.setTextSize(1);
      display.setCursor(0, 0);
      display.println("ESP32 Smart Home");
      display.drawLine(0, 10, display.width(), 10, SH110X_WHITE);
      
      display.setCursor(0, 25);
      display.setTextSize(2);
      display.println("PASSWORD");
      display.println("ERROR");
      display.display();
      delay(2000); // Show message for 2 seconds
      
      // Return to normal display
      updateDisplay();
    }
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
      
      // Subscribe to the security control topic
      mqtt_client.subscribe(security_control_topic);
      Serial.print("Subscribed to topic: ");
      Serial.println(security_control_topic);
      
      // Subscribe to the password control topic
      mqtt_client.subscribe(password_control_topic);
      Serial.print("Subscribed to topic: ");
      Serial.println(password_control_topic);
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

// Function to publish sensor data to MQTT broker
void publishSensorData() {
  if (!mqttConnected || !wifiConnected) {
    return; // Skip if not connected to MQTT or WiFi
  }

  // Create a JSON document for the combined data
  StaticJsonDocument<400> jsonDoc;
  jsonDoc["temperature"] = temperature;
  jsonDoc["humidity"] = humidity;
  jsonDoc["gas_level"] = gasValue;
  jsonDoc["light_level"] = lightValue;
  jsonDoc["led_status"] = ledOn ? "ON" : "OFF";
  jsonDoc["gas_alert"] = gasLeakDetected ?
    (gasAlertLevel == DANGER ? "DANGER" : "WARNING") : "NORMAL";
  jsonDoc["door_status"] = doorOpen ? "OPEN" : "CLOSED";
  jsonDoc["security_mode"] = securityModeEnabled ? "ON" : "OFF";
  jsonDoc["security_alarm"] = securityAlarmActive ? "ON" : "OFF";
  jsonDoc["distance"] = distance;
  //jsonDoc["location"] = "mainhome"; // Add location tag to identify the source

  jsonDoc["timestamp"] = millis();

  // Serialize JSON to a string
  char jsonBuffer[400];
  serializeJson(jsonDoc, jsonBuffer);

  // Publish individual topics
  char tempStr[10];
  char humStr[10];
  char gasStr[10];
  char lightStr[10];
  char securityStr[10];

  dtostrf(temperature, 1, 2, tempStr);
  dtostrf(humidity, 1, 2, humStr);
  dtostrf(gasValue, 1, 0, gasStr);
  dtostrf(lightValue, 1, 0, lightStr);
  sprintf(securityStr, "%s", securityAlarmActive ? "ALARM" : (securityModeEnabled ? "ON" : "OFF"));

  mqtt_client.publish(temp_topic, tempStr);
  mqtt_client.publish(humidity_topic, humStr);
  mqtt_client.publish(gas_topic, gasStr);
  mqtt_client.publish(light_topic, lightStr);
  mqtt_client.publish(security_topic, securityStr);

  // Publish combined JSON data
  mqtt_client.publish(sensors_topic, jsonBuffer);

  Serial.println("Data published to MQTT broker");
}

void setup() {
  // Initialize serial communication for debugging
  Serial.begin(115200);
  // Initialize the DHT sensor
  dht.begin();
  Serial.println("DHT11 sensor initialized");
  // Initialize the OLED display
  display.begin(I2C_ADDRESS, true); // true = reset
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);
  display.println("ESP32 Smart Home");
  display.println("Initializing...");
  display.display();
  delay(2000);
  Serial.println("OLED display initialized");

  // Initialize the servo motor
  ESP32PWM::allocateTimer(0);
  doorServo.setPeriodHertz(50);    // Standard 50Hz servo
  doorServo.attach(SERVO_PIN, 500, 2400); // Adjust min/max pulse width if needed
  doorServo.write(0);              // Initial position - door closed
  Serial.println("Servo motor initialized");

  // Initialize the gas sensor and buzzer pins
  pinMode(MQ135_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, HIGH);  // Ensure buzzer is off at startup
  Serial.println("Gas sensor and buzzer initialized");

  // Initialize the light sensor and LED pins
  pinMode(LIGHT_SENSOR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);      // Ensure LED is off at startup
  Serial.println("Light sensor and LED initialized");

  // Initialize the HC-SR04 ultrasonic sensor and security buzzer pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(SECURITY_BUZZER_PIN, OUTPUT);
  digitalWrite(SECURITY_BUZZER_PIN, HIGH); // Ensure security buzzer is off at startup
  Serial.println("Ultrasonic sensor and security buzzer initialized");

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

  // Display welcome message
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("ESP32 Smart Home");
  display.println("System Ready");
}

void loop() {
  mqtt_client.loop();
  // Check if it's time to update the readings
  unsigned long currentTime = millis();

  // Check for keypad input
  char key = keypad.getKey();

  // If a key is pressed
  if (key) {
    Serial.print("Key pressed: ");
    Serial.println(key);

    // Handle different key types
    if (key >= '0' && key <= '9' || key == '*' || key == '#' || key >= 'A' && key <= 'D') {
      // Handle password entry
      if (key == '#') {
        // # is the enter/confirm key
        checkPassword();
      }
      else if (key == '*') {
        // * is the clear key
        resetPassword();
      }
      else if (key == 'D') {
        // D is used to toggle security mode
        toggleSecurityMode();
        
        // Show security mode status on display
        display.clearDisplay();
        display.setTextSize(1);
        display.setCursor(0, 0);
        display.println("ESP32 Smart Home");
        display.drawLine(0, 10, display.width(), 10, SH110X_WHITE);
        
        display.setCursor(0, 25);
        display.setTextSize(2);
        display.println("SECURITY");
        display.println(securityModeEnabled ? "ENABLED" : "DISABLED");
        display.display();
        delay(2000); // Show message for 2 seconds
        
        // Return to normal display
        updateDisplay();
      }
      else if (passwordIndex < 4) {
        // Add digit to password
        enteredPassword[passwordIndex] = key;
        passwordIndex++;
        enteredPassword[passwordIndex] = '\0'; // Null terminate

        // Update display with asterisks for entered password
        updatePasswordDisplay();
      }
    }
  }

  // Check if door needs to be closed after timeout
  if (doorOpen && (currentTime - doorCloseTime >= doorOpenDuration)) {
    closeDoor();
  }

  // Check if it's time to update the sensor readings
  if (currentTime - lastUpdateTime >= updateInterval) {
    lastUpdateTime = currentTime;

    // Read data from DHT11 sensor
    readDHTSensor();

    // Read data from MQ135 gas sensor
    readGasSensor();

    // Read data from light sensor
    readLightSensor();
    
    // Read data from ultrasonic sensor
    readUltrasonicSensor();

    // Handle gas leak if detected
    handleGasLeak();

    // Handle LED control based on light level
    handleLightControl();
    
    // Handle security system if enabled
    if (securityModeEnabled) {
      handleSecuritySystem();
    }

    // Only update the display if not in password entry mode
    if (!doorOpen && !passwordIndex) {
      updateDisplay();
    }
  }
  
  // Check if it's time to publish data to MQTT
  if (currentTime - lastPublishTime >= publishInterval) {
    lastPublishTime = currentTime;
    
    // Publish sensor data to MQTT broker
    publishSensorData();
  }
}

void readDHTSensor() {
  // Reading temperature and humidity can take up to 250ms
  humidity = dht.readHumidity();
  temperature = dht.readTemperature(); // Read temperature in Celsius

  // Check if any reads failed and exit early (to try again)
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
}

// Function to read gas sensor value
void readGasSensor() {
  // Read the analog value from MQ135 sensor
  gasValue = analogRead(MQ135_PIN);
  Serial.print("Gas sensor value: ");
  Serial.println(gasValue);

  // Check if gas value exceeds thresholds and set appropriate alert level
  if (gasValue > GAS_DANGER_THRESHOLD) {
    gasLeakDetected = true;
    gasAlertLevel = DANGER;
    Serial.println("DANGER: Critical gas concentration detected!");
  } else if (gasValue > GAS_WARNING_THRESHOLD) {
    gasLeakDetected = true;
    gasAlertLevel = WARNING;
    Serial.println("WARNING: Elevated gas concentration detected!");
  } else {
    gasLeakDetected = false;
    gasAlertLevel = NORMAL;
    Serial.println("Gas concentration normal");
  }
}

// Function to handle gas leak with different alarm patterns based on concentration
void handleGasLeak() {
  static unsigned long lastBuzzerToggle = 0;
  static bool buzzerState = false;
  static GasAlertLevel previousAlertLevel = NORMAL;
  unsigned long currentMillis = millis();

  // Check if alert level has changed
  if (previousAlertLevel != gasAlertLevel) {
    // Handle state transitions
    if (gasAlertLevel == DANGER) {
      // When entering DANGER state, turn buzzer on continuously
      digitalWrite(BUZZER_PIN, LOW); // Turn buzzer ON
      buzzerState = true;
      Serial.println("DANGER: Continuous alarm activated!");
    } else if (gasAlertLevel == NORMAL) {
      // When returning to NORMAL state, ensure buzzer is turned off
      digitalWrite(BUZZER_PIN, HIGH); // Turn buzzer OFF
      buzzerState = false;
      Serial.println("Gas level normal: Alarm deactivated");
    }
    previousAlertLevel = gasAlertLevel;
  }

  // Handle different alarm patterns based on gas alert level
  switch (gasAlertLevel) {
    case DANGER:
      // Critical level - continuous buzzer (always ON)
      // Buzzer is already turned ON when entering this state
      // No need to toggle, keep it ON continuously
      break;

    case WARNING:
      // Warning level - slower beeping (500ms intervals)
      if (currentMillis - lastBuzzerToggle >= 500) {
        lastBuzzerToggle = currentMillis;
        buzzerState = !buzzerState;
        digitalWrite(BUZZER_PIN, buzzerState);
      }
      break;

    case NORMAL:
    default:
      // No gas leak detected - ensure buzzer is off
      // Always force the buzzer off in normal state regardless of previous state
      digitalWrite(BUZZER_PIN, HIGH);
      buzzerState = false;
      break;
  }
}

// Function to read light sensor value
void readLightSensor() {
  // Read the analog value from MH-series light sensor
  // MH-series sensors typically output lower values in brighter light
  lightValue = analogRead(LIGHT_SENSOR_PIN);
  Serial.print("Light sensor value (MH-series): ");
  Serial.println(lightValue);
}

// Function to handle LED control based on light level
void handleLightControl() {
  // MH-series sensors typically output higher values in darkness
  // and lower values in bright light (inverted compared to some LDRs)
  if (lightValue > LIGHT_THRESHOLD) {
    if (!ledOn) {
      digitalWrite(LED_PIN, HIGH);
      ledOn = true;
      Serial.println("LED turned ON - low light detected");
    }
  } else {
    // Otherwise, turn off LED
    if (ledOn) {
      digitalWrite(LED_PIN, LOW);
      ledOn = false;
      Serial.println("LED turned OFF - sufficient light detected");
    }
  }
}

void updateDisplay() {
  // Clear the display
  display.clearDisplay();

  // Display title
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("ESP32 Smart Home");
  display.drawLine(0, 10, display.width(), 10, SH110X_WHITE);

  // Display temperature
  display.setCursor(0, 12);
  display.setTextSize(1);
  display.print("Temperature:");
  display.setCursor(70, 12);
  display.print(temperature, 1);
  display.print(" C");

  // Display humidity
  display.setCursor(0, 22);
  display.setTextSize(1);
  display.print("Humidity:");
  display.setCursor(70, 22);
  display.print(humidity, 1);
  display.print(" %");

  // Display gas level
  display.setCursor(0, 32);
  display.setTextSize(1);
  display.print("Gas Level:");
  display.setCursor(70, 32);
  display.print(gasValue);

  // Display light level and night light status
  // display.setCursor(0, 42);
  // display.setTextSize(1);
  // display.print("Light:");
  // display.setCursor(70, 42);
  // display.print(lightValue);
  // display.print(" ");
  // display.print(ledOn ? "LED:ON" : "LED:OFF");

  // Display gas status with different warning levels
  display.setCursor(0, 42);
  display.setTextSize(1);
  switch (gasAlertLevel) {
    case DANGER:
      display.println("GAS LEAK! DANGER!");
      break;

    case WARNING:
      display.println("WARNING! Gas high");
      break;

    case NORMAL:
    default:
      display.println("Gas Status: Normal");
      break;
  }
  
  // Display security mode status
  display.setCursor(0, 52);
  display.setTextSize(1);
  if (securityAlarmActive) {
    display.println("SECURITY ALARM!");
  } else {
    display.print("Security: ");
    display.println(securityModeEnabled ? "ON" : "OFF");
  }

  // Update the display
  display.display();
}

// Function to check if entered password is correct
void checkPassword() {
  Serial.print("Checking password: ");
  Serial.println(enteredPassword);

  // Compare entered password with correct password
  if (strcmp(enteredPassword, correctPassword) == 0) {
    Serial.println("Password correct!");
    openDoor();
  } else {
    Serial.println("Password incorrect!");
    displayPasswordError();
    resetPassword();
  }
}

// Function to reset password entry
void resetPassword() {
  Serial.println("Password reset");
  passwordIndex = 0;
  memset(enteredPassword, 0, sizeof(enteredPassword));
  updatePasswordDisplay();
}

// Function to update password display
void updatePasswordDisplay() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("ESP32 Smart Home");
  display.drawLine(0, 10, display.width(), 10, SH110X_WHITE);

  display.setCursor(0, 20);
  display.println("Enter Password:");
  display.setCursor(0, 35);
  display.setTextSize(2);

  // Display asterisks for entered password digits
  for (int i = 0; i < passwordIndex; i++) {
    display.print("*");
  }

  display.display();
}

// Function to display password error message
void displayPasswordError() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("ESP32 Smart Home");
  display.drawLine(0, 10, display.width(), 10, SH110X_WHITE);

  display.setCursor(0, 25);
  display.setTextSize(2);
  display.println("WRONG");
  display.println("PASSWORD!");
  display.display();
  delay(2000); // Show error message for 2 seconds
}

// Function to change the door password
void changePassword(const char* newPassword) {
  // Validate new password (must be 4 digits)
  if (strlen(newPassword) != 4) {
    Serial.println("Password change failed: New password must be 4 digits");
    return;
  }
  
  // Check if new password contains only digits
  for (int i = 0; i < 4; i++) {
    if (newPassword[i] < '0' || newPassword[i] > '9') {
      Serial.println("Password change failed: New password must contain only digits");
      return;
    }
  }
  
  // Update the password
  strncpy(correctPassword, newPassword, 4);
  correctPassword[4] = '\0'; // Ensure null termination
  
  // Set flag to indicate password was changed
  passwordChanged = true;
  
  Serial.print("Password changed to: ");
  Serial.println(correctPassword);
}

// Function to open the door
void openDoor() {
  doorOpen = true;
  doorCloseTime = millis();

  // Move servo to open position (90 degrees)
  doorServo.write(90);

  // Display door open message
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("ESP32 Smart Home");
  display.drawLine(0, 10, display.width(), 10, SH110X_WHITE);

  display.setCursor(0, 25);
  display.setTextSize(2);
  display.println("DOOR");
  display.println("OPENED!");
  display.display();

  Serial.println("Door opened");
}

// Function to close the door
void closeDoor() {
  doorOpen = false;

  // Move servo to closed position (0 degrees)
  doorServo.write(0);

  // Reset password entry
  resetPassword();

  Serial.println("Door closed");
}

// Function to read distance from HC-SR04 ultrasonic sensor
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
  distance = duration * 0.0343 / 2;
  
  // Ignore obviously invalid readings
  if (distance > 400 || distance < 2) {
    Serial.println("Invalid distance reading, ignoring");
    return; // Keep previous distance value
  }
  
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");
}

// Function to handle security system
void handleSecuritySystem() {
  // Define the distance threshold for person detection (adjust as needed)
  const float PERSON_DISTANCE_THRESHOLD = 100.0; // cm
  
  // Check if a person is detected (distance less than threshold)
  if (distance < PERSON_DISTANCE_THRESHOLD) {
    if (!personDetected) {
      // First time detecting a person
      personDetected = true;
      personDetectionTime = millis();
      Serial.println("Person detected at door, starting timer");
    } else {
      // Person has been detected before, check if they've been there for 5 seconds
      unsigned long currentTime = millis();
      if (!securityAlarmActive && (currentTime - personDetectionTime >= PERSON_DETECTION_THRESHOLD)) {
        // Person has been at the door for 5 seconds, trigger alarm
        triggerSecurityAlarm();
      }
    }
  } else {
    // No person detected, reset detection flag and timer
    if (personDetected) {
      personDetected = false;
      Serial.println("Person no longer detected");
      
      // Stop the alarm automatically when person moves away
      if (securityAlarmActive) {
        Serial.println("Person moved away - stopping security alarm");
        stopSecurityAlarm();
      }
    }
  }
}

// Function to toggle security mode on/off
void toggleSecurityMode() {
  securityModeEnabled = !securityModeEnabled;
  
  if (securityModeEnabled) {
    Serial.println("Security mode enabled");
    // Reset any active alarms when enabling security mode
    if (securityAlarmActive) {
      stopSecurityAlarm();
    }
  } else {
    Serial.println("Security mode disabled");
    // Stop any active alarms when disabling security mode
    if (securityAlarmActive) {
      stopSecurityAlarm();
    }
  }
}

// Function to trigger security alarm
void triggerSecurityAlarm() {
  securityAlarmActive = true;
  Serial.println("SECURITY ALARM TRIGGERED!");
  // Buzzer will be controlled in the main loop
  digitalWrite(SECURITY_BUZZER_PIN, LOW); // Turn on security buzzer
}

// Function to stop security alarm
void stopSecurityAlarm() {
  securityAlarmActive = false;
  Serial.println("Security alarm stopped");
  digitalWrite(SECURITY_BUZZER_PIN, HIGH); // Turn off security buzzer
}