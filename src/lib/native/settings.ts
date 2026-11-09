import * as SecureStore from 'expo-secure-store';

const KEY = 'anthropic_api_key';

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(value: string | null) {
  if (value && value.trim()) await SecureStore.setItemAsync(KEY, value.trim());
  else await SecureStore.deleteItemAsync(KEY);
}
