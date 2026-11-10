import { useMemo } from 'react';
import { useSettings } from '../store/settings';
import { workOrderFor, type WorkOrder } from '../lib/workOrder';
import type { Project } from '../lib/types';

/** Ordem de trabalho do grid do projeto, já com o ajuste global "Sou canhota" aplicado. */
export function useWorkOrder(project: Project | undefined): WorkOrder | null {
  const leftHanded = useSettings((s) => s.leftHanded);
  const rows = project?.grid?.rows;
  const cols = project?.grid?.cols;
  const work = project?.work;
  return useMemo(() => (rows && cols && work ? workOrderFor({ rows, cols }, work, { leftHanded }) : null), [rows, cols, work, leftHanded]);
}
