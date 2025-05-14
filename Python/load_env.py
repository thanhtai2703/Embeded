#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Environment Variable Loader

This module loads environment variables from a .env file.
It can be imported by other scripts to ensure consistent configuration.
"""

import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def load_env(env_file=".env"):
    """
    Load environment variables from a .env file
    
    Args:
        env_file (str): Path to the .env file
        
    Returns:
        bool: True if the file was loaded successfully, False otherwise
    """
    try:
        env_path = Path(env_file)
        if not env_path.exists():
            logger.warning(f".env file not found at {env_path.absolute()}")
            return False
        
        logger.info(f"Loading environment variables from {env_path.absolute()}")
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue
                
                # Parse key-value pairs
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    
                    # Don't override existing environment variables
                    if key not in os.environ:
                        os.environ[key] = value
                        logger.debug(f"Set environment variable: {key}")
        
        return True
    except Exception as e:
        logger.error(f"Error loading .env file: {e}")
        return False

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Load environment variables
    load_env()
    
    # Print loaded environment variables
    logger.info("Loaded environment variables:")
    for key, value in os.environ.items():
        if key in [
            "MQTT_BROKER", "MQTT_PORT", "MQTT_USERNAME", "MQTT_TOPICS", "MQTT_QOS",
            "INFLUXDB_URL", "INFLUXDB_ORG", "INFLUXDB_BUCKET",
            "PUBLISH_INTERVAL"
        ]:
            # Mask password and token for security
            if key in ["MQTT_PASSWORD", "INFLUXDB_TOKEN"]:
                logger.info(f"  {key}=****")
            else:
                logger.info(f"  {key}={value}")