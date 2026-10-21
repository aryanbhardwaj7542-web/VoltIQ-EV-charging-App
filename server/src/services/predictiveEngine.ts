import type {
  FailurePatternAnalysis,
  PredictiveAnalyticsSummary,
  HourlyDemandPrediction,
  FailureModeCode,
  PredictiveRiskTier
} from '../../../shared/types.js';
import { ticketRepository } from '../repositories/ticketRepository.js';
import { stationRepository } from '../repositories/stationRepository.js';

class PredictiveEngine {
  private static instance: PredictiveEngine;
  private stationOverrides: Map<string, Partial<FailurePatternAnalysis>> = new Map();

  private constructor() {}

  public static getInstance(): PredictiveEngine {
    if (!PredictiveEngine.instance) {
      PredictiveEngine.instance = new PredictiveEngine();
    }
    return PredictiveEngine.instance;
  }

  /**
   * Generates a 24-hour hourly demand & failure probability curve
   */
  public generateHourlyForecast(stationId: string, riskPct: number): HourlyDemandPrediction[] {
    const isTechCorridor = ['st-blr-07', 'st-blr-04', 'st-blr-08'].includes(stationId);
    const isCentralHub = ['st-blr-01', 'st-blr-06', 'st-blr-09'].includes(stationId);

    const predictions: HourlyDemandPrediction[] = [];

    for (let hour = 0; hour < 24; hour++) {
      let baseOccupancy = 20;

      if (hour >= 0 && hour <= 5) {
        baseOccupancy = 12 + (hour % 3) * 4;
      } else if (hour >= 6 && hour <= 7) {
        baseOccupancy = 35 + (hour % 2) * 10;
      } else if (hour >= 8 && hour <= 11) {
        // Morning office commute rush
        baseOccupancy = isTechCorridor ? 88 : isCentralHub ? 78 : 65;
      } else if (hour >= 12 && hour <= 15) {
        // Afternoon lull
        baseOccupancy = 38 + (hour % 3) * 6;
      } else if (hour >= 16 && hour <= 21) {
        // Evening peak charge demand
        baseOccupancy = isTechCorridor ? 94 : isCentralHub ? 90 : 82;
      } else {
        // Night taper
        baseOccupancy = 40 - (hour - 21) * 8;
      }

      // Calculate queue wait time in minutes
      const expectedWaitMinutes = baseOccupancy > 70
        ? Math.round((baseOccupancy - 60) * 0.8)
        : baseOccupancy > 50
        ? Math.round((baseOccupancy - 50) * 0.4)
        : 0;

      // Indian grid sag factor peaks between 18:00 and 21:00 (heavy residential aircon/heating load)
      let gridSagRiskPct = 10;
      if (hour >= 18 && hour <= 21) {
        gridSagRiskPct = Math.min(95, Math.round(riskPct * 1.15));
      } else if (hour >= 12 && hour <= 16) {
        gridSagRiskPct = Math.round(riskPct * 0.7);
      } else {
        gridSagRiskPct = Math.round(riskPct * 0.4);
      }

      predictions.push({
        hour,
        expectedOccupancyPct: Math.min(100, Math.max(5, baseOccupancy)),
        expectedWaitMinutes,
        gridSagRiskPct: Math.min(100, Math.max(5, gridSagRiskPct))
      });
    }

    return predictions;
  }

