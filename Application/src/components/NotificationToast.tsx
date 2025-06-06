import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import notificationService, {
  NotificationData,
} from "../services/NotificationService";

const NotificationToast: React.FC = () => {
  const [notification, setNotification] = useState<NotificationData | null>(
    null
  );
  const [visible, setVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Subscribe to notifications
    const subscription = notificationService.notifications$.subscribe(
      (data) => {
        if (data.id.startsWith("dismiss_")) {
          // Handle dismiss notification
          hideNotification();
        } else {
          // Show new notification
          setNotification(data);
          showNotification();

          // Auto-hide after duration
          const timer = setTimeout(() => {
            hideNotification();
          }, data.duration || 5000);

          return () => clearTimeout(timer);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const showNotification = () => {
    setVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideNotification = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setNotification(null);
    });
  };

  if (!visible || !notification) {
    return null;
  }

  // Determine background color based on notification type
  const getBackgroundColor = () => {
    switch (notification.type) {
      case "success":
        return "#4CD964"; // Green
      case "warning":
        return "#FFCC00"; // Yellow
      case "danger":
        return "#FF3B30"; // Red
      case "info":
      default:
        return "#007AFF"; // Blue
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor(), opacity: fadeAnim },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={notification.icon || "information-circle"}
            size={24}
            color="white"
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.message}>{notification.message}</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={hideNotification}>
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  content: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  message: {
    color: "white",
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 5,
  },
});

export default NotificationToast;
