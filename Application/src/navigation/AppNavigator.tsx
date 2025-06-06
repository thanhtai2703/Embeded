import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeMenu from "../components/HomeMenu";
import TemperatureDetails from "../screens/TemperatureDetails";
import HumidityDetails from "../screens/HumidityDetails";
import LightsScreen from "../screens/LightsScreen";
import SecurityScreen from "../screens/SecurityScreen";
import PasswordScreen from "../screens/PasswordScreen";
import GarageSettingsScreen from "../screens/GarageSettingsScreen";

export type RootStackParamList = {
  Home: undefined;
  TemperatureDetails: undefined;
  HumidityDetails: undefined;
  Lights: undefined;
  Security: undefined;
  Password: undefined;
  GarageSettings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeMenu} />
        <Stack.Screen
          name="TemperatureDetails"
          component={TemperatureDetails}
        />
        <Stack.Screen name="HumidityDetails" component={HumidityDetails} />
        <Stack.Screen name="Lights" component={LightsScreen} />
        <Stack.Screen name="Security" component={SecurityScreen} />
        <Stack.Screen name="Password" component={PasswordScreen} />
        <Stack.Screen name="GarageSettings" component={GarageSettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