  /**
   * Generates predictive failure analysis for a given station
   */
  public async getAnalysisForStation(stationId: string): Promise<FailurePatternAnalysis> {
    const station = await stationRepository.findById(stationId);
    const stationName = station ? station.name : 'EV Charging Station';

    const override = this.stationOverrides.get(stationId);

    // Baseline profiles per station
    let riskPct = 25;
    let primaryFailureSignature: FailureModeCode = 'GRID_VOLTAGE_SAG_PHASE_DROP';
    let signatureTitle = 'Stable Power Grid Feeder';
    let signatureDescription = 'Three-phase 415V supply is currently stable with minimal brownout signature.';
    let voltageStabilityScore = 94;
    let thermalDerateRiskPct = 22;
    let ocppHeartbeatLatencyMs = 140;
    let recurrentFailureIntervalHours = 96;
    let recommendedIntervention = 'Routine bi-weekly telemetry monitoring';
    let suggestedActionDeadline = 'Next cycle: 7 days';
    let preventiveMaintStatus: 'SCHEDULED' | 'PENDING' | 'OVERDUE' | 'NORMAL' = 'NORMAL';

    if (stationId === 'st-blr-06') {
      // Majestic Bus Stand Hub: Severe Indian grid sag and feeder drop
      riskPct = 78;
      primaryFailureSignature = 'GRID_VOLTAGE_SAG_PHASE_DROP';
      signatureTitle = 'Commercial Feeder Phase Drop & Voltage Sag';
      signatureDescription = 'Transformer voltage drops below 360V during peak evening hours (18:00–21:30), causing DC fast rectifiers to enter safety trip mode.';
      voltageStabilityScore = 58;
      thermalDerateRiskPct = 48;
      ocppHeartbeatLatencyMs = 420;
      recurrentFailureIntervalHours = 14.5;
      recommendedIntervention = 'Calibrate 3-phase automatic voltage stabilizer & inspect input contactor';
      suggestedActionDeadline = 'Urgent: within 4 hours';
      preventiveMaintStatus = 'OVERDUE';
    } else if (stationId === 'st-blr-01') {
      // Indiranagar Metro Hub: Thermal derating
      riskPct = 48;
      primaryFailureSignature = 'THERMAL_DERATING_AND_OVERHEAT';
      signatureTitle = 'DC Cable Liquid Cooling Thermal Derate';
      signatureDescription = 'High continuous high-kW throughput combined with 34°C ambient temperature causes 60kW dispenser to derate to 28kW.';
      voltageStabilityScore = 88;
      thermalDerateRiskPct = 74;
      ocppHeartbeatLatencyMs = 190;
      recurrentFailureIntervalHours = 32.0;
      recommendedIntervention = 'Flush liquid coolant loop and clean intake air radiator filters';
      suggestedActionDeadline = 'Within 24 hours';
      preventiveMaintStatus = 'PENDING';
    } else if (stationId === 'st-blr-04') {
      // Koramangala: Basement OCPP Comms Latency
      riskPct = 42;
      primaryFailureSignature = 'DISPENSER_COMM_TIMEOUT_OCPP';
      signatureTitle = 'Basement Cellular Shielding & OCPP Heartbeat Drops';
      signatureDescription = 'Sub-level basement 4G signal packet loss (>1200ms latency) causes cloud CMS transaction drops and RFID scan failures.';
      voltageStabilityScore = 91;
      thermalDerateRiskPct = 28;
      ocppHeartbeatLatencyMs = 1380;
      recurrentFailureIntervalHours = 44.0;
      recommendedIntervention = 'Install external high-gain cellular repeater antenna at street entrance';
      suggestedActionDeadline = 'Within 48 hours';
      preventiveMaintStatus = 'PENDING';
    } else if (stationId === 'st-blr-09') {
      // MG Road Metro: Bay Obstruction
      riskPct = 36;
      primaryFailureSignature = 'BAY_ICING_AND_OBSTRUCTION';
      signatureTitle = 'Commercial Drop-off Congestion & Bay Obstruction';
      signatureDescription = 'Non-EV ride-hail autos frequently block bay ingress between 17:30 and 20:30.';
      voltageStabilityScore = 93;
      thermalDerateRiskPct = 30;
      ocppHeartbeatLatencyMs = 160;
      recurrentFailureIntervalHours = 28.0;
      recommendedIntervention = 'Deploy smart pneumatic parking lock flaps or security traffic cones';
      suggestedActionDeadline = 'Within 3 days';
      preventiveMaintStatus = 'NORMAL';
    } else if (stationId === 'st-blr-07') {
      // Shell ITPL: Prime Industrial Grade
      riskPct = 14;
      primaryFailureSignature = 'GRID_VOLTAGE_SAG_PHASE_DROP';
      signatureTitle = 'Dedicated Industrial Substation (Optimal Stability)';
      signatureDescription = 'Direct 11kV step-down with automatic harmonic filters guarantees continuous 415V ±1.2%.';
      voltageStabilityScore = 99;
      thermalDerateRiskPct = 18;
      ocppHeartbeatLatencyMs = 95;
      recurrentFailureIntervalHours = 180.0;
      recommendedIntervention = 'Quarterly routine telemetry check';
      suggestedActionDeadline = 'Next cycle: 14 days';
      preventiveMaintStatus = 'NORMAL';
    }

    // Apply any active runtime overrides (e.g., when preventive dispatch was scheduled)
    if (override) {
      if (override.failureRiskPct !== undefined) riskPct = override.failureRiskPct;
      if (override.preventiveMaintStatus !== undefined) preventiveMaintStatus = override.preventiveMaintStatus;
      if (override.recommendedIntervention !== undefined) recommendedIntervention = override.recommendedIntervention;
      if (override.suggestedActionDeadline !== undefined) suggestedActionDeadline = override.suggestedActionDeadline;
    }

    // Determine Risk Tier
    let riskTier: PredictiveRiskTier = 'LOW';
    if (riskPct >= 75) riskTier = 'CRITICAL';
    else if (riskPct >= 55) riskTier = 'HIGH';
    else if (riskPct >= 30) riskTier = 'MODERATE';
    else riskTier = 'LOW';

    const hourlyDemandForecast = this.generateHourlyForecast(stationId, riskPct);

    return {
      stationId,
      stationName,
      failureRiskPct: riskPct,
      riskTier,
      primaryFailureSignature,
      signatureTitle,
      signatureDescription,
      rootCauseTelemetry: {
        voltageStabilityScore,
        thermalDerateRiskPct,
        ocppHeartbeatLatencyMs,
        recurrentFailureIntervalHours
      },
      recommendedIntervention,
      suggestedActionDeadline,
      preventiveMaintStatus,
      hourlyDemandForecast,
      peakWindow: {
        startHour: 17,
        endHour: 21,
        peakWaitMinutes: riskPct >= 60 ? 35 : 20,
        recommendedAlternativeTime: '12:00 PM – 4:00 PM (0m wait)'
      }
    };
  }

