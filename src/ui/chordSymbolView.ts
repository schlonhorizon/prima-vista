import { chroma, englishPitchClassName, germanPitchClassName, isBlackKey, midiToPitch, toMidi } from '../core/pitch';
import type { Task } from '../exercises/types';
import {
  bassPitchClass,
  chordSymbolText,
  chordSymbolTones,
  degreeLabel,
  formulaText,
  noteName,
  referenceVoicing,
} from '../theory/chordSymbols';
import type { TaskResult } from '../trainer/trainer';

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

const pc = (midi: number) => ((midi % 12) + 12) % 12;

/**
 * Chord-symbol mode on the ivory sheet: the symbol instead of a staff; after the
 * answer the tones, the formula and a small keyboard with the chord tones marked
 * (played / missing / wrong).
 */
export class ChordSymbolView {
  show(task: Task): void {
    const info = task.info;
    if (info?.kind !== 'chordsym') return;
    const staff = $('staff');
    const symbol = document.createElement('div');
    symbol.className = 'chord-symbol';
    symbol.setAttribute('role', 'img');
    const text = chordSymbolText(info.root, info.type, info.notation);
    symbol.setAttribute('aria-label', `Akkordsymbol ${text}`);
    const [main, bass] = text.split('/');
    const rootName = noteName(info.root, info.notation);
    const root = document.createElement('span');
    root.className = 'chord-root';
    root.append(...withAccidentals(rootName));
    const suffix = document.createElement('span');
    suffix.className = 'chord-suffix';
    suffix.textContent = main.slice(rootName.length);
    symbol.append(root, suffix);
    if (bass) {
      const slash = document.createElement('span');
      slash.className = 'chord-bass';
      slash.append('/', ...withAccidentals(bass));
      symbol.append(slash);
    }
    staff.replaceChildren(symbol);
    $('chord-result').hidden = true;
  }

  showResult(r: TaskResult): void {
    const info = r.task.info;
    if (info?.kind !== 'chordsym') return;
    const tones = chordSymbolTones(info.root, info.type);
    const playedPcs = new Set(r.played.map(pc));
    const tonePcs = new Set(tones.map((t) => chroma(t.pc)));
    const wrongPcs = [...new Set(r.played.map(pc))].filter((p) => !tonePcs.has(p));

    $('chord-tones').textContent = tones.map((t) => noteName(t.pc, info.notation)).join(' – ');
    $('chord-formula').textContent = formulaText(info.type);

    // Keyboard: two octaves from the C at or below the reference voicing.
    const voicing = referenceVoicing(info.root, info.type);
    const low = Math.floor(toMidi(voicing[0]) / 12) * 12;
    const high = Math.max(low + 23, Math.ceil((toMidi(voicing[voicing.length - 1]) + 1) / 12) * 12 - 1);
    const degreeOf = new Map(tones.map((t) => [chroma(t.pc), t]));
    const bass = bassPitchClass(info.root, info.type);
    const marks = new Map<number, { cls: string; label: string }>();
    for (const p of voicing) {
      const m = toMidi(p);
      const tone = degreeOf.get(pc(m));
      if (!tone) continue;
      const played = playedPcs.has(pc(m));
      const cls = r.skipped ? 'solution' : played ? 'hit' : tone.optional ? 'optional' : 'missing';
      // The slash bass is the lowest voicing note and gets an extra marker.
      const isBass = bass !== null && m === toMidi(voicing[0]);
      marks.set(m, { cls: isBass ? `${cls} bass` : cls, label: degreeLabel(tone.intervalId) });
    }
    for (const w of wrongPcs) {
      // Wrong tones are shown in the lower octave of the keyboard.
      marks.set(low + w, { cls: 'wrong', label: '✗' });
    }
    this.renderKeyboard(low, high, marks);

    const missing = tones.filter((t) => !t.optional && !playedPcs.has(chroma(t.pc)));
    const wrongNames = wrongPcs.map((w) => {
      const p = midiToPitch(60 + w);
      return info.notation === 'german' ? germanPitchClassName(p) : englishPitchClassName(p);
    });
    const notes: string[] = [];
    if (!r.correct && !r.skipped) {
      if (missing.length > 0) notes.push(`fehlt: ${missing.map((t) => noteName(t.pc, info.notation)).join(', ')}`);
      if (wrongNames.length > 0) notes.push(`falsch: ${wrongNames.join(', ')}`);
      if (r.bassWrong) notes.push(info.type.bassInterval ? 'der Basston lag nicht unten' : 'der Grundton lag nicht unten');
    }
    $('chord-issues').textContent = notes.join(' · ');
    $('chord-result').hidden = false;
  }

  private renderKeyboard(low: number, high: number, marks: Map<number, { cls: string; label: string }>): void {
    const root = $('chord-keys');
    root.replaceChildren();
    let whites = 0;
    for (let m = low; m <= high; m++) if (!isBlackKey(m)) whites++;
    const width = 100 / whites;
    let index = 0;
    for (let m = low; m <= high; m++) {
      const black = isBlackKey(m);
      const key = document.createElement('div');
      key.className = `mini-key ${black ? 'black' : 'white'}`;
      if (black) {
        key.style.left = `${index * width - width * 0.3}%`;
        key.style.width = `${width * 0.6}%`;
      } else {
        key.style.left = `${index * width}%`;
        key.style.width = `${width}%`;
        index++;
      }
      const mark = marks.get(m);
      if (mark) {
        key.classList.add(...mark.cls.split(' '));
        const dot = document.createElement('span');
        dot.className = 'mini-mark';
        dot.textContent = mark.label;
        key.appendChild(dot);
      }
      root.appendChild(key);
    }
  }
}

/** Text with ♯/♭ wrapped in a span, so accidentals can be set smaller and raised. */
function withAccidentals(text: string): (string | HTMLElement)[] {
  return text.split(/([♯♭𝄪𝄫])/u).filter(Boolean).map((part) => {
    if (!/^[♯♭𝄪𝄫]$/u.test(part)) return part;
    const acc = document.createElement('span');
    acc.className = 'chord-acc';
    acc.textContent = part;
    return acc;
  });
}
