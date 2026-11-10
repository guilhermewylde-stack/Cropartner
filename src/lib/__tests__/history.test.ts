import { canUndo, emptyHistory, record, undo } from '../history';

describe('desfazer', () => {
  test('sem nada registrado, não há o que desfazer', () => {
    const h = emptyHistory<number>();
    expect(canUndo(h)).toBe(false);
    expect(undo(h)).toBeNull();
  });

  test('desfazer devolve o estado anterior à última ação', () => {
    let h = emptyHistory<number>();
    h = record(h, 0); // estado antes da 1ª ação
    h = record(h, 5); // estado antes da 2ª ação
    const first = undo(h)!;
    expect(first.state).toBe(5);
    const second = undo(first.history)!;
    expect(second.state).toBe(0);
    expect(canUndo(second.history)).toBe(false);
  });

  test('registrar não altera o histórico anterior', () => {
    const a = emptyHistory<number>();
    const b = record(a, 1);
    expect(canUndo(a)).toBe(false);
    expect(canUndo(b)).toBe(true);
  });

  test('guarda só as últimas ações', () => {
    let h = emptyHistory<number>();
    for (let i = 0; i < 10; i++) h = record(h, i, 3);
    const states: number[] = [];
    for (let step = undo(h); step; step = undo(step.history)) {
      states.push(step.state);
      h = step.history;
    }
    expect(states).toEqual([9, 8, 7]);
  });
});
