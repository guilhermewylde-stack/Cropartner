import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

/** Grava o backup num arquivo temporário e abre a folha de compartilhamento (Arquivos, WhatsApp, AirDrop…). */
export async function shareBackup(fileName: string, json: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  await file.write(json);
  if (!(await Sharing.isAvailableAsync())) throw new Error('O compartilhamento não está disponível neste aparelho.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Salvar ou enviar o backup' });
}

/**
 * Escolhe um arquivo de backup pelos Arquivos e devolve o texto (null se cancelou). Aceita qualquer
 * tipo: o WhatsApp e o iCloud às vezes trocam o tipo do .json, e a validação vem depois.
 */
export async function pickBackupText(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (res.canceled || !res.assets[0]) return null;
  return new File(res.assets[0].uri).text();
}
