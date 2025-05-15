#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
EMQX Cloud to InfluxDB Data Transfer

This script connects to an EMQX MQTT broker, subscribes to specified topics,
and forwards the received data to an InfluxDB database.
"""

import logging
import os
import json
import time
from datetime import datetime
from typing import Dict, Any

import paho.mqtt.client as mqtt
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Configuration
class Config:
    # MQTT Configuration (EMQX Cloud)
    MQTT_BROKER = os.getenv("MQTT_BROKER", "b5619a98.ala.asia-southeast1.emqxsl.com")
    MQTT_PORT = int(os.getenv("MQTT_PORT", 8883))
    MQTT_USERNAME = os.getenv("MQTT_USERNAME", "thanhtai")
    MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "thanhtai")
    MQTT_CLIENT_ID = os.getenv("MQTT_CLIENT_ID", f"python-mqtt-{int(time.time())}")
    MQTT_TOPIC = os.getenv("MQTT_TOPIC", "sensors/all/room1")
    MQTT_QOS = int(os.getenv("MQTT_QOS", 0))
    MQTT_CA_CERT = os.getenv("MQTT_CA_CERT", "C:\\Users\\taith\\Downloads\\emqxsl-ca.crt")

    # InfluxDB Configuration
    INFLUXDB_URL = os.getenv("INFLUXDB_URL", "https://us-east-1-1.aws.cloud2.influxdata.com")
    INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN",
                               "_8nfCZ3FNhXZKoexUIQVQG10wVg7Hkmq6ZbAEEE2-NMwHfC-bX3xofJEaySvgAF5mEr30Ba_TqLaKZQUcYs78Q==")
    INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "Embeded")
    INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "DHT11")


class EMQXToInfluxDB:
    def __init__(self, config: Config):
        self.config = config
        self.mqtt_client = None
        self.influxdb_client = None
        self.write_api = None
        self.connected_to_mqtt = False
        self.connected_to_influxdb = False

    def setup_mqtt(self):
        try:
            self.mqtt_client = mqtt.Client(client_id=self.config.MQTT_CLIENT_ID)
            self.mqtt_client.on_connect = self.on_connect
            self.mqtt_client.on_message = self.on_message
            self.mqtt_client.on_disconnect = self.on_disconnect

            # Enable TLS/SSL with CA certificate
            self.mqtt_client.tls_set(ca_certs=self.config.MQTT_CA_CERT)
            self.mqtt_client.tls_insecure_set(False)

            if self.config.MQTT_USERNAME and self.config.MQTT_PASSWORD:
                self.mqtt_client.username_pw_set(self.config.MQTT_USERNAME, self.config.MQTT_PASSWORD)

            logger.info(f"Connecting to MQTT broker at {self.config.MQTT_BROKER}:{self.config.MQTT_PORT}")
            self.mqtt_client.connect(self.config.MQTT_BROKER, self.config.MQTT_PORT, 60)
            return True
        except Exception as e:
            logger.error(f"Failed to set up MQTT client: {e}")
            return False

    def setup_influxdb(self):
        try:
            self.influxdb_client = InfluxDBClient(
                url=self.config.INFLUXDB_URL,
                token=self.config.INFLUXDB_TOKEN,
                org=self.config.INFLUXDB_ORG
            )
            self.write_api = self.influxdb_client.write_api(write_options=SYNCHRONOUS)
            logger.info("Successfully connected to InfluxDB Cloud")
            self.connected_to_influxdb = True
            return True
        except Exception as e:
            logger.error(f"Failed to set up InfluxDB client: {e}")
            return False

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info(f"Connected to MQTT broker successfully at {self.config.MQTT_BROKER}:{self.config.MQTT_PORT}")
            self.connected_to_mqtt = True
            client.subscribe(self.config.MQTT_TOPIC, self.config.MQTT_QOS)
            logger.info(f"Subscribed to topic: {self.config.MQTT_TOPIC}")
        else:
            logger.error(f"Failed to connect to MQTT broker with code {rc}")

    def on_disconnect(self, client, userdata, rc):
        logger.warning(f"Disconnected from MQTT broker with code {rc}")
        self.connected_to_mqtt = False

    def on_message(self, client, userdata, msg):
        try:
            logger.debug(f"Received message on topic {msg.topic}: {msg.payload}")
            # Parse the JSON payload
            payload_str = msg.payload.decode('utf-8')
            payload_data = json.loads(payload_str)
            
            # Extract data from the JSON payload
            temperature = payload_data.get('temperature')
            humidity = payload_data.get('humidity')
            unit = payload_data.get('unit', 'celsius')
            timestamp = payload_data.get('timestamp')
            
            logger.info(f"Processed data: Temperature={temperature}°{unit}, Humidity={humidity}%")
            
            # Write temperature data
            if temperature is not None:
                # Convert temperature to float to ensure consistent data type
                temp_data = {"value": float(temperature)}
                self.write_to_influxdb("temperature", {"device": "ESP32", "unit": unit}, temp_data)
            
            # Write humidity data
            if humidity is not None:
                # Convert humidity to float to ensure consistent data type
                humidity_data = {"value": float(humidity)}
                self.write_to_influxdb("humidity", {"device": "ESP32"}, humidity_data)
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            logger.error(f"Payload was: {msg.payload}")

    def write_to_influxdb(self, measurement: str, tags: Dict[str, str], fields: Dict[str, Any]):
        if not self.connected_to_influxdb:
            logger.warning("Not connected to InfluxDB, skipping write")
            return
        try:
            point = Point(measurement)
            for tag_key, tag_value in tags.items():
                point = point.tag(tag_key, tag_value)
            for field_key, field_value in fields.items():
                if isinstance(field_value, (int, float)):
                    # Convert all numeric values to float to ensure consistent data types
                    point = point.field(field_key, float(field_value))
                else:
                    point = point.field(field_key, str(field_value))
            point = point.time(datetime.utcnow(), WritePrecision.NS)
            self.write_api.write(bucket=self.config.INFLUXDB_BUCKET, org=self.config.INFLUXDB_ORG, record=point)
            logger.debug(f"Successfully wrote data to InfluxDB: {measurement}")
        except Exception as e:
            logger.error(f"Error writing to InfluxDB: {e}")

    def run(self):
        if not self.setup_mqtt():
            logger.error("Failed to set up MQTT client, exiting")
            return
        if not self.setup_influxdb():
            logger.error("Failed to set up InfluxDB client, exiting")
            return
        self.mqtt_client.loop_start()

        try:
            while True:
                time.sleep(10)  # Keep the script running
        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt, shutting down")
        finally:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
            if self.influxdb_client:
                self.influxdb_client.close()
            logger.info("Shutdown complete")


def main():
    config = Config()
    emqx_to_influxdb = EMQXToInfluxDB(config)
    emqx_to_influxdb.run()


if __name__ == "__main__":
    main()