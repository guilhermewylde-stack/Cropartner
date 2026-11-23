import * as DocumentPicker from 'expo-document-picker';

/** Build web (só para testes e capturas): baixa o arquivo em vez de abrir a folha de compartilhamento. */
export async function shareBackup(fileName: string, json: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function pickBackupText(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*' });
  if (res.canceled || !res.assets[0]) return null;
  const asset = res.assets[0];
  return asset.file ? asset.file.text() : (await fetch(asset.uri)).text();
}
