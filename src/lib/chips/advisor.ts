import {
  FPLChipRule,
  FPLHistoryChip,
  FPLEvent,
  FPLFixture,
  PlayerWithAnalysis,
} from '../../types/fpl';

export interface ChipAdvice {
  chipName: string;
  chipLabel: string;
  isAvailable: boolean;
  statusText: string;
  recommendation: 'USE_THIS_GW' | 'SAVE_FOR_LATER' | 'CONSIDER_NOW' | 'ALREADY_PLAYED';
  bestSuggestedGW?: number;
  reasoning: string;
}

export function evaluateChips(
  rules: FPLChipRule[],
  usedChips: FPLHistoryChip[],
  currentGW: number,
  events: FPLEvent[],
  allFixtures: FPLFixture[],
  squad: PlayerWithAnalysis[]
): ChipAdvice[] {
  const usedChipNames = new Set(usedChips.map((c) => c.name));

  // Scan upcoming gameweeks for Double and Blank Gameweeks
  const dgwEvents: number[] = [];
  const bgwEvents: number[] = [];

  for (let gw = currentGW; gw <= Math.min(38, currentGW + 8); gw++) {
    const gwFixtures = allFixtures.filter((f) => f.event === gw);
    if (gwFixtures.length > 10) {
      dgwEvents.push(gw);
    } else if (gwFixtures.length < 10 && gwFixtures.length > 0) {
      bgwEvents.push(gw);
    }
  }

  // Count flagged players in squad
  const injuredOrDoubtful = squad.filter(
    (p) => p.element.status === 'i' || p.element.status === 'u' || (p.element.chance_of_playing_next_round !== null && p.element.chance_of_playing_next_round <= 50)
  ).length;

  const currentGWBlanks = squad.filter((p) => p.xPtsBreakdown.fixtureCount === 0).length;

  const chipLabels: Record<string, string> = {
    wildcard: 'Wildcard',
    freehit: 'Free Hit',
    bboost: 'Bench Boost',
    '3xc': 'Triple Captain',
  };

  const uniqueChips: Array<'wildcard' | 'freehit' | 'bboost' | '3xc'> = [
    'wildcard',
    'freehit',
    'bboost',
    '3xc',
  ];

  return uniqueChips.map((name) => {
    const isUsed = usedChipNames.has(name);
    const label = chipLabels[name] || name;

    if (isUsed) {
      const usage = usedChips.find((c) => c.name === name);
      return {
        chipName: name,
        chipLabel: label,
        isAvailable: false,
        statusText: `Played in GW ${usage?.event || 'prior'}`,
        recommendation: 'ALREADY_PLAYED',
        reasoning: `You have already activated this chip for the current phase.`,
      };
    }

    if (name === 'wildcard') {
      const isFirstPhaseExpiringSoon = currentGW >= 16 && currentGW <= 19;
      if (injuredOrDoubtful >= 4) {
        return {
          chipName: name,
          chipLabel: label,
          isAvailable: true,
          statusText: 'Heavy squad crisis',
          recommendation: 'USE_THIS_GW',
          bestSuggestedGW: currentGW,
          reasoning: `You have ${injuredOrDoubtful} injured or doubtful players. Activating your Wildcard now allows unlimited free transfers to restructure without taking point hits.`,
        };
      }
      if (isFirstPhaseExpiringSoon) {
        return {
          chipName: name,
          chipLabel: label,
          isAvailable: true,
          statusText: 'Phase 1 expiring at GW 19',
          recommendation: 'CONSIDER_NOW',
          bestSuggestedGW: currentGW,
          reasoning: `First Wildcard expires at Gameweek 19. Ensure you activate it before deadline or it will be lost!`,
        };
      }
      return {
        chipName: name,
        chipLabel: label,
        isAvailable: true,
        statusText: 'Available',
        recommendation: 'SAVE_FOR_LATER',
        bestSuggestedGW: currentGW >= 20 ? 30 : 18,
        reasoning: `Save your Wildcard for major fixture swing swings or before a designated Double Gameweek block.`,
      };
    }

    if (name === 'freehit') {
      if (currentGWBlanks >= 4) {
        return {
          chipName: name,
          chipLabel: label,
          isAvailable: true,
          statusText: 'Severe Blank GW Impact',
          recommendation: 'USE_THIS_GW',
          bestSuggestedGW: currentGW,
          reasoning: `Your squad has ${currentGWBlanks} blank players this week. Free Hit replaces your squad for 1 gameweek only, protecting your overall rank.`,
        };
      }
      return {
        chipName: name,
        chipLabel: label,
        isAvailable: true,
        statusText: 'Available',
        recommendation: 'SAVE_FOR_LATER',
        bestSuggestedGW: bgwEvents[0] || 29,
        reasoning: `Optimal value comes during massive Blank Gameweeks (e.g. FA Cup quarter-final weekend) or huge Double Gameweeks.`,
      };
    }

    if (name === '3xc') {
      const topStarter = squad.slice().sort((a, b) => b.xPts - a.xPts)[0];
      const hasDoubleGW = topStarter && topStarter.xPtsBreakdown.fixtureCount >= 2;

      if (hasDoubleGW && topStarter.xPts >= 12) {
        return {
          chipName: name,
          chipLabel: label,
          isAvailable: true,
          statusText: 'Prime Double Gameweek',
          recommendation: 'USE_THIS_GW',
          bestSuggestedGW: currentGW,
          reasoning: `${topStarter.element.web_name} has a Double Gameweek with expected ${topStarter.xPts} pts. Triple Captain yields 3x points.`,
        };
      }
      return {
        chipName: name,
        chipLabel: label,
        isAvailable: true,
        statusText: 'Available',
        recommendation: 'SAVE_FOR_LATER',
        bestSuggestedGW: dgwEvents[0] || 34,
        reasoning: `Triple Captain is historically most potent during a Double Gameweek on an elite captain (e.g., Haaland, Salah).`,
      };
    }

    if (name === 'bboost') {
      const benchPlayers = squad.filter((p) => !p.isStarter);
      const benchAvgXPts =
        benchPlayers.reduce((s, p) => s + p.xPts, 0) / (benchPlayers.length || 1);

      if (benchAvgXPts >= 4.5 && dgwEvents.includes(currentGW)) {
        return {
          chipName: name,
          chipLabel: label,
          isAvailable: true,
          statusText: 'Strong active bench in DGW',
          recommendation: 'USE_THIS_GW',
          bestSuggestedGW: currentGW,
          reasoning: `All 15 players have favorable fixtures. Bench Boost counts all 4 substitutes toward your gameweek score.`,
        };
      }
      return {
        chipName: name,
        chipLabel: label,
        isAvailable: true,
        statusText: 'Available',
        recommendation: 'SAVE_FOR_LATER',
        bestSuggestedGW: dgwEvents[0] || 37,
        reasoning: `Pair with a Wildcard in a major Double Gameweek so all 15 players have 2 fixtures.`,
      };
    }

    return {
      chipName: name,
      chipLabel: label,
      isAvailable: true,
      statusText: 'Available',
      recommendation: 'SAVE_FOR_LATER',
      reasoning: 'Hold for optimal future fixture schedules.',
    };
  });
}
