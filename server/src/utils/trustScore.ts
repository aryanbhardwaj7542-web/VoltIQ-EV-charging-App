import type { ChargingStation, FreshnessState, PowerGridStatus } from '../../../shared/types.js';

export interface TrustScoreBreakdown {
  stationId: string;
  stationName: string;
  overallScore: number;
  reliabilityPct: number;
  freshness: FreshnessState;
  confidenceRating: 'VERIFIED_HIGH' | 'MODERATE' | 'UNRELIABLE';
  formula: string;
  components: {
    community: {
      weight: number;
      rawScore: number;
      weightedContribution: number;
      auditCount24h: number;
      summary: string;
    };
    operator: {
      weight: number;
      rawScore: number;
      weightedContribution: number;
      statusAgreement: boolean;
      summary: string;
    };
    gridPower: {
      weight: number;
      rawScore: number;
      weightedContribution: number;
      status: PowerGridStatus;
      phaseQuality: 'THREE_PHASE_STABLE' | 'VOLTAGE_FLUCTUATION' | 'OUTAGE_REPORTED';
      summary: string;
    };
    staleDecay: {
      penaltyPoints: number;
      hoursSinceLastAudit: number;
      decayMultiplier: number;
      summary: string;
    };
  };
  lastVerifiedAt: string;
  calculatedAt: string;
}

export function computeTrustBreakdown(station: ChargingStation): TrustScoreBreakdown {
  const now = Date.now();
  const lastVerifiedTime = new Date(station.trustScore.lastVerifiedAt).getTime();
  const hoursSinceAudit = Math.max(0.1, (now - lastVerifiedTime) / (1000 * 60 * 60));

  // 1. Community Component (45% weight)
  const commRaw = station.trustScore.signals.communityConfidence;
  const commWeighted = Number((0.45 * commRaw).toFixed(1));

  // 2. Operator Telemetry Component (25% weight)
  const operRaw = station.trustScore.signals.operatorStatusAgreement ? 100 : 35;
  const operWeighted = Number((0.25 * operRaw).toFixed(1));

  // 3. Grid Electricity Component (20% weight)
  let gridRaw = 100;
  let phaseQuality: 'THREE_PHASE_STABLE' | 'VOLTAGE_FLUCTUATION' | 'OUTAGE_REPORTED' = 'THREE_PHASE_STABLE';
  if (station.powerGridStatus === 'REPORTED_CUT') {
    gridRaw = 0;
    phaseQuality = 'OUTAGE_REPORTED';
  } else if (station.powerGridStatus === 'VOLTAGE_FLUCTUATION') {
    gridRaw = 40;
    phaseQuality = 'VOLTAGE_FLUCTUATION';
  } else if (!station.trustScore.signals.gridPowerConfirmed) {
    gridRaw = 60;
    phaseQuality = 'VOLTAGE_FLUCTUATION';
  }
  const gridWeighted = Number((0.20 * gridRaw).toFixed(1));

  // 4. Stale Decay Penalty (D_i)
  // Decay begins after 2 hours: penalty = min(30, (hours - 2) * 2.5)
  const penalty = hoursSinceAudit > 2
    ? Math.min(30, Number(((hoursSinceAudit - 2) * 2.2).toFixed(1)))
    : 0;

  // Formula: S_t = max(0, min(100, 0.45*C + 0.25*O + 0.20*G - D))
  const rawSum = commWeighted + operWeighted + gridWeighted - penalty;
  const finalScore = Math.max(0, Math.min(100, Math.round(rawSum)));

  // Freshness Assessment
  let freshness: FreshnessState = 'LIVE';
  if (hoursSinceAudit > 24) {
    freshness = 'STALE';
  } else if (hoursSinceAudit > 6) {
    freshness = 'RECENT';
  } else if (station.trustScore.signals.communityConfidence < 40) {
    freshness = 'UNCERTAIN';
  }

  // Confidence Rating
  let confidenceRating: 'VERIFIED_HIGH' | 'MODERATE' | 'UNRELIABLE' = 'VERIFIED_HIGH';
  if (finalScore < 50 || station.powerGridStatus === 'REPORTED_CUT') {
    confidenceRating = 'UNRELIABLE';
  } else if (finalScore < 80) {
    confidenceRating = 'MODERATE';
  }

  return {
    stationId: station.id,
    stationName: station.name,
    overallScore: finalScore,
    reliabilityPct: station.trustScore.reliabilityPct,
    freshness,
    confidenceRating,
    formula: 'S_t = max(0, min(100, 0.45·C_i + 0.25·O_i + 0.20·G_i - D_i))',
    components: {
      community: {
        weight: 0.45,
        rawScore: commRaw,
        weightedContribution: commWeighted,
        auditCount24h: station.trustScore.verificationCount24h,
        summary: `${station.trustScore.verificationCount24h} driver proximity audits in last 24h (${commRaw}% approval)`
      },
      operator: {
        weight: 0.25,
        rawScore: operRaw,
        weightedContribution: operWeighted,
        statusAgreement: station.trustScore.signals.operatorStatusAgreement,
        summary: station.trustScore.signals.operatorStatusAgreement
          ? 'Live OCPP 1.6J telemetry matches community field state'
          : 'Discrepancy detected between operator dashboard and real driver status'
      },
      gridPower: {
        weight: 0.20,
        rawScore: gridRaw,
        weightedContribution: gridWeighted,
        status: station.powerGridStatus,
        phaseQuality,
        summary: phaseQuality === 'THREE_PHASE_STABLE'
          ? 'Confirmed 3-phase grid power active (no voltage sag)'
          : phaseQuality === 'OUTAGE_REPORTED'
            ? 'Grid power cut / feeder trip reported'
            : 'Voltage fluctuation or single-phasing risk observed'
      },
      staleDecay: {
        penaltyPoints: penalty,
        hoursSinceLastAudit: Number(hoursSinceAudit.toFixed(1)),
        decayMultiplier: station.trustScore.signals.staleDecayFactor,
        summary: penalty > 0
          ? `-${penalty} pts applied (${hoursSinceAudit.toFixed(1)}h elapsed without physical re-audit)`
          : 'Zero freshness penalty (verified within 2h window)'
      }
    },
    lastVerifiedAt: station.trustScore.lastVerifiedAt,
    calculatedAt: new Date().toISOString()
  };
}
