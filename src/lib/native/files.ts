import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { fromByteArray } from 'base64-js';
import type { SourceFile } from '../types';
import type { AISource } from '../ai';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function projectDir(projectId: string): Directory {
  const dir = new Directory(Paths.document, 'projects', projectId);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function kindOf(mime: string, name: string): 'image' | 'pdf' | null {
  if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic)$/i.test(name)) return 'image';
  return null;
}

function guessMime(name: string, mime?: string | null): string {
  if (mime) return mime;
  const n = name.toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

/** Copia o arquivo escolhido para a pasta do projeto, para não depender do cache do sistema. */
function persist(projectId: string, uri: string, name: string, mime: string, size?: { width?: number; height?: number }): SourceFile | null {
  const kind = kindOf(mime, name);
  if (!kind) return null;
  const id = uid();
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : kind === 'pdf' ? '.pdf' : '.jpg';
  const dest = new File(projectDir(projectId), `${id}${ext}`);
  new File(uri).copySync(dest);
  return { id, uri: dest.uri, name, kind, mimeType: mime, width: size?.width, height: size?.height };
}

/** Importa PDFs e imagens pelos Arquivos do sistema. */
export async function pickDocuments(projectId: string): Promise<SourceFile[]> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (res.canceled) return [];
  return res.assets
    .map((a) => persist(projectId, a.uri, a.name, guessMime(a.name, a.mimeType)))
    .filter((x): x is SourceFile => x !== null);
}

/** Importa imagens da galeria (prints de receitas, fotos de gráficos). */
export async function pickImages(projectId: string): Promise<SourceFile[]> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 1 });
  if (res.canceled) return [];
  return res.assets
    .map((a) => persist(projectId, a.uri, a.fileName ?? 'imagem.jpg', guessMime(a.fileName ?? 'imagem.jpg', a.mimeType), a))
    .filter((x): x is SourceFile => x !== null);
}

/** Fotografa a receita ou o gráfico. */
export async function takePhoto(projectId: string): Promise<SourceFile[]> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Permita o acesso à câmera para fotografar a receita.');
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (res.canceled) return [];
  return res.assets
    .map((a) => persist(projectId, a.uri, a.fileName ?? 'foto.jpg', guessMime(a.fileName ?? 'foto.jpg', a.mimeType), a))
    .filter((x): x is SourceFile => x !== null);
}

export function deleteSourceFile(s: SourceFile) {
  try {
    const f = new File(s.uri);
    if (f.exists) f.delete();
  } catch {
    // arquivo já removido
  }
}

export function deleteProjectFiles(projectId: string) {
  try {
    const dir = new Directory(Paths.document, 'projects', projectId);
    if (dir.exists) dir.delete();
  } catch {
    // ignora
  }
}

export async function readBase64(uri: string): Promise<string> {
  const bytes = await new File(uri).bytes();
  return fromByteArray(bytes);
}

/** Prepara os arquivos para envio à IA (imagens grandes são reduzidas para economizar). */
export async function toAISources(sources: SourceFile[], prepareImage: (s: SourceFile) => Promise<{ base64: string; mediaType: string }>): Promise<AISource[]> {
  const out: AISource[] = [];
  for (const s of sources) {
    if (s.kind === 'pdf') out.push({ kind: 'pdf', mediaType: 'application/pdf', base64: await readBase64(s.uri), name: s.name });
    else out.push({ kind: 'image', name: s.name, ...(await prepareImage(s)) });
  }
  return out;
}
