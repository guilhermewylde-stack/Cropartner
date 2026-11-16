import React, { useEffect, useImperativeHandle, useRef } from 'react';
import type { PdfHostHandle } from './PdfHost';

interface Props {
  html: string;
  onMessage: (data: string) => void;
  ref?: React.Ref<PdfHostHandle>;
}

/** Versão web (só para desenvolvimento e capturas): a mesma página, num iframe escondido. */
export function PdfHost({ html, onMessage, ref }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const handler = useRef(onMessage);
  useEffect(() => {
    handler.current = onMessage;
  });
  useEffect(() => {
    const listen = (e: MessageEvent) => {
      if (e.source === frame.current?.contentWindow && typeof e.data === 'string') handler.current(e.data);
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      run: (js) => {
        const win = frame.current?.contentWindow as (Window & { eval: (code: string) => unknown }) | null | undefined;
        win?.eval(js);
      },
    }),
    [],
  );
  return React.createElement('iframe', {
    ref: frame,
    srcDoc: html,
    style: { position: 'absolute', width: 4, height: 4, opacity: 0.01, border: 0, pointerEvents: 'none' },
  });
}
