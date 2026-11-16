import React, { useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export interface PdfHostHandle {
  /** roda um trecho de JavaScript na página do renderizador */
  run: (js: string) => void;
}

interface Props {
  html: string;
  /** texto JSON mandado pela página (ver lib/native/pdfHtml.ts) */
  onMessage: (data: string) => void;
  ref?: React.Ref<PdfHostHandle>;
}

/** WebView escondida que hospeda o renderizador de PDF. No build web, ver PdfHost.web.tsx. */
export function PdfHost({ html, onMessage, ref }: Props) {
  // <object>: com o parâmetro padrão dos tipos da biblioteca as props viram `never`
  const web = useRef<WebView<object>>(null);
  useImperativeHandle(ref, () => ({ run: (js) => web.current?.injectJavaScript(`${js};true;`) }), []);
  const crashed = () => onMessage(JSON.stringify({ type: 'error', name: 'Crashed', stage: 'process' }));

  return (
    <View style={st.hidden} pointerEvents="none">
      <WebView<object>
        ref={web}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        onMessage={(e) => onMessage(e.nativeEvent.data)}
        // o sistema encerra a WebView quando falta memória (PDF pesado demais)
        onContentProcessDidTerminate={crashed}
        onRenderProcessGone={crashed}
      />
    </View>
  );
}

const st = StyleSheet.create({
  // precisa existir na tela para a página rodar, mas não aparece
  hidden: { position: 'absolute', width: 4, height: 4, opacity: 0.01, overflow: 'hidden' },
});
