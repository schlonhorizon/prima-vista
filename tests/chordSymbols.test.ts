import { describe, expect, it } from 'vitest';
import { chroma, parsePitchId, pitchClassId, toMidi } from '../src/core/pitch';
import { memoryStorage } from '../src/core/storage';
import { ADAPTIVE_STRENGTHS, adaptiveFactor, adaptiveModifier, errorScore } from '../src/exercises/adaptive';
import { ChordSymbolExercise, chordSymbolItemKey, unlockedLevel } from '../src/exercises/chordSymbols';
import { PitchClassMatcher } from '../src/exercises/pitchClassMatcher';
import { WeightedSelector } from '../src/exercises/selection';
import type { Task, TaskInfo } from '../src/exercises/types';
import type { NoteEvent } from '../src/input/types';
import { defaultSettings, sanitize, type ChordSymbolSettings } from '../src/settings';
import { StatsStore } from '../src/stats/statsStore';
import {
  CHORD_SYMBOL_TYPES,
  chordSymbolText,
  chordSymbolTones,
  CIRCLE_ROOTS,
  findChordSymbolType,
  formulaText,
  referenceVoicing,
} from '../src/theory/chordSymbols';

const t = (id: string) => findChordSymbolType(id)!;
const pc = (id: string) => {
  const m = /^([A-G])(#|b)?$/.exec(id)!;
  return { step: m[1] as 'C', alter: (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) as 0 };
};
const m = (id: string) => toMidi(parsePitchId(id)!);
const on = (id: string, time = 0): NoteEvent => ({ type: 'on', midi: m(id), velocity: 90, time, source: 'midi' });
const off = (id: string): NoteEvent => ({ type: 'off', midi: m(id), velocity: 0, time: 0, source: 'midi' });

/** Theory data of a chord-symbol task. */
function sym(task: Task): Extract<TaskInfo, { kind: 'chordsym' }> {
  if (task.info?.kind !== 'chordsym') throw new Error('not a chord-symbol task');
  return task.info;
}

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe('chord symbol catalogue', () => {
  it('spells chords correctly from every root', () => {
    const tones = (root: string, id: string) => chordSymbolTones(pc(root), t(id)).map((x) => pitchClassId(x.pc)).join(' ');
    expect(tones('F', 'maj9')).toBe('F A C E G');
    expect(tones('Bb', 'm7')).toBe('Bb Db F Ab');
    expect(tones('Db', 'maj7')).toBe('Db F Ab C');
    expect(tones('F#', '7')).toBe('F# A# C# E');
    expect(tones('E', 'm11')).toBe('E G B D F# A');
    expect(tones('C', '69')).toBe('C E G A D');
    expect(tones('A', 'sus4')).toBe('A D E');
  });

  it('writes symbols in international and German notation', () => {
    expect(chordSymbolText(pc('F'), t('maj9'), 'international')).toBe('Fmaj9');
    expect(chordSymbolText(pc('Bb'), t('m7'), 'international')).toBe('B♭m7');
    expect(chordSymbolText(pc('Bb'), t('m7'), 'german')).toBe('Bm7');
    expect(chordSymbolText(pc('B'), t('maj7'), 'german')).toBe('Hmaj7');
    expect(chordSymbolText(pc('B'), t('maj7'), 'international')).toBe('Bmaj7');
    expect(chordSymbolText(pc('F#'), t('m7'), 'german')).toBe('Fism7');
    expect(chordSymbolText(pc('C'), t('slash3'), 'international')).toBe('C/E');
    expect(chordSymbolText(pc('A'), t('mslash3'), 'international')).toBe('Am/C');
    expect(chordSymbolText(pc('Eb'), t('slash5'), 'german')).toBe('Es/B');
  });

  it('shows interval formulas with the optional fifth in parentheses', () => {
    expect(formulaText(t('mmaj9'))).toBe('1 – ♭3 – (5) – 7 – 9');
    expect(formulaText(t('7'))).toBe('1 – 3 – 5 – ♭7');
    expect(formulaText(t('slash3'))).toBe('1 – 3 – 5, Bass: 3');
  });

  it('has the requested levels', () => {
    const level = (n: number) => CHORD_SYMBOL_TYPES.filter((x) => x.level === n).map((x) => x.suffix || x.id);
    expect(level(1)).toEqual(['maj', 'm', 'sus2', 'sus4']);
    expect(level(2)).toEqual(['add9', 'm(add9)', '6', 'm6']);
    expect(level(3)).toEqual(['7', 'maj7', 'm7', 'm(maj7)']);
    expect(level(4)).toEqual(['9', 'maj9', 'm9', 'm(maj9)', '6/9']);
    expect(level(5)).toEqual(['m11', '7sus4', 'slash3', 'slash5', 'm']);
  });

  it('voices every type playable with notes ascending', () => {
    for (const type of CHORD_SYMBOL_TYPES) {
      for (const root of CIRCLE_ROOTS) {
        const v = referenceVoicing(root, type).map(toMidi);
        for (let i = 1; i < v.length; i++) expect(v[i]).toBeGreaterThan(v[i - 1]);
      }
    }
    expect(CIRCLE_ROOTS.map((r) => pitchClassId(r)).join(' ')).toBe('C G D A E B F# Db Ab Eb Bb F');
  });
});

describe('PitchClassMatcher', () => {
  const answer = (root: string, id: string, bass: string | null = null) => {
    const tones = chordSymbolTones(pc(root), t(id));
    return {
      required: tones.filter((x) => !x.optional).map((x) => chroma(x.pc)),
      optional: tones.filter((x) => x.optional).map((x) => chroma(x.pc)),
      bass: bass ? chroma(pc(bass)) : null,
    };
  };

  it('accepts any inversion and octave, with doublings', () => {
    const matcher = new PitchClassMatcher(answer('C', 'maj7'));
    matcher.handle(on('E3'));
    matcher.handle(on('B3'));
    matcher.handle(on('C4'));
    matcher.handle(on('E5'));
    expect(matcher.handle(on('G5')).status).toBe('correct');
  });

  it('lets the fifth of a 9th chord be left out, but not of a triad', () => {
    const ninth = new PitchClassMatcher(answer('F', 'maj9'));
    for (const n of ['F3', 'A3', 'E4']) ninth.handle(on(n));
    expect(ninth.handle(on('G4')).status).toBe('correct');
    const triad = new PitchClassMatcher(answer('C', 'maj'));
    triad.handle(on('C4'));
    expect(triad.handle(on('E4')).status).toBe('pending');
  });

  it('reports wrong notes with missing tones', () => {
    const matcher = new PitchClassMatcher(answer('C', 'm7'));
    matcher.handle(on('C4'));
    const r = matcher.handle(on('E4'));
    expect(r).toMatchObject({ status: 'wrong', reason: 'wrong-note' });
    if (r.status === 'wrong') expect(r.missing.map((x) => x % 12).sort((a, b) => a - b)).toEqual([3, 7, 10]);
  });

  it('requires the root in the bass in strict mode and the slash bass always', () => {
    const strict = new PitchClassMatcher(answer('C', 'maj', 'C'));
    for (const n of ['E3', 'G3']) strict.handle(on(n));
    expect(strict.handle(on('C4'))).toMatchObject({ status: 'wrong', reason: 'bass' });
    const slash = new PitchClassMatcher(answer('C', 'slash3', 'E'));
    for (const n of ['E2', 'C4', 'G4']) slash.handle(on(n));
    expect(slash.handle(on('E4')).status).toBe('correct');
  });

  it('forgets released notes', () => {
    const matcher = new PitchClassMatcher(answer('C', 'maj'));
    matcher.handle(on('C4'));
    matcher.handle(on('E4'));
    matcher.handle(off('C4'));
    expect(matcher.handle(on('G4')).status).toBe('pending');
  });
});

describe('adaptive weighting', () => {
  const o = ADAPTIVE_STRENGTHS[2];

  it('weights weak, unseen and slow elements higher', () => {
    const store = new StatsStore(memoryStorage());
    for (let i = 0; i < 6; i++) store.record('good', { ok: true, ms: 800 });
    for (let i = 0; i < 6; i++) store.record('bad', { ok: i % 2 === 0, ms: 800 });
    for (let i = 0; i < 6; i++) store.record('slow', { ok: true, ms: 2400 });
    const good = adaptiveFactor(store.getItem('good'), 1000, o);
    const bad = adaptiveFactor(store.getItem('bad'), 1000, o);
    const slow = adaptiveFactor(store.getItem('slow'), 1000, o);
    const unseen = adaptiveFactor(undefined, 1000, o);
    expect(good).toBeLessThan(1);
    expect(bad).toBeGreaterThan(2);
    expect(slow).toBeGreaterThan(1.5);
    expect(unseen).toBe(o.unseenFactor);
  });

  it('weights recent mistakes more and recovers after correct answers', () => {
    const store = new StatsStore(memoryStorage());
    for (let i = 0; i < 5; i++) store.record('x', { ok: false, ms: null });
    const before = errorScore(store.getItem('x')!, o);
    for (let i = 0; i < 10; i++) store.record('x', { ok: true, ms: 900 });
    expect(errorScore(store.getItem('x')!, o)).toBeLessThan(before / 2);
  });

  it('counts skipped and assisted attempts partly', () => {
    const store = new StatsStore(memoryStorage());
    store.record('s', { ok: false, ms: null, skipped: true });
    store.record('h', { ok: true, ms: 500, assisted: true });
    expect(errorScore(store.getItem('s')!, o)).toBe(0.75);
    expect(errorScore(store.getItem('h')!, o)).toBe(0.5);
  });

  it('makes weak chord types come up more often', () => {
    const store = new StatsStore(memoryStorage());
    for (const type of CHORD_SYMBOL_TYPES.filter((x) => x.level === 1)) {
      for (let i = 0; i < 10; i++) store.record(chordSymbolItemKey(type), { ok: type.id !== 'sus2' || i % 3 === 0, ms: 900 });
    }
    const settings: ChordSymbolSettings = { ...defaultSettings().chordSymbols, level: 1 };
    const modifier = adaptiveModifier(store, () => CHORD_SYMBOL_TYPES.map(chordSymbolItemKey), () => o);
    const ex = new ChordSymbolExercise(() => settings, store, new WeightedSelector({ random: seeded(3), modifiers: [modifier] }), () => 0, seeded(4));
    const counts = new Map<string, number>();
    for (let i = 0; i < 3000; i++) {
      const id = sym(ex.nextTask()).type.id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    expect(counts.get('sus2')!).toBeGreaterThan(2 * counts.get('maj')!);
  });
});

describe('ChordSymbolExercise', () => {
  it('unlocks levels at 80 % over 20 answers without help', () => {
    const store = new StatsStore(memoryStorage());
    expect(unlockedLevel(store)).toBe(1);
    const level1 = CHORD_SYMBOL_TYPES.filter((x) => x.level === 1);
    for (let i = 0; i < 20; i++) store.record(chordSymbolItemKey(level1[i % 4]), { ok: i % 5 !== 0, ms: 900 });
    expect(unlockedLevel(store)).toBe(2); // 16/20 = 80 %
    const assistedOnly = new StatsStore(memoryStorage());
    for (let i = 0; i < 30; i++) assistedOnly.record(chordSymbolItemKey(level1[0]), { ok: true, ms: 900, assisted: true });
    expect(unlockedLevel(assistedOnly)).toBe(1);
  });

  it('practises only unlocked levels unless all are unlocked', () => {
    const store = new StatsStore(memoryStorage());
    const settings: ChordSymbolSettings = { ...defaultSettings().chordSymbols, level: 5 };
    const ex = new ChordSymbolExercise(() => settings, store, new WeightedSelector({ random: seeded(1) }), () => 0);
    for (let i = 0; i < 50; i++) expect(sym(ex.nextTask()).type.level).toBe(1);
    settings.unlockAll = true;
    const levels = new Set(Array.from({ length: 300 }, () => sym(ex.nextTask()).type.level));
    expect(levels).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('builds pitch-class answers with optional fifth, strict bass and roots', () => {
    const store = new StatsStore(memoryStorage());
    const settings: ChordSymbolSettings = { ...defaultSettings().chordSymbols, level: 5, unlockAll: true, strict: true, roots: 'circle' };
    const ex = new ChordSymbolExercise(() => settings, store, new WeightedSelector({ random: seeded(2) }), () => 0);
    const roots: string[] = [];
    for (let i = 0; i < 12; i++) {
      const task = ex.nextTask();
      const info = sym(task);
      roots.push(pitchClassId(info.root));
      const a = task.pitchClassAnswer!;
      if (!info.type.bassInterval) expect(a.bass).toBe(chroma(info.root));
      if (info.type.optional.length > 0) expect(a.optional).toHaveLength(1);
    }
    expect(roots.join(' ')).toBe('C G D A E B F# Db Ab Eb Bb F');
    settings.roots = 'white';
    for (let i = 0; i < 50; i++) expect(sym(ex.nextTask()).root.alter).toBe(0);
  });

  it('sanitizes its settings', () => {
    const s = sanitize({ chordSymbols: { level: 9, notation: 'klingonisch', roots: 'circle', adaptiveStrength: 7 } }).chordSymbols;
    expect(s).toMatchObject({ level: 1, notation: 'international', roots: 'circle', adaptiveStrength: 2 });
  });
});
