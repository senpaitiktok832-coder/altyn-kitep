import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#F5B700' },
        headerTintColor: '#3A2A00',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
  );
}