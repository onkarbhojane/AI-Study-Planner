import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import App from "./components/App.jsx";
import AIPlanner from "./components/AIPlanner.jsx";

const Stack = createNativeStackNavigator();

export default function Index() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>  
      <Stack.Screen name="App" component={App} />
      <Stack.Screen name="AIPlanner" component={AIPlanner} />
    </Stack.Navigator>
  );
}
