#include <Wire.h>              // For I2C communication
#include <Adafruit_GFX.h>      // Graphics library
#include <Adafruit_SH110X.h>   // SH1106 OLED display library
#include <ESP32Servo.h>        // Servo library for ESP32

// Pin definitions
#define TRIG_PIN 5             // HC-SR04 trigger pin
#define ECHO_PIN 18            // HC-SR04 echo pin
#define SERVO_PIN 13           // Servo motor control pin
#define SLOT1_SENSOR_PIN 32    // FM52 sensor for parking slot 1
#define SLOT2_SENSOR_PIN 33    // FM52 sensor for parking slot 2
#define OLED_RESET -1          // Reset pin (or -1 if sharing Arduino reset pin)
#define I2C_ADDRESS 0x3C       // I2C address for the OLED display (typical: 0x3C)

// Constants
#define DISTANCE_THRESHOLD 30  // Distance threshold in cm to trigger door opening
#define DOOR_OPEN_ANGLE 90     // Angle for open door position
#define DOOR_CLOSED_ANGLE 0    // Angle for closed door position
#define DOOR_OPEN_TIME 5000    // Time to keep door open in milliseconds (minimum time)

// Initialize the OLED display
Adafruit_SH1106G display = Adafruit_SH1106G(128, 64, &Wire, OLED_RESET);

// Initialize the servo
Servo garageDoorServo;

// Variables
float distance = 0.0;          // Distance measured by ultrasonic sensor
float filteredDistance = 0.0;  // Filtered distance after debouncing
bool doorOpen = false;         // Door state
bool slot1Occupied = false;    // Parking slot 1 state
bool slot2Occupied = false;    // Parking slot 2 state
unsigned long doorOpenTime = 0; // Time when door was opened
unsigned long lastDistanceCheckTime = 0; // Last time distance was checked
const unsigned long distanceCheckInterval = 200; // Check distance every 200ms

bool vehicleDetected = false;                // Flag to indicate if vehicle is detected
unsigned long vehicleDetectionTime = 0;      // Time when vehicle was first detected
const unsigned long VEHICLE_DEBOUNCE_TIME = 1000; // Debounce time for vehicle detection

// Distance filtering variables
const int DISTANCE_SAMPLES = 5;              // Number of samples for distance averaging
float distanceSamples[DISTANCE_SAMPLES];     // Array to store distance samples
int sampleIndex = 0;                         // Current index in the samples array

// Function declarations
void readUltrasonicSensor();
void checkParkingSlots();
void openDoor();
void closeDoor();
void updateDisplay();

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 Automatic Garage System");
  
  // Initialize HC-SR04 pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  Serial.println("HC-SR04 sensor initialized");
  
  // Initialize FM52 sensor pins
  pinMode(SLOT1_SENSOR_PIN, INPUT);
  pinMode(SLOT2_SENSOR_PIN, INPUT);
  Serial.println("FM52 sensors initialized");
  
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
  
  // Check parking slots status - less frequently to reduce processing load
  static unsigned long lastSlotCheckTime = 0;
  if (currentTime - lastSlotCheckTime >= 500) { // Check every 500ms instead of every loop
    lastSlotCheckTime = currentTime;
    checkParkingSlots();
  }
  
  // Door control logic - prioritize this over display updates
  if (doorOpen && currentTime - doorOpenTime >= DOOR_OPEN_TIME) {
    if (filteredDistance > DISTANCE_THRESHOLD) {
      Serial.println("Minimum door open time elapsed. Closing door...");
      closeDoor();
    }
  }
  static unsigned long lastDisplayUpdate = 0;
  unsigned long displayUpdateInterval = 3000;
  if (currentTime - lastDisplayUpdate >= displayUpdateInterval) {
    lastDisplayUpdate = currentTime;
    updateDisplay();
  }
}
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
  Serial.print("Raw Distance: ");
  Serial.print(distance);
  Serial.print(" cm, Filtered: ");
  Serial.print(filteredDistance);
  Serial.println(" cm");
}
// Function to check if parking slots are occupied
void checkParkingSlots() {
  slot1Occupied = digitalRead(SLOT1_SENSOR_PIN) == LOW;
  slot2Occupied = digitalRead(SLOT2_SENSOR_PIN) == LOW;
  
  Serial.print("Slot 1: ");
  Serial.println(slot1Occupied ? "Occupied" : "Empty");
  Serial.print("Slot 2: ");
  Serial.println(slot2Occupied ? "Occupied" : "Empty");
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
bool lastDisplayedSlot1State = false;
bool lastDisplayedSlot2State = false;

// Function to update the OLED display
void updateDisplay() {
  // Check if any values have changed since last update
  bool stateChanged = (abs(lastDisplayedDistance - filteredDistance) > 0.5) || 
                      (lastDisplayedDoorState != doorOpen) || 
                      (lastDisplayedSlot1State != slot1Occupied) || 
                      (lastDisplayedSlot2State != slot2Occupied);
  
  static unsigned long lastFullUpdateTime = 0;
  unsigned long currentTime = millis();
  bool timeForFullUpdate = (currentTime - lastFullUpdateTime >= 10000); // Full refresh every 10 seconds
  
  if (stateChanged || timeForFullUpdate) {
    // Save current state for next comparison
    lastDisplayedDistance = filteredDistance;
    lastDisplayedDoorState = doorOpen;
    lastDisplayedSlot1State = slot1Occupied;
    lastDisplayedSlot2State = slot2Occupied;
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
    
    // Display parking slots status
    display.setCursor(0, 42);
    display.print("Slot 1: ");
    display.println(slot1Occupied ? "Occupied" : "Empty");
    
    display.setCursor(0, 52);
    display.print("Slot 2: ");
    display.println(slot2Occupied ? "Occupied" : "Empty");
    
    // Update the display
    display.display();
  }
}