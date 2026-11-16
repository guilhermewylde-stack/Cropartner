import React, { useMemo, useRef } from 'react';
import { Image, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { dragCrop, hitCropHandle, type CropHandle } from '../lib/crop';
import type { CropFractions } from '../lib/sampling';
import { colors } from '../theme';

/** folga do dedo em volta das bordas e cantos, em pontos de tela */
const TOUCH = 26;
const DIM = 'rgba(0, 0, 0, 0.5)';

interface Props {
  uri: string;
  /** tamanho em que a imagem é mostrada (já na proporção da imagem) */
  width: number;
  height: number;
  crop: CropFractions;
  onChange: (crop: CropFractions) => void;
  rows: number;
  cols: number;
  /** avisa quando um arrasto começa/termina, para a tela travar a rolagem */
  onDragging?: (dragging: boolean) => void;
}

/**
 * Imagem do gráfico com o recorte arrastável por cima: cantos e bordas redimensionam, o meio move.
 * A grade mostra onde cada célula será lida.
 */
export function CropEditor({ uri, width, height, crop, onChange, rows, cols, onDragging }: Props) {
  // início do gesto: alça pega, recorte naquele momento e posição do dedo na tela
  const gesture = useRef<{ handle: CropHandle; start: CropFractions; pageX: number; pageY: number } | null>(null);

  const touch = {
    onStartShouldSetResponder: (evt: GestureResponderEvent) => {
      const { locationX, locationY, pageX, pageY } = evt.nativeEvent;
      const handle = hitCropHandle(crop, locationX / width, locationY / height, TOUCH / width, TOUCH / height);
      gesture.current = handle ? { handle, start: crop, pageX, pageY } : null;
      return handle !== null;
    },
    onResponderGrant: () => onDragging?.(true),
    onResponderMove: (evt: GestureResponderEvent) => {
      const g = gesture.current;
      if (!g) return;
      // deslocamento total desde o início do gesto, em frações da imagem
      onChange(dragCrop(g.start, g.handle, (evt.nativeEvent.pageX - g.pageX) / width, (evt.nativeEvent.pageY - g.pageY) / height));
    },
    // a rolagem da tela não pode roubar o gesto no meio do arrasto
    onResponderTerminationRequest: () => false,
    onResponderRelease: () => onDragging?.(false),
    onResponderTerminate: () => onDragging?.(false),
  };

  const r = {
    x: crop.left * width,
    y: crop.top * height,
    w: (crop.right - crop.left) * width,
    h: (crop.bottom - crop.top) * height,
  };

  const lines = useMemo(() => {
    const out: React.ReactElement[] = [];
    // no máximo ~60 linhas por eixo para não poluir
    const stepC = Math.max(1, Math.ceil(cols / 60));
    const stepR = Math.max(1, Math.ceil(rows / 60));
    for (let c = stepC; c < cols; c += stepC) {
      const x = r.x + (c * r.w) / cols;
      out.push(<Line key={`c${c}`} x1={x} x2={x} y1={r.y} y2={r.y + r.h} stroke={colors.primary} strokeWidth={0.6} />);
    }
    for (let k = stepR; k < rows; k += stepR) {
      const y = r.y + (k * r.h) / rows;
      out.push(<Line key={`r${k}`} y1={y} y2={y} x1={r.x} x2={r.x + r.w} stroke={colors.primary} strokeWidth={0.6} />);
    }
    return out;
  }, [r.x, r.y, r.w, r.h, rows, cols]);

  const corners: [number, number][] = [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x, r.y + r.h],
    [r.x + r.w, r.y + r.h],
  ];
  const edges: [number, number, boolean][] = [
    [r.x + r.w / 2, r.y, true],
    [r.x + r.w / 2, r.y + r.h, true],
    [r.x, r.y + r.h / 2, false],
    [r.x + r.w, r.y + r.h / 2, false],
  ];

  return (
    <View style={{ width, height }}>
      <Image source={{ uri }} style={{ width, height }} resizeMode="stretch" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={r.y} fill={DIM} />
        <Rect x={0} y={r.y + r.h} width={width} height={Math.max(0, height - r.y - r.h)} fill={DIM} />
        <Rect x={0} y={r.y} width={r.x} height={r.h} fill={DIM} />
        <Rect x={r.x + r.w} y={r.y} width={Math.max(0, width - r.x - r.w)} height={r.h} fill={DIM} />
        {lines}
        <Rect x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke={colors.primary} strokeWidth={2} />
        {edges.map(([x, y, horizontal], i) => (
          <Rect
            key={`e${i}`}
            x={x - (horizontal ? 12 : 3)}
            y={y - (horizontal ? 3 : 12)}
            width={horizontal ? 24 : 6}
            height={horizontal ? 6 : 24}
            rx={3}
            fill="#fff"
            stroke={colors.primary}
            strokeWidth={1.5}
          />
        ))}
        {corners.map(([x, y], i) => (
          <Circle key={`k${i}`} cx={x} cy={y} r={9} fill="#fff" stroke={colors.primary} strokeWidth={2.5} />
        ))}
      </Svg>
      {/* camada de toque sem filhos: locationX/Y ficam relativos à imagem */}
      <View style={StyleSheet.absoluteFill} accessibilityLabel="Área do gráfico: arraste os cantos e as bordas" {...touch} />
    </View>
  );
}
