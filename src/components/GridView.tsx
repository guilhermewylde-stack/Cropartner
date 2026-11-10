import React, { useMemo } from 'react';
import { Pressable, ScrollView, View, type GestureResponderEvent } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import type { Grid, PaletteColor } from '../lib/types';
import type { WorkOrder } from '../lib/workOrder';
import { colors } from '../theme';

const EMPTY = '#FFFFFF';

interface Props {
  grid: Grid;
  palette: PaletteColor[];
  order: WorkOrder;
  cellSize: number;
  lastCell?: number | null;
  showDone?: boolean;
  onCellPress?: (cell: number) => void;
}

/**
 * Desenha o gráfico com SVG. Células vizinhas da mesma cor são agrupadas em um único retângulo
 * por linha, o que mantém gráficos grandes (100x100+) leves.
 */
export function GridView({ grid, palette, order, cellSize, lastCell, showDone = true, onCellPress }: Props) {
  const { rows, cols } = grid;
  const gutter = Math.max(22, Math.round(cellSize * 1.4));
  const width = gutter * 2 + cols * cellSize;
  const height = gutter * 2 + rows * cellSize;
  const hexById = useMemo(() => new Map(palette.map((p) => [p.id, p.hex])), [palette]);

  const colorRects = useMemo(() => {
    const out: React.ReactElement[] = [];
    for (let r = 0; r < rows; r++) {
      let start = 0;
      for (let c = 1; c <= cols; c++) {
        const prev = grid.cells[r * cols + c - 1];
        const cur = c < cols ? grid.cells[r * cols + c] : undefined;
        if (c === cols || cur !== prev) {
          out.push(
            <Rect
              key={`${r}-${start}`}
              x={start * cellSize}
              y={r * cellSize}
              width={(c - start) * cellSize}
              height={cellSize}
              fill={(prev && hexById.get(prev)) || EMPTY}
            />,
          );
          start = c;
        }
      }
    }
    return out;
  }, [grid.cells, rows, cols, cellSize, hexById]);

  const doneRects = useMemo(() => {
    if (!showDone) return [];
    const out: React.ReactElement[] = [];
    for (let r = 0; r < rows; r++) {
      let start = -1;
      for (let c = 0; c <= cols; c++) {
        const d = c < cols && grid.done.charCodeAt(r * cols + c) === 49;
        if (d && start < 0) start = c;
        if (!d && start >= 0) {
          out.push(<Rect key={`d${r}-${start}`} x={start * cellSize} y={r * cellSize} width={(c - start) * cellSize} height={cellSize} fill={colors.done} />);
          start = -1;
        }
      }
    }
    return out;
  }, [grid.done, rows, cols, cellSize, showDone]);

  const lines = useMemo(() => {
    const out: React.ReactElement[] = [];
    const thin = cellSize >= 10 ? 0.5 : 0.25;
    for (let r = 0; r <= rows; r++) {
      const major = r % 10 === 0 || r === rows;
      out.push(<Line key={`h${r}`} x1={0} x2={cols * cellSize} y1={r * cellSize} y2={r * cellSize} stroke={major ? '#444' : '#999'} strokeWidth={major ? 1 : thin} />);
    }
    for (let c = 0; c <= cols; c++) {
      const major = c % 10 === 0 || c === cols;
      out.push(<Line key={`v${c}`} y1={0} y2={rows * cellSize} x1={c * cellSize} x2={c * cellSize} stroke={major ? '#444' : '#999'} strokeWidth={major ? 1 : thin} />);
    }
    return out;
  }, [rows, cols, cellSize]);

  // números das carreiras (no sentido de trabalho), do lado onde a carreira começa
  const labels = useMemo(() => {
    const out: React.ReactElement[] = [];
    const fs = Math.min(12, Math.max(8, cellSize * 0.6));
    const every = cellSize >= 14 ? 1 : cellSize >= 8 ? 5 : 10;
    for (let w = 1; w <= order.totalRows; w++) {
      if (w % every !== 0 && w !== 1) continue;
      // o número fica ao lado do primeiro ponto da carreira, do lado onde ela começa
      const row = order.row(w);
      const ltr = row.direction === 'ltr';
      const r = Math.floor(row.cells[0] / cols);
      const y = gutter + r * cellSize + cellSize / 2 + fs / 3;
      const x = ltr ? gutter - 4 : gutter + cols * cellSize + 4;
      out.push(
        <SvgText key={`r${w}`} x={x} y={y} fontSize={fs} fill={colors.muted} textAnchor={ltr ? 'end' : 'start'}>
          {w}
        </SvgText>,
      );
    }
    for (let c = 0; c < cols; c++) {
      const n = c + 1;
      if (n % every !== 0 && n !== 1) continue;
      out.push(
        <SvgText key={`c${c}`} x={gutter + c * cellSize + cellSize / 2} y={gutter - 6} fontSize={fs} fill={colors.muted} textAnchor="middle">
          {n}
        </SvgText>,
      );
    }
    return out;
  }, [cols, cellSize, gutter, order]);

  const lastRow = lastCell != null ? Math.floor(lastCell / cols) : null;
  const lastCol = lastCell != null ? lastCell % cols : null;

  const handlePress = (e: GestureResponderEvent) => {
    if (!onCellPress) return;
    const x = e.nativeEvent.locationX - gutter;
    const y = e.nativeEvent.locationY - gutter;
    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);
    if (r >= 0 && r < rows && c >= 0 && c < cols) onCellPress(r * cols + c);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
        <Pressable onPress={handlePress} style={{ width, height }}>
          <View pointerEvents="none">
            <Svg width={width} height={height}>
              <G transform={`translate(${gutter}, ${gutter})`}>
                {colorRects}
                {doneRects}
                {lines}
                {lastRow != null && (
                  <Rect x={0} y={lastRow * cellSize} width={cols * cellSize} height={cellSize} fill="none" stroke={colors.highlight} strokeWidth={2} />
                )}
                {lastRow != null && lastCol != null && (
                  <Rect
                    x={lastCol * cellSize + 1}
                    y={lastRow * cellSize + 1}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    fill="none"
                    stroke="#E53935"
                    strokeWidth={Math.max(2, cellSize / 6)}
                  />
                )}
              </G>
              {labels}
            </Svg>
          </View>
        </Pressable>
      </ScrollView>
    </ScrollView>
  );
}
