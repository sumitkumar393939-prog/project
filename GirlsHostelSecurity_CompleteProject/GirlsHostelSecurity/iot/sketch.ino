#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// Wokwi public gateway Wi-Fi
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// Replace with your deployed backend URL.
// Example: https://your-api.example.com/api/events
const char* BACKEND_URL = "https://YOUR-BACKEND-HOST/api/events";

// Must exactly match backend DEVICE_TOKEN.
const char* DEVICE_TOKEN = "REPLACE_WITH_DEVICE_TOKEN";

const int BUTTON_PIN = 4;
const int LED_PIN = 2;

int previousButtonState = HIGH;
unsigned long lastSentAt = 0;
const unsigned long debounceMs = 50;
const unsigned long cooldownMs = 3000;

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
  Serial.print("Connecting to Wokwi WiFi");
  unsigned long started = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - started < 20000) {
    delay(400);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection timed out");
  }
}

void sendDemoEvent() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi unavailable; event was not sent");
    return;
  }

  WiFiClientSecure client;

  // DEMO ONLY: Wokwi classroom shortcut.
  // This disables TLS certificate validation. Do not use this
  // setting for real devices or a real security deployment.
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(10000);

  if (!http.begin(client, BACKEND_URL)) {
    Serial.println("Could not start HTTPS request");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);

  String payload =
    "{\"deviceId\":\"GATE-01\","
    "\"eventType\":\"GATE_SENSOR_TEST\","
    "\"status\":\"ALERT\","
    "\"source\":\"WOKWI\"}";

  int code = http.POST(payload);

  Serial.print("HTTP response: ");
  Serial.println(code);

  if (code > 0) {
    Serial.println(http.getString());
  } else {
    Serial.println("Request failed. Check URL, deployment and WiFi.");
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  connectWiFi();

  Serial.println("Ready. Press the virtual button to send a demo event.");
}

void loop() {
  int currentState = digitalRead(BUTTON_PIN);

  if (previousButtonState == HIGH && currentState == LOW) {
    if (millis() - lastSentAt >= cooldownMs) {
      Serial.println("Simulated gate sensor event");
      digitalWrite(LED_PIN, HIGH);
      sendDemoEvent();
      lastSentAt = millis();
      delay(250);
      digitalWrite(LED_PIN, LOW);
    } else {
      Serial.println("Please wait before sending another test event");
    }
  }

  previousButtonState = currentState;
  delay(debounceMs);
}
