import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LicensePlateScanner from './LicensePlateScanner';
import RegistrationScreen from './RegistrationScreen';
import AdminLoginScreen from './AdminLoginScreen';
import AdminScreen from './AdminScreen';
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Registration">
        <Stack.Screen 
          name="Registration" 
          component={RegistrationScreen} 
          options={{ title: 'Vehicle Registration' }}
        />
        <Stack.Screen 
          name="AdminLogin"
          component={AdminLoginScreen}
          options={{ title: 'Admin Login' }}
        />
        <Stack.Screen 
          name="Admin" 
          component={AdminScreen} 
          options={{ title: 'Admin Vehicle Search' }}
        />
        <Stack.Screen 
          name="PlateScanner" 
          component={LicensePlateScanner} 
          options={{ title: 'Scan License Plate' }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
