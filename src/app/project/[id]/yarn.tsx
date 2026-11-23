import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useProject, useProjects } from '../../../store/projects';
import { useSettings } from '../../../store/settings';
import { Button, Card, Muted, NumberField, Row, Segmented, styles, Title } from '../../../components/ui';
import { StockField } from '../../../components/StockField';
import { yarnSummary } from '../../../components/YarnForm';
import { applyCalibration, calibrate, estimateFromGrid, estimateRemaining, setColorYarn, setStock, stockVerdict, type ColorYarnEstimate, type StockVerdict } from '../../../lib/yarn';
import { clampProgress } from '../../../lib/progress';
import { useWorkOrder } from '../../../hooks/useWorkOrder';
import type { Yarn, YarnSettings } from '../../../lib/types';
import { colors, space } from '../../../theme';

const fmt = (v: number, d = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const skeinsText = (n: number) => `${n} ${n === 1 ? 'novelo' : 'novelos'}`;

export default function YarnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const update = useProjects((s) => s.updateProject);
  const yarns = useSettings((s) => s.yarns);
  const [calStitches, setCalStitches] = useState(10);
  const [calCm, setCalCm] = useState(40);
  const [calStitch, setCalStitch] = useState<string | null>(null);
  const [picking, setPicking] = useState<ColorYarnEstimate | null>(null);
  // no meio da peça, a pergunta é "vai dar?"; antes de começar, "quanto comprar?"
  const [view, setView] = useState<'buy' | 'left'>(() => ((project?.progress ?? 0) > 0 ? 'left' : 'buy'));

  const y = project?.yarn;
  const order = useWorkOrder(project);
  if (!project || !y) return null;
  const est = project.grid && order ? estimateFromGrid(project.grid, project.palette, order, y, yarns) : null;
  const done = order ? clampProgress(order, project.progress ?? 0) : 0;
  const left = project.grid && order ? estimateRemaining(project.grid, project.palette, order, y, yarns, done) : null;
  const percent = order?.totalStitches ? Math.round((done / order.totalStitches) * 100) : 0;

  const setYarn = (next: YarnSettings) => update(project.id, { yarn: next });
  const patch = (p: Partial<YarnSettings>) => setYarn({ ...y, ...p });
  const gridStitch = y.stitchTypes.find((s) => s.id === y.gridStitchId) ?? y.stitchTypes[0];
  const calTarget = y.stitchTypes.find((s) => s.id === (calStitch ?? gridStitch?.id)) ?? gridStitch;
  const calResult = calibrate(calStitches, calCm);
  const defaultYarn = yarns.find((x) => x.id === y.defaultYarnId);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {est && (
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'buy', label: 'Lista de compras' },
            { value: 'left', label: `Vai dar? (${percent}% feito)` },
          ]}
        />
      )}
      {left && view === 'left' && (
        <Card>
          <Title>Quanto falta</Title>
          <Muted>
            {done} de {order?.totalStitches} pontos feitos. Conta só o que falta crochetar, com a mesma margem e as pontas dos blocos ainda não começados.
          </Muted>
          {left.perColor.map((c) => {
            const stock = y.stock?.[c.colorId];
            const verdict = stockVerdict(c, stock);
            return (
              <View key={c.colorId} style={[st.line, { alignItems: 'flex-start' }]}>
                <View style={[st.swatch, { marginTop: 2, backgroundColor: c.hex }]} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                    <Text style={st.name} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={st.value}>{c.meters > 0 ? `falta ${fmt(c.meters)} m` : 'terminada ✓'}</Text>
                  </Row>
                  <Pressable onPress={() => setPicking(c)} accessibilityRole="button" accessibilityLabel={`Linha de ${c.name}`} hitSlop={6}>
                    <Text style={[st.yarnLink, !c.yarn && { color: colors.danger }]} numberOfLines={1}>
                      {c.yarn ? `${c.yarn.name}${c.skeins ? ` · ${fmt(c.skeins, 2)} novelo` : ''}` : 'Escolher linha'} ▸
                    </Text>
                  </Pressable>
                  {c.meters > 0 && (
                    <>
                      <StockField
                        key={`${c.colorId}-${stock?.amount}-${stock?.unit}`}
                        label={`Quanto tenho de ${c.name}`}
                        stock={stock}
                        defaultUnit={c.yarn ? 'skeins' : 'meters'}
                        onChange={(s) => setYarn(setStock(y, c.colorId, s))}
                      />
                      <Verdict v={verdict} />
                    </>
                  )}
                </View>
              </View>
            );
          })}
          <View style={[st.line, st.total]}>
            <Text style={[st.name, { flex: 1 }]}>Falta no total</Text>
            <Text style={st.value}>{fmt(left.totalMeters)} m</Text>
          </View>
          <ShortSummary verdicts={left.perColor.filter((c) => c.meters > 0).map((c) => stockVerdict(c, y.stock?.[c.colorId]))} />
        </Card>
      )}
      {est && view === 'buy' ? (
        <Card>
          <Title>Lista de compras</Title>
          <Muted>
            Cada célula = 1 {gridStitch?.name ?? 'ponto'} de {fmt(gridStitch?.cmPerStitch ?? 0)} cm, com {y.wastePercent}% de margem e {y.tailPerColorChangeCm} cm de ponta por bloco
            de cor.
          </Muted>
          {est.perColor.map((c) => (
            <View key={c.colorId} style={st.line}>
              <View style={[st.swatch, { backgroundColor: c.hex }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.name}>{c.name}</Text>
                <Pressable onPress={() => setPicking(c)} accessibilityRole="button" accessibilityLabel={`Linha de ${c.name}`} hitSlop={6}>
                  <Text style={[st.yarnLink, !c.yarn && { color: colors.danger }]} numberOfLines={1}>
                    {c.yarn ? c.yarn.name : 'Escolher linha'} ▸
                  </Text>
                </Pressable>
                <Muted>
                  {c.stitches} pontos · {c.segments} {c.segments === 1 ? 'bloco' : 'blocos'}
                </Muted>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {c.skeinsToBuy != null ? <Text style={st.value}>{skeinsText(c.skeinsToBuy)}</Text> : null}
                <Text style={c.skeinsToBuy != null ? st.sub : st.value}>{fmt(c.meters)} m</Text>
                {c.grams != null && <Muted>{fmt(c.grams, 0)} g</Muted>}
              </View>
            </View>
          ))}
          <View style={[st.line, st.total]}>
            <Text style={[st.name, { flex: 1 }]}>Total</Text>
            <View style={{ alignItems: 'flex-end' }}>
              {est.totalSkeinsToBuy > 0 && <Text style={st.value}>{skeinsText(est.totalSkeinsToBuy)}</Text>}
              <Text style={est.totalSkeinsToBuy > 0 ? st.sub : st.value}>{fmt(est.totalMeters)} m</Text>
              {est.totalGrams != null && <Muted>{fmt(est.totalGrams, 0)} g</Muted>}
            </View>
          </View>
          {est.colorsWithoutYarn > 0 ? (
            <Text style={st.warn}>
              {est.colorsWithoutYarn === 1 ? '1 cor está' : `${est.colorsWithoutYarn} cores estão`} sem linha: escolha a linha do projeto abaixo para ver novelos e gramas.
            </Text>
          ) : (
            <Muted>Novelos inteiros por cor, arredondados para cima.</Muted>
          )}
        </Card>
      ) : null}
      {!est && (
        <Card>
          <Muted>Crie um grid para calcular a linha necessária.</Muted>
        </Card>
      )}

      <Card>
        <Title>Linha do projeto</Title>
        <Muted>Usada por todas as cores que não têm linha própria. Toque no nome da linha de uma cor, na lista acima, para trocar só aquela cor.</Muted>
        {yarns.length === 0 ? (
          <Muted>Você ainda não cadastrou nenhuma linha.</Muted>
        ) : (
          <View style={st.chips}>
            {yarns.map((x) => (
              <Pressable key={x.id} onPress={() => patch({ defaultYarnId: x.id })} style={[st.chip, defaultYarn?.id === x.id && st.chipActive]} accessibilityRole="button" accessibilityState={{ selected: defaultYarn?.id === x.id }}>
                <Text style={[st.chipText, defaultYarn?.id === x.id && { color: colors.primaryText }]}>{x.name}</Text>
                <Text style={[st.chipSub, defaultYarn?.id === x.id && { color: colors.primaryText }]}>{yarnSummary(x)}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Button small variant={yarns.length ? 'ghost' : 'primary'} title={yarns.length ? 'Minhas linhas' : 'Cadastrar uma linha'} onPress={() => router.push('/yarns')} />
      </Card>

      <Card>
        <Title>Calibrar com a sua mão</Title>
        <Muted>Marque o fio, faça alguns pontos, desmanche e meça quanto fio foi usado. Cada mão (e cada linha) gasta diferente.</Muted>
        <View style={st.chips}>
          {y.stitchTypes.map((s) => (
            <Pressable key={s.id} onPress={() => setCalStitch(s.id)} style={[st.chip, calTarget?.id === s.id && st.chipActive]}>
              <Text style={[st.chipText, calTarget?.id === s.id && { color: colors.primaryText }]}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
        <Row>
          <NumberField label="Fiz (pontos)" value={calStitches} onChange={setCalStitches} min={1} integer />
          <NumberField label="Gastei (cm)" value={calCm} onChange={setCalCm} min={0.1} />
        </Row>
        <Text style={st.calResult}>
          = {fmt(calResult)} cm por ponto <Text style={st.sub}>(hoje: {fmt(calTarget?.cmPerStitch ?? 0)} cm)</Text>
        </Text>
        <Button
          title={`Usar no ${calTarget?.name ?? 'ponto'}`}
          disabled={!calTarget || !(calResult > 0) || calResult === calTarget.cmPerStitch}
          onPress={() => calTarget && setYarn(applyCalibration(y, calTarget.id, calStitches, calCm))}
        />
      </Card>

      <Card>
        <Title>Margens</Title>
        <Row>
          <NumberField label="Margem de perda (%)" value={y.wastePercent} onChange={(v) => patch({ wastePercent: v })} min={0} max={200} />
          <NumberField label="Ponta por bloco de cor (cm)" value={y.tailPerColorChangeCm} onChange={(v) => patch({ tailPerColorChangeCm: v })} min={0} />
        </Row>
      </Card>

      <Card>
        <Title>Ponto do grid e consumo</Title>
        <Muted>Toque no ponto usado nas células do grid. Os valores iniciais são estimativas para fio médio.</Muted>
        {y.stitchTypes.map((s) => (
          <View key={s.id} style={st.stitchRow}>
            <View style={{ flex: 1.6 }}>
              <Button small variant={y.gridStitchId === s.id ? 'primary' : 'secondary'} title={s.name + (y.gridStitchId === s.id ? ' · grid' : '')} onPress={() => patch({ gridStitchId: s.id })} />
            </View>
            <View style={{ flex: 1 }}>
              <NumberField
                label="cm/ponto"
                value={s.cmPerStitch}
                onChange={(v) => patch({ stitchTypes: y.stitchTypes.map((t) => (t.id === s.id ? { ...t, cmPerStitch: v } : t)) })}
                min={0.1}
              />
            </View>
          </View>
        ))}
      </Card>

      <YarnPicker
        color={picking}
        yarns={yarns}
        current={picking ? y.colorYarns?.[picking.colorId] : undefined}
        defaultYarn={defaultYarn}
        onClose={() => setPicking(null)}
        onPick={(yarnId) => {
          if (picking) setYarn(setColorYarn(y, picking.colorId, yarnId));
          setPicking(null);
        }}
      />
    </ScrollView>
  );
}

function Verdict({ v }: { v: StockVerdict }) {
  if (v.status === 'unknown')
    return <Muted>{v.reason === 'no-stock' ? 'Estoque não informado' : 'Escolha a linha da cor (ou informe em metros) para comparar'}</Muted>;
  if (v.status === 'enough') return <Text style={[st.verdict, { color: colors.accent }]}>Vai dar ✓ · sobram {fmt(v.leftoverMeters)} m</Text>;
  return (
    <Text style={[st.verdict, { color: colors.danger }]}>
      Vai faltar {fmt(v.missingMeters)} m{v.skeinsToBuy ? ` · compre ${skeinsText(v.skeinsToBuy)}` : ''}
    </Text>
  );
}

function ShortSummary({ verdicts }: { verdicts: StockVerdict[] }) {
  const short = verdicts.filter((v) => v.status === 'short').length;
  const unknown = verdicts.filter((v) => v.status === 'unknown').length;
  if (!verdicts.length) return <Text style={[st.verdict, { color: colors.accent }]}>Gráfico concluído 🎉</Text>;
  if (short) return <Text style={[st.verdict, { color: colors.danger }]}>{short === 1 ? '1 cor vai faltar.' : `${short} cores vão faltar.`}</Text>;
  if (unknown) return <Muted>Informe quanto você tem de cada cor para saber se vai dar.</Muted>;
  return <Text style={[st.verdict, { color: colors.accent }]}>Todas as cores vão dar ✓</Text>;
}

/** Escolher a linha de uma cor: a do projeto ou uma linha cadastrada. */
function YarnPicker({
  color,
  yarns,
  current,
  defaultYarn,
  onClose,
  onPick,
}: {
  color: ColorYarnEstimate | null;
  yarns: Yarn[];
  current: string | undefined;
  defaultYarn: Yarn | undefined;
  onClose: () => void;
  onPick: (yarnId: string | null) => void;
}) {
  const own = yarns.some((x) => x.id === current) ? current : undefined;
  return (
    <Modal visible={color != null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <View style={st.sheet}>
          <Row>
            {color && <View style={[st.swatch, { backgroundColor: color.hex }]} />}
            <Title>Linha de {color?.name}</Title>
          </Row>
          <Option selected={!own} title={`Linha do projeto${defaultYarn ? ` (${defaultYarn.name})` : ''}`} sub={defaultYarn ? yarnSummary(defaultYarn) : 'nenhuma escolhida'} onPress={() => onPick(null)} />
          {yarns.map((x) => (
            <Option key={x.id} selected={own === x.id} title={x.name} sub={yarnSummary(x)} onPress={() => onPick(x.id)} />
          ))}
          <Button
            small
            variant="ghost"
            title="Cadastrar outra linha"
            onPress={() => {
              onClose();
              router.push('/yarns');
            }}
          />
          <Button title="Fechar" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function Option({ selected, title, sub, onPress }: { selected: boolean; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[st.option, selected && st.optionActive]} accessibilityRole="button" accessibilityState={{ selected }}>
      <Text style={st.name}>
        {selected ? '● ' : '○ '}
        {title}
      </Text>
      <Muted>{sub}</Muted>
    </Pressable>
  );
}

const st = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  total: { borderTopWidth: 2, borderTopColor: colors.text },
  swatch: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  name: { fontWeight: '600', color: colors.text, fontSize: 15 },
  yarnLink: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  value: { fontWeight: '700', color: colors.text, fontSize: 16 },
  sub: { fontSize: 14, color: colors.muted, fontWeight: '400' },
  warn: { color: colors.danger, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '600', color: colors.text },
  chipSub: { fontSize: 12, color: colors.muted },
  verdict: { fontWeight: '700', fontSize: 15 },
  calResult: { fontSize: 18, fontWeight: '700', color: colors.text },
  stitchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, padding: space.lg, gap: space.sm, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  option: { padding: space.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', gap: 2 },
  optionActive: { borderColor: colors.primary, borderWidth: 2 },
});
