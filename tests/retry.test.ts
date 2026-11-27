import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parsePitchId, toMidi } from '../src/core/pitch';
import { memoryStorage } from '../src/core/storage';
import { ADAPTIVE_STRENGTHS, errorScore } from '../src/exercises/adaptive';
import { chordSymbolItemKey, unlockedLevel } from '../src/exercises/chordSymbols';
import type { Exercise, Task } from '../src/exercises/types';
import { InputHub } from '../src/input/inputHub';
import type { NoteEvent } from '../src/input/types';
import { defaultSettings, sanitize } from '../src/settings';
import { StatsStore } from '../src/stats/statsStore';
import { CHORD_SYMBOL_TYPES } from '../src/theory/chordSymbols';
import { Trainer, type Slip, type TaskResult } from '../src/trainer/trainer';

const m = (id: string) => toMidi(parsePitchId(id)!);
const on = (id: string): NoteEvent => ({ type: 'on', midi: m(id), velocity: 90, time: performance.now(), source: 'midi' });
const off = (id: string): NoteEvent => ({ type: 'off', midi: m(id), velocity: 0, time: performance.now(), source: 'midi' });

/** C major triad by pitch classes (any inversion); `bass` = required lowest pitch class. */
const exerciseWith = (bass: number | null): Exercise => ({
  id: 'chordsym',
  nextTask: (): Task => ({
    exerciseId: 'chordsym',
    layout: 'treble',
    key: null,
    steps: [{ pitches: ['C4', 'E4', 'G4'].map((id) => parsePitchId(id)!) }],
    answer: 'play',
    itemKey: 'chordsym|maj',
    label: 'C',
    chordWindowMs: 300,
    pitchClassAnswer: { required: [0, 4, 7], optional: [], bass },
  }),
  statsGroups: () => [],
});

function setup(retry: boolean, pauseMs = 1500, bass: number | null = null) {
  const hub = new InputHub();
  const stats = new StatsStore(memoryStorage());
  const results: TaskResult[] = [];
  const slips: Slip[] = [];
  let tasks = 0;
  const trainer = new Trainer(
    exerciseWith(bass),
    hub,
    stats,
    { onTask: () => tasks++, onResult: (r) => results.push(r), onSlip: (s) => slips.push(s) },
    {},
    { retryUntilCorrect: () => retry, pauseAfterCorrectMs: () => pauseMs },
  );
  trainer.next();
  return { hub, stats, results, slips, trainer, tasks: () => tasks };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('trying until correct', () => {
  it('keeps the task on a wrong key and finishes as corrected', () => {
    const t = setup(true);
    t.hub.emit(on('C4'));
    t.hub.emit(on('F4')); // wrong
    expect(t.results).toHaveLength(0);
    expect(t.slips).toHaveLength(1);
    expect(t.slips[0].extra).toEqual([m('F4')]);
    t.hub.emit(off('F4'));
    t.hub.emit(on('E4'));
    t.hub.emit(on('G4'));
    expect(t.results).toHaveLength(1);
    expect(t.results[0]).toMatchObject({ correct: true, corrected: true });
    const item = t.stats.getItem('chordsym|maj')!;
    expect([item.hits, item.misses, item.correctedHits]).toEqual([0, 0, 1]);
  });

  it('has no chord window when trying until correct', () => {
    const t = setup(true);
    t.hub.emit(on('C4'));
    vi.advanceTimersByTime(5000);
    t.hub.emit(on('E4'));
    t.hub.emit(on('G4'));
    expect(t.results[0]).toMatchObject({ correct: true, corrected: false });
    expect(t.stats.getItem('chordsym|maj')!.hits).toBe(1);
  });

  it('asks for the root in the bass instead of failing (strict)', () => {
    const t = setup(true, 1500, 0);
    for (const n of ['E4', 'G4', 'C5']) t.hub.emit(on(n));
    expect(t.slips.at(-1)).toMatchObject({ bassWrong: true });
    expect(t.results).toHaveLength(0);
    t.hub.emit(on('C3'));
    expect(t.results.at(-1)).toMatchObject({ correct: true, corrected: true });
  });

  it('still fails immediately without the option', () => {
    const t = setup(false);
    t.hub.emit(on('F4'));
    expect(t.results[0]).toMatchObject({ correct: false });
    expect(t.slips).toHaveLength(0);
  });
});

describe('pause after a correct answer', () => {
  it('waits the configured time before the next task', () => {
    const t = setup(true, 3000);
    for (const n of ['C4', 'E4', 'G4']) t.hub.emit(on(n));
    expect(t.tasks()).toBe(1);
    vi.advanceTimersByTime(2900);
    expect(t.tasks()).toBe(1);
    vi.advanceTimersByTime(200);
    expect(t.tasks()).toBe(2);
  });
});

describe('corrected answers in statistics and weighting', () => {
  it('count half as error and keep levels locked', () => {
    const store = new StatsStore(memoryStorage());
    store.record('x', { ok: true, ms: 900, corrected: true });
    expect(errorScore(store.getItem('x')!, ADAPTIVE_STRENGTHS[2])).toBe(0.5);
    const level1 = CHORD_SYMBOL_TYPES.filter((t) => t.level === 1);
    const s = new StatsStore(memoryStorage());
    for (let i = 0; i < 30; i++) s.record(chordSymbolItemKey(level1[i % 4]), { ok: true, ms: 900, corrected: true });
    expect(unlockedLevel(s)).toBe(1);
  });

  it('defaults: retry on for chord symbols, off elsewhere, pause 1.5 s', () => {
    const d = defaultSettings();
    expect(d.chordSymbols.retryUntilCorrect).toBe(true);
    expect(d.retryUntilCorrect).toBe(false);
    expect(d.pauseAfterCorrectMs).toBe(1500);
    expect(sanitize({ pauseAfterCorrectMs: 50 }).pauseAfterCorrectMs).toBe(1500);
    expect(sanitize({ pauseAfterCorrectMs: 4000, retryUntilCorrect: true })).toMatchObject({ pauseAfterCorrectMs: 4000, retryUntilCorrect: true });
  });
});