  /**
   * Generates network-wide predictive analytics summary
   */
  public async getNetworkSummary(): Promise<PredictiveAnalyticsSummary> {
    const stations = await stationRepository.findAll();
    const analyses: FailurePatternAnalysis[] = [];

    for (const st of stations) {
      const a = await this.getAnalysisForStation(st.id);
      analyses.push(a);
    }

    const highRiskStations = analyses.filter(a => a.riskTier === 'HIGH' || a.riskTier === 'CRITICAL');
    const interventionsRequired = analyses.filter(a => a.preventiveMaintStatus === 'OVERDUE' || a.preventiveMaintStatus === 'PENDING');

    const avgRisk = analyses.reduce((acc, a) => acc + a.failureRiskPct, 0) / (analyses.length || 1);
    const networkHealthIndex = Math.round((100 - avgRisk) * 10) / 10;

    return {
      networkHealthIndex,
      stationsAtHighRiskCount: highRiskStations.length,
      preventiveInterventionsRequiredCount: interventionsRequired.length,
      topFailureMode: 'GRID_VOLTAGE_SAG_PHASE_DROP',
      topFailureModeLabel: 'Indian Grid Phase Sags & Voltage Brownouts (415V drops < 360V)',
      patternInsights: [
        'Evening Grid Voltage Sags: 62% of station faults occur between 18:00 and 21:30 during regional peak aircon/domestic load.',
        'Thermal Derating Peak: Fast chargers with unserviced radiator filters exhibit a 45% power drop (60kW down to ~28kW) above 33°C ambient temperature.',
        'Basement Shielding: 2 subterranean stations suffer intermittent OCPP 1.6J timeouts due to high-attenuation cellular reception.'
      ],
      stationPredictions: analyses
    };
  }

  /**
   * Dispatches a preventive service technician to mitigate failure risk
   */
  public async schedulePreventiveDispatch(
    stationId: string,
    technicianName = 'Sunil N. (Senior Predictive Fleet Engineer)',
    notes = 'Proactive voltage stabilizer calibration & radiator filter clean'
  ): Promise<{ success: boolean; updatedAnalysis: FailurePatternAnalysis; ticketId: string }> {
    const current = await this.getAnalysisForStation(stationId);

    // Halve the failure risk upon preventive service dispatch
    const mitigatedRisk = Math.max(12, Math.round(current.failureRiskPct * 0.4));

    this.stationOverrides.set(stationId, {
      failureRiskPct: mitigatedRisk,
      preventiveMaintStatus: 'SCHEDULED',
      suggestedActionDeadline: 'Technician En Route (SLA: 2 hours)',
      recommendedIntervention: `Preventive Maintenance in Progress: ${notes}`
    });

    // Create formal maintenance ticket in ticket repository
    const ticket = await ticketRepository.create({
      stationId,
      stationName: current.stationName,
      operatorId: 'op-predictive-fleet',
      reportedBy: 'VoltIQ Predictive AI Engine (Pre-Fault Alert)',
      faultCategory: 'GRID_TRIPPED',
      priority: 'HIGH',
      description: `[PREVENTIVE MAINTENANCE] ${current.signatureTitle}. Pre-fault risk index was ${current.failureRiskPct}%. ${notes}`,
      assignedTechnician: technicianName,
      slaTargetHours: 2
    });

    const updated = await this.getAnalysisForStation(stationId);

    return {
      success: true,
      updatedAnalysis: updated,
      ticketId: ticket.id
    };
  }
}

export const predictiveEngine = PredictiveEngine.getInstance();
