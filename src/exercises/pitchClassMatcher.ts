import type { NoteEvent } from '../input/types';
import type { Matcher, StepResult } from './matcher';

/** Answer given as pitch classes (0–11): any inversion, octave and doubling counts. */
export interface PitchClassAnswer {
  /** Pitch classes that must sound. */
  readonly required: readonly number[];
  /** Pitch classes that may sound but need not (e.g. the fifth of a 9th chord). */
  readonly optional: readonly number[];
  /** Pitch class that must be the lowest note (strict mode, slash chords), or null. */
  readonly bass: number | null;
}

const pc = (midi: number) => ((midi % 12) + 12) % 12;

/**
 * Matches a chord by its pitch-class set. The answer is complete as soon as all
 * required pitch classes are held; a key outside the chord is wrong at once. With
 * a bass requirement the lowest held note must have the bass pitch class.
 */
export class PitchClassMatcher implements Matcher {
  private held = new Set<number>();
  private firstOn: number | null = null;
  private allowed: Set<number>;

  constructor(private answer: PitchClassAnswer, private windowMs = 0) {
    this.allowed = new Set([...answer.required, ...answer.optional]);
  }

  deadline(): number | null {
    if (this.windowMs <= 0 || this.firstOn === null) return null;
    return this.firstOn + this.windowMs;
  }

  handle(event: NoteEvent): StepResult {
    if (event.type === 'off') {
      this.held.delete(event.midi);
      if (this.held.size === 0) this.firstOn = null;
      return { status: 'pending' };
    }
    if (!this.allowed.has(pc(event.midi))) {
      return this.wrong('wrong-note', event.time, [...this.held, event.midi]);
    }
    if (this.held.size === 0) this.firstOn = event.time;
    this.held.add(event.midi);
    const heldPcs = new Set([...this.held].map(pc));
    if (!this.answer.required.every((r) => heldPcs.has(r))) return { status: 'pending' };
    const played = [...this.held].sort((a, b) => a - b);
    if (this.answer.bass !== null && pc(played[0]) !== this.answer.bass) {
      return this.wrong('bass', event.time, played);
    }
    return { status: 'correct', time: event.time, played };
  }

  expire(now: number): StepResult {
    return this.wrong('timeout', now, [...this.held]);
  }

  private wrong(reason: 'wrong-note' | 'timeout' | 'bass', time: number, played: number[]): StepResult {
    const sorted = [...played].sort((a, b) => a - b);
    const playedPcs = new Set(sorted.map(pc));
    return {
      status: 'wrong',
      reason,
      time,
      played: sorted,
      // Missing / extra as pitch classes in the octave above middle C (for display).
      missing: this.answer.required.filter((r) => !playedPcs.has(r)).map((r) => 60 + r),
      extra: sorted.filter((m) => !this.allowed.has(pc(m))),
    };
  }
}
