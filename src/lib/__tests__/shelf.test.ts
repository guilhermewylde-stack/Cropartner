import { addDiaryEntry, formatDateBR, groupShelf, parseDateBR, progressChange, removeDiaryEntry, setShelfDates, setStatus } from '../shelf';
import type { Project, ShelfInfo } from '../types';

const DAY = 86_400_000;
const want: ShelfInfo = { status: 'want', startedAt: null, finishedAt: null };

describe('progresso move o projeto na estante', () => {
  test('o primeiro ponto tira de "quero fazer" e anota o começo', () => {
    expect(progressChange(want, 0, 1, 100, 500).shelf).toEqual({ status: 'doing', startedAt: 500, finishedAt: null });
  });

  test('avançar no meio não muda nada (nem as datas)', () => {
    const doing: ShelfInfo = { status: 'doing', startedAt: 10, finishedAt: null };
    expect(progressChange(doing, 10, 20, 100, 500).shelf).toBe(doing);
  });

  test('o último ponto marca como feito e anota o fim', () => {
    const doing: ShelfInfo = { status: 'doing', startedAt: 10, finishedAt: null };
    expect(progressChange(doing, 99, 100, 100, 500).shelf).toEqual({ status: 'done', startedAt: 10, finishedAt: 500 });
  });

  test('terminar de uma vez a partir de "quero fazer" anota começo e fim', () => {
    expect(progressChange(want, 0, 100, 100, 500).shelf).toEqual({ status: 'done', startedAt: 500, finishedAt: 500 });
  });

  test('desfazer o último ponto de um projeto feito volta para "em andamento"', () => {
    const done: ShelfInfo = { status: 'done', startedAt: 10, finishedAt: 500 };
    expect(progressChange(done, 100, 99, 100, 600)).toEqual({ shelf: { status: 'doing', startedAt: 10, finishedAt: null } });
  });

  test('zerar um projeto feito não muda sozinho: pergunta', () => {
    const done: ShelfInfo = { status: 'done', startedAt: 10, finishedAt: 500 };
    const r = progressChange(done, 100, 0, 100, 600);
    expect(r.shelf).toBe(done);
    expect(r.ask).toBe('reopen');
  });

  test('zerar um projeto em andamento mantém o começo anotado', () => {
    const doing: ShelfInfo = { status: 'doing', startedAt: 10, finishedAt: null };
    expect(progressChange(doing, 50, 0, 100, 600).shelf).toBe(doing);
  });

  test('projeto sem grid (total 0) nunca vira feito sozinho', () => {
    expect(progressChange(want, 0, 0, 0, 1).shelf).toBe(want);
  });

  test('projeto antigo em andamento sem data de começo não ganha data inventada no meio', () => {
    const old: ShelfInfo = { status: 'doing', startedAt: null, finishedAt: null };
    expect(progressChange(old, 30, 31, 100, 1).shelf).toBe(old);
  });
});

describe('mudar o estado à mão', () => {
  test('"em andamento" anota o começo (se não tinha) e apaga o fim', () => {
    expect(setStatus(want, 'doing', 7)).toEqual({ status: 'doing', startedAt: 7, finishedAt: null });
    expect(setStatus({ status: 'done', startedAt: 1, finishedAt: 5 }, 'doing', 9)).toEqual({ status: 'doing', startedAt: 1, finishedAt: null });
  });

  test('"feito" anota o fim; peça antiga registrada sem começo fica sem começo', () => {
    expect(setStatus(want, 'done', 9)).toEqual({ status: 'done', startedAt: null, finishedAt: 9 });
    expect(setStatus({ status: 'doing', startedAt: 3, finishedAt: null }, 'done', 9)).toEqual({ status: 'done', startedAt: 3, finishedAt: 9 });
  });

  test('"quero fazer" apaga as datas', () => {
    expect(setStatus({ status: 'done', startedAt: 1, finishedAt: 5 }, 'want', 9)).toEqual(want);
  });

  test('mesmo estado não muda nada', () => {
    const doing: ShelfInfo = { status: 'doing', startedAt: 3, finishedAt: null };
    expect(setStatus(doing, 'doing', 9)).toBe(doing);
  });
});

