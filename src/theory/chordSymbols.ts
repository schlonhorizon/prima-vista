import {
  chroma,
  englishPitchClassName,
  germanPitchClassName,
  pitch,
  type Pitch,
  type PitchClass,
} from '../core/pitch';
import { interval, transpose, transposePitchClass } from './interval';

/** How chord symbols and note names are written. */
export type SymbolNotation = 'international' | 'german';

/** A chord type as written in lead sheets ("maj7", "m9", "6/9" …). */
export interface ChordSymbolType {
  readonly id: string;
  /** 1–5, unlocked one after the other. */
  readonly level: number;
  /** Suffix after the root, e.g. "maj9". Slash types use `bassDegree` instead. */
  readonly suffix: string;
  readonly name: string;
  /** Spelled intervals above the root (root first). */
  readonly intervals: readonly string[];
  /** Intervals that may be left out (the fifth of 9th/11th chords, as is usual in practice). */
  readonly optional: readonly string[];
  /** Slash chords: the interval (from the root) of the bass note, e.g. "M3" for C/E. */
  readonly bassInterval?: string;
}

const NINTH_OPTIONAL_FIFTH = ['P5'];

export const CHORD_SYMBOL_TYPES: readonly ChordSymbolType[] = [
  { id: 'maj', level: 1, suffix: '', name: 'Dur', intervals: ['P1', 'M3', 'P5'], optional: [] },
  { id: 'min', level: 1, suffix: 'm', name: 'Moll', intervals: ['P1', 'm3', 'P5'], optional: [] },
  { id: 'sus2', level: 1, suffix: 'sus2', name: 'sus2', intervals: ['P1', 'M2', 'P5'], optional: [] },
  { id: 'sus4', level: 1, suffix: 'sus4', name: 'sus4', intervals: ['P1', 'P4', 'P5'], optional: [] },

  { id: 'add9', level: 2, suffix: 'add9', name: 'add9', intervals: ['P1', 'M3', 'P5', 'M9'], optional: [] },
  { id: 'madd9', level: 2, suffix: 'm(add9)', name: 'Moll add9', intervals: ['P1', 'm3', 'P5', 'M9'], optional: [] },
  { id: '6', level: 2, suffix: '6', name: 'Sext (6)', intervals: ['P1', 'M3', 'P5', 'M6'], optional: [] },
  { id: 'm6', level: 2, suffix: 'm6', name: 'Moll-Sext (m6)', intervals: ['P1', 'm3', 'P5', 'M6'], optional: [] },

  { id: '7', level: 3, suffix: '7', name: 'Dominantsept (7)', intervals: ['P1', 'M3', 'P5', 'm7'], optional: [] },
  { id: 'maj7', level: 3, suffix: 'maj7', name: 'Major 7 (maj7)', intervals: ['P1', 'M3', 'P5', 'M7'], optional: [] },
  { id: 'm7', level: 3, suffix: 'm7', name: 'Moll 7 (m7)', intervals: ['P1', 'm3', 'P5', 'm7'], optional: [] },
  { id: 'mmaj7', level: 3, suffix: 'm(maj7)', name: 'Moll-Major 7', intervals: ['P1', 'm3', 'P5', 'M7'], optional: [] },

  { id: '9', level: 4, suffix: '9', name: 'Dominant 9', intervals: ['P1', 'M3', 'P5', 'm7', 'M9'], optional: NINTH_OPTIONAL_FIFTH },
  { id: 'maj9', level: 4, suffix: 'maj9', name: 'Major 9', intervals: ['P1', 'M3', 'P5', 'M7', 'M9'], optional: NINTH_OPTIONAL_FIFTH },
  { id: 'm9', level: 4, suffix: 'm9', name: 'Moll 9', intervals: ['P1', 'm3', 'P5', 'm7', 'M9'], optional: NINTH_OPTIONAL_FIFTH },
  { id: 'mmaj9', level: 4, suffix: 'm(maj9)', name: 'Moll-Major 9', intervals: ['P1', 'm3', 'P5', 'M7', 'M9'], optional: NINTH_OPTIONAL_FIFTH },
  { id: '69', level: 4, suffix: '6/9', name: '6/9', intervals: ['P1', 'M3', 'P5', 'M6', 'M9'], optional: NINTH_OPTIONAL_FIFTH },

  { id: 'm11', level: 5, suffix: 'm11', name: 'Moll 11', intervals: ['P1', 'm3', 'P5', 'm7', 'M9', 'P11'], optional: NINTH_OPTIONAL_FIFTH },
  { id: '7sus4', level: 5, suffix: '7sus4', name: '7sus4', intervals: ['P1', 'P4', 'P5', 'm7'], optional: [] },
  { id: 'slash3', level: 5, suffix: '', name: 'Dur mit Terz im Bass (C/E)', intervals: ['P1', 'M3', 'P5'], optional: [], bassInterval: 'M3' },
  { id: 'slash5', level: 5, suffix: '', name: 'Dur mit Quinte im Bass (C/G)', intervals: ['P1', 'M3', 'P5'], optional: [], bassInterval: 'P5' },
  { id: 'mslash3', level: 5, suffix: 'm', name: 'Moll mit Terz im Bass (Am/C)', intervals: ['P1', 'm3', 'P5'], optional: [], bassInterval: 'm3' },
];

