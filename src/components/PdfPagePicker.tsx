import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { PdfHost, type PdfHostHandle } from './PdfHost';
import { Button, Muted } from './ui';
import { PDF_HTML, type PdfMessage } from '../lib/native/pdfHtml';
import { readBase64, saveJpegBase64 } from '../lib/native/files';
import { chunkBase64, pageImageName, pdfErrorMessage, renderScale, THUMB_LIMITS, type PageSize } from '../lib/pdf';
import type { SourceFile } from '../lib/types';
import { colors, space } from '../theme';

/** miniaturas pedidas por vez */
const BATCH = 12;
const COLUMNS = 3;
/** pedaços do PDF mandados ao renderizador, em caracteres de base64 */
const CHUNK = 256 * 1024;
const OPEN_TIMEOUT_MS = 45_000;

interface Props {
  pdf: SourceFile;
  projectId: string;
  /** a página escolhida, já salva como imagem na pasta do projeto */
  onPicked: (image: SourceFile) => void;
}

/**
 * Abre o PDF, mostra as páginas em miniatura e transforma a página tocada numa imagem.
 * Use com `key={pdf.id}`: cada PDF tem o seu renderizador.
 */
export function PdfPagePicker({ pdf, projectId, onPicked }: Props) {
  const win = useWindowDimensions();
  const host = useRef<PdfHostHandle>(null);
  const sizes = useRef<Record<number, PageSize>>({});
  const [pages, setPages] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  const [thumbs, setThumbs] = useState<Record<number, { uri: string; width: number; height: number }>>({});
  const [picking, setPicking] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const opening = pages === null && !error;
  useEffect(() => {
    if (!opening) return;
    const timer = setTimeout(() => setError(pdfErrorMessage('Timeout')), OPEN_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [opening]);

  const run = (js: string) => host.current?.run(js);

  const showMore = (total: number, from: number) => {
    const to = Math.min(total, from + BATCH - 1);
    if (to < from) return;
    setShown(to);
    run(`window.__pdf.sizes(${from}, ${to})`);
  };

  const sendPdf = async () => {
    try {
      const base64 = await readBase64(pdf.uri);
      run('window.__pdf.begin()');
      for (const part of chunkBase64(base64, CHUNK)) run(`window.__pdf.chunk(${JSON.stringify(part)})`);
      run('window.__pdf.open()');
    } catch {
      setError(pdfErrorMessage(undefined));
    }
  };

  const onMessage = (data: string) => {
    let msg: PdfMessage;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    switch (msg.type) {
      case 'ready':
        sendPdf();
        break;
      case 'opened':
        setPages(msg.pages);
        showMore(msg.pages, 1);
        break;
      case 'sizes':
        msg.sizes.forEach((size, i) => {
          const n = msg.from + i;
          sizes.current[n] = size;
          run(`window.__pdf.render("t${n}", ${n}, ${renderScale(size, THUMB_LIMITS)}, 0.7)`);
        });
        break;
      case 'rendered': {
        const { id, page, width, height, base64 } = msg;
        if (id !== 'full') {
          setThumbs((t) => ({ ...t, [page]: { uri: `data:image/jpeg;base64,${base64}`, width, height } }));
          break;
        }
        saveJpegBase64(projectId, base64, pageImageName(pdf.name, page), { width, height })
          .then(onPicked)
          .catch(() => setError('Não consegui salvar a imagem da página. Verifique o espaço livre no aparelho e tente de novo.'))
          .finally(() => setPicking(null));
        break;
      }
      case 'error':
        // miniatura que falhou fica sem imagem; o resto interrompe o que estava em andamento
        if (msg.stage === 'render' && msg.id !== 'full') break;
        setPicking(null);
        setError(msg.stage === 'render' ? 'Não consegui desenhar esta página. Tente outra página ou tire um print do gráfico e use “Da imagem”.' : pdfErrorMessage(msg.name));
        break;
    }
  };

  const pick = (n: number) => {
    const size = sizes.current[n];
    if (!size || picking !== null) return;
    setError(null);
    setPicking(n);
    run(`window.__pdf.render("full", ${n}, ${renderScale(size)}, 0.92)`);
  };

  const thumbW = Math.floor((win.width - 2 * (space.lg + space.lg + 1) - (COLUMNS - 1) * space.sm) / COLUMNS);

  return (
    <View style={{ gap: space.sm }}>
      <PdfHost ref={host} html={PDF_HTML} onMessage={onMessage} />
      {opening && (
        <View style={st.opening}>
          <ActivityIndicator color={colors.primary} />
          <Muted>Abrindo o PDF…</Muted>
        </View>
      )}
      {pages !== null && (
        <>
          <Muted>
            {pages === 1 ? '1 página.' : `${pages} páginas.`} Toque na página onde está o gráfico.
          </Muted>
          <View style={st.grid}>
            {Array.from({ length: shown }, (_, i) => i + 1).map((n) => {
              const t = thumbs[n];
              return (
                <Pressable key={n} onPress={() => pick(n)} disabled={picking !== null} accessibilityRole="button" accessibilityLabel={`Página ${n}`} style={[st.page, { width: thumbW }, picking === n && st.pageActive, picking !== null && picking !== n && st.pageDim]}>
                  <View style={[st.thumb, { width: thumbW - 4, height: t ? Math.round(((thumbW - 4) * t.height) / t.width) : Math.round((thumbW - 4) * 1.41) }]}>
                    {t && <Image source={{ uri: t.uri }} style={StyleSheet.absoluteFill} resizeMode="stretch" />}
                    {(picking === n || !t) && <ActivityIndicator color={colors.primary} />}
                  </View>
                  <Text style={st.label}>Pág. {n}</Text>
                </Pressable>
              );
            })}
          </View>
          {picking !== null && <Muted>Preparando a página {picking}…</Muted>}
          {shown < pages && <Button small variant="secondary" title={`Mostrar mais páginas (${shown} de ${pages})`} onPress={() => showMore(pages, shown + 1)} disabled={picking !== null} />}
        </>
      )}
      {error && <Text style={st.error}>{error}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  opening: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  page: { alignItems: 'center', borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  pageActive: { borderColor: colors.primary },
  pageDim: { opacity: 0.45 },
  thumb: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 6, overflow: 'hidden' },
  label: { fontSize: 13, color: colors.text, paddingVertical: 4 },
  error: { color: colors.danger, fontSize: 14 },
});
