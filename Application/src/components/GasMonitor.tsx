import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface GasMonitorProps {
  gasLevel: number;
  gasAlertStatus: string;
}
const GasMonitor: React.FC<GasMonitorProps> = ({
  gasLevel,
  gasAlertStatus,
}) => {
  // Determine the status color and icon based on the gas alert status
  const getStatusColor = () => {
    switch (gasAlertStatus) {
      case "DANGER":
        return "#FF3B30"; // Red for danger
      case "WARNING":
        return "#FFCC00"; // Yellow for warning
      case "NORMAL":
      default:
        return "#4CD964"; // Green for normal
    }
  };

  const getStatusIcon = () => {
    switch (gasAlertStatus) {
      case "DANGER":
        return "warning";
      case "WARNING":
        return "alert-circle";
      case "NORMAL":
      default:
        return "checkmark-circle";
    }
  };

  const statusColor = getStatusColor();
  const statusIcon = getStatusIcon();

  return (
    <View style={styles.container}>
      <View style={[styles.statusIndicator, { backgroundColor: statusColor }]}>
        <Ionicons name={statusIcon} size={24} color="white" />
        <Text style={styles.statusText}>{gasAlertStatus}</Text>
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.gasLevelLabel}>Gas Level:</Text>
        <Text style={styles.gasLevelValue}>{gasLevel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 10,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  statusText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gasLevelLabel: {
    fontSize: 14,
    color: "#666",
  },
  gasLevelValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
});

export default GasMonitor;