export const CHORD_SYMBOL_LEVELS: Record<number, string> = {
  1: 'Dur, Moll, sus2, sus4',
  2: 'add9, m(add9), 6, m6',
  3: '7, maj7, m7, m(maj7)',
  4: '9, maj9, m9, m(maj9), 6/9',
  5: 'm11, 7sus4, Slash-Akkorde',
};

export function findChordSymbolType(id: string): ChordSymbolType | undefined {
  return CHORD_SYMBOL_TYPES.find((t) => t.id === id);
}

/** Lead-sheet spelling of the 12 roots (flats for black keys except F♯). */
export const ALL_ROOTS: readonly PitchClass[] = [
  { step: 'C', alter: 0 }, { step: 'D', alter: -1 }, { step: 'D', alter: 0 }, { step: 'E', alter: -1 },
  { step: 'E', alter: 0 }, { step: 'F', alter: 0 }, { step: 'F', alter: 1 }, { step: 'G', alter: 0 },
  { step: 'A', alter: -1 }, { step: 'A', alter: 0 }, { step: 'B', alter: -1 }, { step: 'B', alter: 0 },
];

export const WHITE_ROOTS: readonly PitchClass[] = ALL_ROOTS.filter((r) => r.alter === 0);

/** Roots in circle-of-fifths order (clockwise): C G D A E B F♯ D♭ A♭ E♭ B♭ F. */
export const CIRCLE_ROOTS: readonly PitchClass[] = Array.from({ length: 12 }, (_, i) => ALL_ROOTS.find((r) => chroma(r) === (i * 7) % 12)!);

/** Note name in the chosen notation: "B♭"/"B", "B"/"H", "F♯"/"Fis". */
export function noteName(pc: PitchClass, notation: SymbolNotation): string {
  return notation === 'german' ? germanPitchClassName(pc) : englishPitchClassName(pc);
}

/** "Fmaj9", "B♭m7", "C/E"; German: "Fmaj9", "Bm7", "C/E", "Hm7", "Fism7". */
export function chordSymbolText(root: PitchClass, type: ChordSymbolType, notation: SymbolNotation): string {
  const base = `${noteName(root, notation)}${type.suffix}`;
  if (!type.bassInterval) return base;
  return `${base}/${noteName(transposePitchClass(root, interval(type.bassInterval)), notation)}`;
}

const DEGREE_LABELS: Record<string, string> = {
  P1: '1', m2: '♭2', M2: '2', m3: '♭3', M3: '3', P4: '4', A4: '♯4', d5: '♭5', P5: '5', A5: '♯5',
  m6: '♭6', M6: '6', m7: '♭7', M7: '7', m9: '♭9', M9: '9', A9: '♯9', P11: '11', A11: '♯11', M13: '13',
};

export function degreeLabel(intervalId: string): string {
  return DEGREE_LABELS[intervalId] ?? intervalId;
}

/** "1 – ♭3 – 5 – 7 – 9"; optional fifth in parentheses; slash chords name the bass. */
export function formulaText(type: ChordSymbolType): string {
  const parts = type.intervals.map((id) => (type.optional.includes(id) ? `(${degreeLabel(id)})` : degreeLabel(id)));
  const formula = parts.join(' – ');
  return type.bassInterval ? `${formula}, Bass: ${degreeLabel(type.bassInterval)}` : formula;
}

export interface ChordSymbolTone {
  readonly pc: PitchClass;
  readonly intervalId: string;
  readonly optional: boolean;
}

/** Chord tones, spelled from the root (D♭maj7 = D♭ F A♭ C). */
export function chordSymbolTones(root: PitchClass, type: ChordSymbolType): ChordSymbolTone[] {
  return type.intervals.map((id) => ({
    pc: transposePitchClass(root, interval(id)),
    intervalId: id,
    optional: type.optional.includes(id),
  }));
}

export function bassPitchClass(root: PitchClass, type: ChordSymbolType): PitchClass | null {
  return type.bassInterval ? transposePitchClass(root, interval(type.bassInterval)) : null;
}

/**
 * A playable reference voicing (root position, stacked from the root around
 * middle C; slash chords with the bass note an octave lower).
 */
export function referenceVoicing(root: PitchClass, type: ChordSymbolType): Pitch[] {
  const octave = chroma(root) >= 7 ? 3 : 4;
  const base = pitch(root.step, root.alter, octave);
  const notes = type.intervals.map((id) => transpose(base, interval(id)));
  if (!type.bassInterval) return notes;
  const bass = transpose(base, interval(type.bassInterval));
  return [{ ...bass, octave: bass.octave - 1 }, ...notes];
}