describe('corrigir as datas', () => {
  const done: ShelfInfo = { status: 'done', startedAt: 10 * DAY, finishedAt: 20 * DAY };

  test('aceita datas em ordem', () => {
    expect(setShelfDates(done, { startedAt: 5 * DAY })).toEqual({ shelf: { ...done, startedAt: 5 * DAY } });
  });

  test('recusa fim antes do começo', () => {
    expect(setShelfDates(done, { finishedAt: 5 * DAY })).toEqual({ error: 'A data de término não pode ser antes do começo.' });
  });

  test('"quero fazer" não tem datas; em andamento não tem fim', () => {
    expect(setShelfDates(want, { startedAt: 1 })).toEqual({ error: 'Projetos em "quero fazer" não têm datas.' });
    expect(setShelfDates({ status: 'doing', startedAt: 1, finishedAt: null }, { finishedAt: 2 })).toEqual({ error: 'Só projetos feitos têm data de término.' });
  });
});

describe('datas no formato brasileiro', () => {
  test('lê DD/MM/AAAA (e D/M/AAAA) no fuso do aparelho', () => {
    expect(parseDateBR('05/03/2026')).toBe(new Date(2026, 2, 5).getTime());
    expect(parseDateBR('5/3/2026')).toBe(new Date(2026, 2, 5).getTime());
  });

  test('recusa datas que não existem ou mal escritas', () => {
    expect(parseDateBR('31/02/2026')).toBeNull();
    expect(parseDateBR('2026-03-05')).toBeNull();
    expect(parseDateBR('')).toBeNull();
  });

  test('escreve DD/MM/AAAA', () => {
    expect(formatDateBR(new Date(2026, 2, 5, 15).getTime())).toBe('05/03/2026');
    expect(formatDateBR(null)).toBe('—');
  });
});

describe('diário', () => {
  test('nota nova vai para o topo, com data; texto vazio não entra', () => {
    const d1 = addDiaryEntry([], '  Ficou linda, dei para a minha mãe ', 100);
    expect(d1).toHaveLength(1);
    expect(d1[0]).toMatchObject({ text: 'Ficou linda, dei para a minha mãe', date: 100 });
    const d2 = addDiaryEntry(d1, 'Segunda nota', 200);
    expect(d2.map((e) => e.text)).toEqual(['Segunda nota', 'Ficou linda, dei para a minha mãe']);
    expect(addDiaryEntry(d2, '   ', 300)).toBe(d2);
    expect(removeDiaryEntry(d2, d2[0].id).map((e) => e.text)).toEqual(['Ficou linda, dei para a minha mãe']);
  });
});

describe('estante', () => {
  const p = (id: string, shelf: ShelfInfo, over: Partial<Project> = {}) => ({ id, name: id, createdAt: 0, updatedAt: 0, shelf, ...over }) as Project;

  test('separa por estado e ordena: em andamento pelo mais mexido, quero fazer pelo mais novo, feitos pelo término', () => {
    const g = groupShelf([
      p('a', { status: 'doing', startedAt: 1, finishedAt: null }, { updatedAt: 5 }),
      p('b', { status: 'doing', startedAt: 1, finishedAt: null }, { updatedAt: 9 }),
      p('c', want, { createdAt: 1 }),
      p('d', want, { createdAt: 3 }),
      p('e', { status: 'done', startedAt: 1, finishedAt: 50 }),
      p('f', { status: 'done', startedAt: 1, finishedAt: 80 }),
      p('g', { status: 'done', startedAt: null, finishedAt: null }),
    ]);
    expect(g.doing.map((x) => x.id)).toEqual(['b', 'a']);
    expect(g.want.map((x) => x.id)).toEqual(['d', 'c']);
    expect(g.done.map((x) => x.id)).toEqual(['f', 'e', 'g']);
  });
});
