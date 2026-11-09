import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Cropartner' }} />
        <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
        <Stack.Screen name="project/[id]/index" options={{ title: 'Projeto' }} />
        <Stack.Screen name="project/[id]/recipe" options={{ title: 'Receita' }} />
        <Stack.Screen name="project/[id]/grid-setup" options={{ title: 'Criar grid' }} />
        <Stack.Screen name="project/[id]/grid" options={{ title: 'Grid' }} />
        <Stack.Screen name="project/[id]/yarn" options={{ title: 'Cálculo de linha' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
