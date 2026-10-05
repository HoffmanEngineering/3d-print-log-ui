import { Injectable, inject } from '@angular/core';
import { AnycubicFileParserService } from '../anycubic/anycubic-file-parser.service';
import { BambuStudioFileParserService } from '../bambu/bambu-studio-file-parser.service';
import { CrealityPrintFileParserService } from '../creality-print/creality-print-file-parser.service';
import { CuraSlicerFileParserService } from '../cura/cura-slicer-file-parser.service';
import { OrcaFileParserService } from '../orca/orca-file-parser.service';
import { PrusaSlicerFileParserService } from '../prusa/prusa-slicer-file-parser.service';
import { GcodeParserBase } from './gcode-parser-base';
import { GcodeSettings } from './gcode-settings';
import { trimGcodeWindow } from './gcode-window';

/**
 * Minimum fraction of a parser's settingKeys that must resolve for an
 * unrecognized file to be handed to that parser. An Orca fork resolves ~100%
 * of Orca's keys; a bare Marlin file resolves none.
 */
export const HEURISTIC_MATCH_THRESHOLD = 0.25;

/**
 * A parser with few fingerprint keys clears the fraction on a single generic
 * header line (";FLAVOR:Marlin" alone is 1/4 of Creality's), so a match also
 * needs at least this many resolved keys.
 */
export const HEURISTIC_MIN_KEY_HITS = 2;

export type ParserConfidence = 'detected' | 'heuristic' | 'none';

export interface ResolvedParser {
  parser: GcodeParserBase | null;
  confidence: ParserConfidence;
  /** 1 for a detected marker; otherwise the best heuristic score (0..1). */
  score: number;
}

@Injectable({
  providedIn: 'root',
})
export class SlicerRegistry {
  /**
   * Order matters: it is the detection order, and the heuristic resolves ties
   * in favor of the earlier entry. Orca wins over Bambu, which shares its keys;
   * Cura comes before Creality Print (a Cura fork) because its parser is the
   * more general of the two for a marker-less file.
   */
  readonly parsers: readonly GcodeParserBase[] = [
    inject(OrcaFileParserService),
    inject(BambuStudioFileParserService),
    inject(PrusaSlicerFileParserService),
    inject(AnycubicFileParserService),
    inject(CuraSlicerFileParserService),
    inject(CrealityPrintFileParserService),
  ];

  getSupportedSlicerNames(): string[] {
    return this.parsers.map((p) => p.slicerName);
  }

  resolve(gcode: string): ResolvedParser {
    const windowed = trimGcodeWindow(gcode);

    const detected = this.parsers.find((p) => p.detect(windowed));
    if (detected) {
      return { parser: detected, confidence: 'detected', score: 1 };
    }

    // Parsers differ only in separator style, so index once per distinct style.
    const settingsByStyle = new Map<string, GcodeSettings>();
    let best: { parser: GcodeParserBase; score: number; hits: number } | null =
      null;

    for (const parser of this.parsers) {
      const styleKey = `${parser.settingsOptions.separators}|${parser.settingsOptions.spaced}`;
      let settings = settingsByStyle.get(styleKey);
      if (!settings) {
        settings = GcodeSettings.parse(windowed, parser.settingsOptions);
        settingsByStyle.set(styleKey, settings);
      }
      const score = parser.score(settings);
      const hits = parser.settingKeys.filter((key) => settings.has(key)).length;
      // Strict > keeps the earlier entry on a tie.
      if (!best || score > best.score) {
        best = { parser, score, hits };
      }
    }

    if (
      best &&
      best.score >= HEURISTIC_MATCH_THRESHOLD &&
      best.hits >= HEURISTIC_MIN_KEY_HITS
    ) {
      return {
        parser: best.parser,
        confidence: 'heuristic',
        score: best.score,
      };
    }
    return { parser: null, confidence: 'none', score: best?.score ?? 0 };
  }
}
