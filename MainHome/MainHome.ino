#include <Wire.h>              // For I2C communication
#include <Adafruit_GFX.h>      // Graphics library
#include <Adafruit_SH110X.h>   // SH1106 OLED display library
#include <DHT.h>               // DHT sensor library
#include <Keypad.h>            // Keypad library
#include <ESP32Servo.h>        // Servo library for ESP32

// Pin definitions
#define DHT_PIN 4              // DHT11 data pin
#define DHT_TYPE DHT11         // DHT sensor type
#define OLED_RESET -1          // Reset pin (or -1 if sharing Arduino reset pin)
#define I2C_ADDRESS 0x3C       // I2C address for the OLED display (typical: 0x3C)
#define SERVO_PIN 13           // Servo motor control pin
#define MQ135_PIN 34           // MQ135 gas sensor analog pin
#define BUZZER_PIN 5           // Buzzer pin for gas leak alert

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
byte colPins[COL_NUM] = {27, 14, 12, 15}; // Connect to the column pinouts of the keypad

// Initialize the OLED display
Adafruit_SH1106G display = Adafruit_SH1106G(128, 64, &Wire, OLED_RESET);

// Initialize the DHT sensor
DHT dht(DHT_PIN, DHT_TYPE);

// Initialize the keypad
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROW_NUM, COL_NUM);

// Initialize the servo
Servo doorServo;

// Variables to store sensor readings
float temperature = 0.0;
float humidity = 0.0;
int gasValue = 0;              // Variable to store gas sensor reading
bool gasLeakDetected = false;  // Flag for gas leak detection
enum GasAlertLevel {
  NORMAL,
  WARNING,
  DANGER
};
GasAlertLevel gasAlertLevel = NORMAL;  // Current gas alert level
// Gas sensor thresholds for different alert levels
#define GAS_WARNING_THRESHOLD 1000  // Lower threshold for initial warning
#define GAS_DANGER_THRESHOLD 1500   // Higher threshold for danger alarm

// Password variables
const char correctPassword[5] = "1234"; // 4-digit password + null terminator
char enteredPassword[5] = "";           // Buffer to store entered password
int passwordIndex = 0;                  // Current position in password entry
bool doorOpen = false;                  // Door state

// Timing variables
unsigned long lastUpdateTime = 0;
const unsigned long updateInterval = 2000; // Update every 2 seconds
unsigned long doorCloseTime = 0;
const unsigned long doorOpenDuration = 5000; // Door stays open for 5 seconds

void checkPassword();
void resetPassword();
void updatePasswordDisplay();
void closeDoor();
void openDoor();
void readDHTSensor();
void readGasSensor();
void updateDisplay();
void displayPasswordError();
void handleGasLeak();

void setup() {
  // Initialize serial communication for debugging
  Serial.begin(115200);
  Serial.println("ESP32 Smart Home - DHT11, OLED SH1106, Keypad, Servo, and Gas Sensor Demo");
  
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
  
  // Display welcome message
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("ESP32 Smart Home");
  display.println("System Ready");
  display.println("\nEnter Password:");
  display.display();
  Serial.println("System ready");
}

void loop() {
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
    
    // Handle gas leak if detected
    handleGasLeak();
    
    // Only update the display if not in password entry mode
    if (!doorOpen && !passwordIndex) {
      updateDisplay();
    }
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
    // Reset buzzer state when transitioning between alert levels
    if (gasAlertLevel == NORMAL) {
      // Ensure buzzer is turned off when returning to normal state
      digitalWrite(BUZZER_PIN, HIGH);
      buzzerState = false;
    }
    previousAlertLevel = gasAlertLevel;
  }
  
  // Handle different alarm patterns based on gas alert level
  switch (gasAlertLevel) {
    case DANGER:
      // Critical level - rapid beeping (200ms intervals)
      if (currentMillis - lastBuzzerToggle >= 200) {
        lastBuzzerToggle = currentMillis;
        buzzerState = !buzzerState;
        digitalWrite(BUZZER_PIN, buzzerState);
      }
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
  // Display gas status with different warning levels
  display.setCursor(0, 45);
  display.setTextSize(1);
  switch (gasAlertLevel) {
    case DANGER:
      display.setTextSize(2);
      display.println("GAS LEAK!");
      display.setTextSize(1);
      display.println("CRITICAL DANGER!");
      break;
    case WARNING:
      display.setTextSize(2);
      display.println("WARNING!");
      display.setTextSize(1);
      display.println("Gas level elevated");
      break;
    case NORMAL:
    default:
      display.println("Gas Status: Normal");
      break;
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