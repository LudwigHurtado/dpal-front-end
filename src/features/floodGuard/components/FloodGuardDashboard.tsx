import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Camera,
  Database,
  Eye,
  FileText,
  Globe,
  MapPin,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  Waves,
} from '../../../../components/icons';
import {
  FLOOD_CITIES,
  FLOOD_ZONES_BY_CITY,
  MOCK_CAMERA_DETECTIONS,
  MOCK_CITIZEN_REPORTS,
  MOCK_HISTORICAL_INSIGHTS,
  MOCK_INITIAL_ALERT,
  MOCK_PUBLIC_MARKERS,
  MOCK_WEATHER_SIGNALS,
  SANTA_CRUZ_CITY,
} from '../mockData/santaCruzFloodData';
import {
  computeFloodRiskBatch,
  computeFloodRiskScore,
} from '../services/floodRiskEngine';
import {
  DEFAULT_FLOOD_ALERT_SETTINGS,
  draftFloodAlert,
} from '../services/floodAlertRouter';
import { buildFloodEvidencePacket } from '../services/floodEvidenceService';
import { floodGuardApi } from '../services/floodGuardApi';
import type {
  FloodAlert,
  FloodAlertLifecycle,
  FloodAlertSettings,
  FloodCameraDetection,
  FloodCity,
  FloodEvidencePacket,
  FloodRiskScore,
  FloodSituationMessage,
  FloodSituationParticipantRole,
  FloodSituationRoom,
  FloodZone,
} from '../floodGuardTypes';
import CityFloodMapView from './CityFloodMapView';
import FloodAlertFeed from './FloodAlertFeed';
import FloodRiskScoreCard from './FloodRiskScoreCard';
import FloodZoneDetailPanel from './FloodZoneDetailPanel';
import FloodEvidencePacketView from './FloodEvidencePacketView';
import FloodSituationRoomView from './FloodSituationRoomView';
import FloodCameraMonitorPanel from './FloodCameraMonitorPanel';
import FloodAlertSettingsPanel from './FloodAlertSettingsPanel';
import FloodAlertRoutingPanel from './FloodAlertRoutingPanel';
import FloodHistoricalAnalyticsPanel from './FloodHistoricalAnalyticsPanel';
import FloodValidatorWorkflowPanel from './FloodValidatorWorkflowPanel';
import FloodAgentMonitorPanel from './FloodAgentMonitorPanel';
import PublicFloodMapView from './PublicFloodMapView';
import FloodGuardStartPanel, {
  type FloodGuardDataMode,
  type FloodGuardSessionStatus,
  type FloodGuardWorkflowStepId,
} from './FloodGuardStartPanel';
import WaterIntelligenceWorkflowPanel from '../../waterIntelligence/components/WaterIntelligenceWorkflowPanel';
import WaterIntelligenceAssistant from '../../waterIntelligence/components/WaterIntelligenceAssistant';
import MapSourceGuidanceCard from '../../waterIntelligence/components/MapSourceGuidanceCard';
import { CITY_FLOODGUARD_WORKFLOW_PANEL_STEPS } from '../../waterIntelligence/waterIntelligenceWorkflow';

interface FloodGuardDashboardProps {
  onReturn?: () => void;
  actorName?: string;
  actorRole?: FloodSituationParticipantRole;
  /** Return to Water Intelligence launcher (`/floodguard` without query). */
  waterIntelligenceHome?: () => void;
  /** Auto-start session for investor walkthrough of the city demo. */
  investorDemoMode?: boolean;
}

type FloodGuardTab =
  | 'overview'
  | 'alerts'
  | 'agent_monitor'
  | 'evidence'
  | 'situation'
  | 'settings'
  | 'public_map'
  | 'analytics';

const TAB_DEFINITIONS: Array<{ id: FloodGuardTab; label: string; icon: React.ReactNode; description: string }> = [
  { id: 'overview',  label: 'City Flood Map',  icon: <MapPin className="w-3.5 h-3.5" />,        description: 'Flood zones, alerts, cameras, rivers, roads' },
  { id: 'alerts',    label: 'Live Detection',  icon: <Activity className="w-3.5 h-3.5" />,      description: 'Camera, satellite, citizen detections' },
  { id: 'agent_monitor', label: 'Agent Monitor', icon: <Bot className="w-3.5 h-3.5" />, description: 'Agentic screening, safety gate, safe mission dispatch' },
  { id: 'evidence',  label: 'Evidence Packet', icon: <FileText className="w-3.5 h-3.5" />,      description: 'Proof behind each alert' },
  { id: 'situation', label: 'Situation Room',  icon: <MessageSquare className="w-3.5 h-3.5" />, description: 'City officials, validators, responders coordinate' },
  { id: 'settings',  label: 'Alert Settings',  icon: <Megaphone className="w-3.5 h-3.5" />,     description: 'Thresholds, channels, escalation rules' },
  { id: 'public_map',label: 'Public Flood Map',icon: <Eye className="w-3.5 h-3.5" />,           description: 'Safe routes, danger zones, shelter points' },
  { id: 'analytics', label: 'Historical',      icon: <Database className="w-3.5 h-3.5" />,      description: 'Repeated zones and infrastructure failures' },
];

function buildScoresByZone(zones: FloodZone[]): Record<string, FloodRiskScore> {
  const inputs = zones.map((zone) => ({
    zone,
    cameras: MOCK_CAMERA_DETECTIONS.filter((c) => c.zoneId === zone.zoneId),
    citizenReports: MOCK_CITIZEN_REPORTS.filter((r) => r.zoneId === zone.zoneId),
    weather: MOCK_WEATHER_SIGNALS[zone.zoneId] ?? null,
  }));
  const batch = computeFloodRiskBatch(inputs);
  return Object.fromEntries(batch.map((score) => [score.zoneId, score]));
}

function buildScoresFromAlerts(zones: FloodZone[], alerts: FloodAlert[]): Record<string, FloodRiskScore> {
  const byZone = new Map(alerts.map((a) => [a.zoneId, a]));
  const inputs = zones.map((zone) => {
    const alert = byZone.get(zone.zoneId);
    return {
      zone,
      cameras: alert?.signalSnapshot.cameras ?? [],
      citizenReports: alert?.signalSnapshot.citizenReports ?? [],
      weather: alert?.signalSnapshot.weather ?? null,
    };
  });
  const batch = computeFloodRiskBatch(inputs);
  return Object.fromEntries(batch.map((s) => [s.zoneId, s]));
}

function buildInitialSituationRoom(alert: FloodAlert, actorName: string): FloodSituationRoom {
  const created = alert.createdAt;
  return {
    roomId: `ROOM-${alert.alertId}`,
    alertId: alert.alertId,
    zoneId: alert.zoneId,
    cityId: alert.cityId,
    status: 'open',
    participants: [
      { participantId: 'p-system', name: 'DPAL FloodGuard', role: 'observer', joinedAt: created },
      { participantId: 'p-self', name: actorName, role: 'city_official', joinedAt: created },
      { participantId: 'p-validator', name: 'Validator on call', role: 'validator', joinedAt: created },
    ],
    messages: [
      {
        messageId: 'msg-system-1',
        authorName: 'DPAL FloodGuard',
        authorRole: 'system',
        body:
          `Alert opened. ${alert.label} (L${alert.level}) for ${alert.zoneId}. ` +
          `Reasons: ${alert.reasons.join(' · ')}.`,
        timestamp: created,
      },
      {
        messageId: 'msg-system-2',
        authorName: 'DPAL FloodGuard',
        authorRole: 'system',
        body:
          'Routing draft prepared for ' +
          `${alert.audiences.length} audience(s) across ${alert.channels.length} channel(s). Awaiting validator review.`,
        timestamp: created,
      },
    ],
    createdAt: created,
  };
}

const FloodGuardDashboard: React.FC<FloodGuardDashboardProps> = ({
  onReturn,
  actorName = 'DPAL Operator',
  actorRole = 'city_official',
  waterIntelligenceHome,
  investorDemoMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<FloodGuardTab>('overview');
  const [city, setCity] = useState<FloodCity>(SANTA_CRUZ_CITY);
  const [zones, setZones] = useState<FloodZone[]>(FLOOD_ZONES_BY_CITY[SANTA_CRUZ_CITY.cityId] ?? []);
  const [scoresByZone, setScoresByZone] = useState<Record<string, FloodRiskScore>>(buildScoresByZone(FLOOD_ZONES_BY_CITY[SANTA_CRUZ_CITY.cityId] ?? []));
  const [alerts, setAlerts] = useState<FloodAlert[]>([MOCK_INITIAL_ALERT]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(MOCK_INITIAL_ALERT.zoneId);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(MOCK_INITIAL_ALERT.alertId);
  const [settings, setSettings] = useState<FloodAlertSettings>({
    ...DEFAULT_FLOOD_ALERT_SETTINGS,
    cityId: SANTA_CRUZ_CITY.cityId,
  });
  const [evidenceByAlert, setEvidenceByAlert] = useState<Record<string, FloodEvidencePacket>>({});
  const [generatingEvidence, setGeneratingEvidence] = useState(false);
  const [situationRoom, setSituationRoom] = useState<FloodSituationRoom | null>(
    buildInitialSituationRoom(MOCK_INITIAL_ALERT, actorName),
  );
  const [cameraDetections, setCameraDetections] = useState<FloodCameraDetection[]>(MOCK_CAMERA_DETECTIONS);
  const [feedSource, setFeedSource] = useState<{ zones: 'api' | 'mock'; alerts: 'api' | 'mock' }>({
    zones: 'mock',
    alerts: 'mock',
  });

  // Stage 12J — operator onboarding state.
  const [sessionStatus, setSessionStatus] = useState<FloodGuardSessionStatus>('not_started');
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [completedWorkflowSteps, setCompletedWorkflowSteps] = useState<FloodGuardWorkflowStepId[]>([]);

  const markWorkflowStep = useCallback((id: FloodGuardWorkflowStepId) => {
    setCompletedWorkflowSteps((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const handleStartSession = useCallback(() => {
    setSessionStartedAt((prev) => prev ?? new Date().toISOString());
    setSessionStatus((prev) => {
      if (prev !== 'not_started') return prev;
      return feedSource.zones === 'api' ? 'active' : 'demo_mode';
    });
  }, [feedSource.zones]);

  useEffect(() => {
    if (!investorDemoMode) return;
    setSessionStartedAt((prev) => prev ?? new Date().toISOString());
    setSessionStatus('demo_mode');
  }, [investorDemoMode]);

  const openCityWorkflowTab = useCallback((stepId: FloodGuardWorkflowStepId) => {
    const step = CITY_FLOODGUARD_WORKFLOW_PANEL_STEPS.find((s) => s.id === stepId);
    if (!step) return;
    if (step.relatedTab === 'overview') setActiveTab('overview');
    else if (step.relatedTab === 'agent_monitor') setActiveTab('agent_monitor');
    else if (step.relatedTab === 'evidence') setActiveTab('evidence');
    else setActiveTab('settings');
  }, []);

  // Auto-mark workflow steps based on what tabs the operator visits.
  useEffect(() => {
    if (sessionStatus === 'not_started') return;
    if (activeTab === 'overview') markWorkflowStep('review_city');
    if (activeTab === 'agent_monitor') markWorkflowStep('open_agent_monitor');
  }, [activeTab, sessionStatus, markWorkflowStep]);

  const zonesById = useMemo(() => Object.fromEntries(zones.map((zone) => [zone.zoneId, zone])), [zones]);
  const selectedZone = selectedZoneId ? zonesById[selectedZoneId] : null;
  const selectedAlert = useMemo(() => alerts.find((a) => a.alertId === selectedAlertId) ?? null, [alerts, selectedAlertId]);
  const selectedScore = selectedZone ? scoresByZone[selectedZone.zoneId] : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const zonesRes = await floodGuardApi.listZones(city.cityId);
      if (cancelled) return;

      if (!zonesRes.ok) {
        setFeedSource({ zones: 'mock', alerts: 'mock' });
        const nextZones = FLOOD_ZONES_BY_CITY[city.cityId] ?? [];
        setZones(nextZones);
        setScoresByZone(buildScoresByZone(nextZones));
        const localAlerts = [MOCK_INITIAL_ALERT].filter((a) => a.cityId === city.cityId);
        setAlerts(localAlerts.length ? localAlerts : []);
        setCameraDetections(MOCK_CAMERA_DETECTIONS.filter((c) => nextZones.some((z) => z.zoneId === c.zoneId)));
        if (nextZones[0]) setSelectedZoneId(nextZones[0].zoneId);
        setSelectedAlertId(localAlerts[0]?.alertId ?? null);
        setSituationRoom(localAlerts[0] ? buildInitialSituationRoom(localAlerts[0], actorName) : null);
        setSettings((prev) => ({ ...prev, cityId: city.cityId, updatedAt: new Date().toISOString() }));
        return;
      }

      setZones(zonesRes.data.zones);
      setSettings((prev) => ({ ...prev, cityId: city.cityId, updatedAt: new Date().toISOString() }));

      const alertsRes = await floodGuardApi.liveAlerts();
      if (cancelled) return;

      if (!alertsRes.ok || alertsRes.data.alerts.length === 0) {
        setFeedSource({ zones: 'api', alerts: 'mock' });
        setScoresByZone(buildScoresByZone(zonesRes.data.zones));
        const fallbackAlerts = [MOCK_INITIAL_ALERT].filter((a) => a.cityId === city.cityId);
        setAlerts(fallbackAlerts);
        setCameraDetections(MOCK_CAMERA_DETECTIONS.filter((c) => zonesRes.data.zones.some((z) => z.zoneId === c.zoneId)));
        if (fallbackAlerts[0]) {
          setSelectedAlertId(fallbackAlerts[0].alertId);
          setSelectedZoneId(fallbackAlerts[0].zoneId);
          setSituationRoom(buildInitialSituationRoom(fallbackAlerts[0], actorName));
        } else if (zonesRes.data.zones[0]) {
          setSelectedAlertId(null);
          setSelectedZoneId(zonesRes.data.zones[0].zoneId);
          setSituationRoom(null);
        }
        return;
      }

      setFeedSource({ zones: 'api', alerts: 'api' });
      const alertsList = alertsRes.data.alerts;
      setAlerts(alertsList);
      const cams = alertsList.flatMap((a) => a.signalSnapshot.cameras);
      setCameraDetections([...new Map(cams.map((c) => [c.detectionId, c])).values()]);
      setScoresByZone(buildScoresFromAlerts(zonesRes.data.zones, alertsList));

      const primary = alertsList.find((a) => a.cityId === city.cityId) ?? alertsList[0];
      setSelectedAlertId(primary.alertId);
      setSelectedZoneId(primary.zoneId);
      const sitRes = await floodGuardApi.getSituation(primary.alertId);
      if (cancelled) return;
      if (sitRes.ok) setSituationRoom(sitRes.data.room);
      else setSituationRoom(buildInitialSituationRoom(primary, actorName));
    })();
    return () => {
      cancelled = true;
    };
  }, [city.cityId, actorName]);

  const handleSelectAlert = (alertId: string) => {
    setSelectedAlertId(alertId);
    const alert = alerts.find((a) => a.alertId === alertId);
    if (alert) {
      setSelectedZoneId(alert.zoneId);
      if (!situationRoom || situationRoom.alertId !== alert.alertId) {
        setSituationRoom(buildInitialSituationRoom(alert, actorName));
      }
    }
  };

  const handleSubmitTestDetection = (detection: FloodCameraDetection) => {
    setCameraDetections((prev) => [detection, ...prev]);
    if (!selectedZone) return;

    const alertForZone = alerts.find((a) => a.zoneId === selectedZone.zoneId);
    const citizenReports =
      alertForZone && alertForZone.signalSnapshot.citizenReports.length > 0
        ? alertForZone.signalSnapshot.citizenReports
        : MOCK_CITIZEN_REPORTS.filter((r) => r.zoneId === selectedZone.zoneId);
    const weather =
      alertForZone?.signalSnapshot.weather ?? MOCK_WEATHER_SIGNALS[selectedZone.zoneId] ?? null;

    const cameras = [detection, ...cameraDetections].filter((c) => c.zoneId === selectedZone.zoneId);
    const score = computeFloodRiskScore({ zone: selectedZone, cameras, citizenReports, weather });
    setScoresByZone((prev) => ({ ...prev, [selectedZone.zoneId]: score }));

    const draft = draftFloodAlert({
      zone: selectedZone,
      riskScore: score,
      cameras,
      citizenReports,
      weather,
      settings,
      lifecycle: 'evidence_assembled',
    });

    setAlerts((prev) => {
      const existing = prev.find((a) => a.zoneId === selectedZone.zoneId);
      if (existing) {
        const updated: FloodAlert = {
          ...existing,
          ...draft,
          alertId: existing.alertId,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
          lifecycle: existing.lifecycle === 'resolved' ? existing.lifecycle : 'evidence_assembled',
        };
        return prev.map((a) => (a.alertId === existing.alertId ? updated : a));
      }
      return [draft, ...prev];
    });

    setSelectedAlertId((prev) => prev ?? draft.alertId);

    void floodGuardApi.postCameraAlert(detection).then((res) => {
      if (!res.ok || !res.data.alert) return;
      setFeedSource((fs) => ({ ...fs, alerts: 'api' }));
      setAlerts((prev) => {
        const others = prev.filter((a) => a.zoneId !== res.data.alert!.zoneId);
        return [res.data.alert!, ...others];
      });
      void floodGuardApi.listZones(city.cityId).then((zr) => {
        if (!zr.ok) return;
        void floodGuardApi.liveAlerts().then((lr) => {
          if (!lr.ok) return;
          setScoresByZone(buildScoresFromAlerts(zr.data.zones, lr.data.alerts));
        });
      });
    });
  };

  const handleGenerateEvidence = async () => {
    if (!selectedAlert || !selectedScore) return;
    setGeneratingEvidence(true);
    try {
      const apiRes = await floodGuardApi.generateEvidencePacket(selectedAlert.alertId, actorName);
      if (apiRes.ok) {
        setEvidenceByAlert((prev) => ({ ...prev, [selectedAlert.alertId]: apiRes.data.packet }));
        setAlerts((prev) =>
          prev.map((a) =>
            a.alertId === selectedAlert.alertId
              ? {
                  ...a,
                  evidencePacketId: apiRes.data.packet.packetId,
                  lifecycle: a.lifecycle === 'ai_detected' ? 'evidence_assembled' : a.lifecycle,
                  updatedAt: new Date().toISOString(),
                }
              : a,
          ),
        );
        markWorkflowStep('generate_evidence');
        return;
      }
      const packet = await buildFloodEvidencePacket({
        alert: selectedAlert,
        riskScore: selectedScore,
        generatedBy: actorName,
      });
      setEvidenceByAlert((prev) => ({ ...prev, [selectedAlert.alertId]: packet }));
      setAlerts((prev) =>
        prev.map((a) =>
          a.alertId === selectedAlert.alertId
            ? { ...a, evidencePacketId: packet.packetId, lifecycle: a.lifecycle === 'ai_detected' ? 'evidence_assembled' : a.lifecycle, updatedAt: new Date().toISOString() }
            : a,
        ),
      );
      markWorkflowStep('generate_evidence');
    } finally {
      setGeneratingEvidence(false);
    }
  };

  const handleAnchorAlert = async () => {
    if (!selectedAlert) return;
    const packet = evidenceByAlert[selectedAlert.alertId];
    if (!packet) return;
    const apiRes = await floodGuardApi.anchorAlert(selectedAlert.alertId, { createdBy: actorName });
    if (apiRes.ok) {
      const record = apiRes.data.record;
      setEvidenceByAlert((prev) => ({
        ...prev,
        [selectedAlert.alertId]: {
          ...packet,
          ledgerRecordId: record.ledgerRecordId,
          anchoringHash: record.anchoringHash,
          ledgerAnchor: record,
          rainfallDigest: record.rainfallDigest,
          satelliteDigest: record.satelliteDigest,
          waterLevelDigest: record.waterLevelDigest,
          agentFindingsDigest: record.agentFindingsDigest,
          routingPreviewDigest: record.routingPreviewDigest,
        },
      }));
      setAlerts((prev) =>
        prev.map((a) =>
          a.alertId === selectedAlert.alertId
            ? {
                ...a,
                ledgerAnchorHash: record.anchoringHash,
                lifecycle: 'human_verified',
                updatedAt: new Date().toISOString(),
              }
            : a,
        ),
      );
      markWorkflowStep('anchor_evidence');
      return;
    }
    setAlerts((prev) =>
      prev.map((a) =>
        a.alertId === selectedAlert.alertId
          ? { ...a, ledgerAnchorHash: packet.contentHash, lifecycle: 'human_verified', updatedAt: new Date().toISOString() }
          : a,
      ),
    );
  };

  const handleAdvanceLifecycle = (lifecycle: FloodAlertLifecycle) => {
    if (!selectedAlert) return;
    setAlerts((prev) =>
      prev.map((a) =>
        a.alertId === selectedAlert.alertId
          ? { ...a, lifecycle, updatedAt: new Date().toISOString() }
          : a,
      ),
    );
  };

  const handleValidatorDecision = (decision: 'approved' | 'rejected' | 'needs_evidence') => {
    if (!selectedAlert) return;
    const decidedAt = new Date().toISOString();
    setAlerts((prev) =>
      prev.map((a) =>
        a.alertId === selectedAlert.alertId
          ? {
              ...a,
              lifecycle: decision === 'approved' ? 'city_notified' : decision === 'needs_evidence' ? 'human_review_pending' : 'archived',
              validatorReview: { decision, reviewerHandle: actorName, decidedAt },
              updatedAt: decidedAt,
            }
          : a,
      ),
    );
  };

  const handlePostSituationMessage = (message: FloodSituationMessage) => {
    if (!situationRoom) return;
    setSituationRoom({ ...situationRoom, messages: [...situationRoom.messages, message] });
  };

  const handleSelectCity = (cityId: string) => {
    const next = FLOOD_CITIES.find((c) => c.cityId === cityId);
    if (next) setCity(next);
  };

  const handleOpenEvidenceFromAgent = (zoneId: string, alertId: string | null) => {
    setSelectedZoneId(zoneId);
    if (alertId) setSelectedAlertId(alertId);
    const match = alerts.find((a) => a.zoneId === zoneId);
    if (match && !alertId) setSelectedAlertId(match.alertId);
    setActiveTab('evidence');
  };

  const evidencePacket = selectedAlert ? evidenceByAlert[selectedAlert.alertId] ?? null : null;

  // Stage 12J — derive onboarding panel inputs from current dashboard state.
  const dataMode: FloodGuardDataMode =
    feedSource.zones === 'api' || feedSource.alerts === 'api' ? 'api_connected' : 'local_fallback';
  const modeChips = useMemo(() => {
    const chips: string[] = [];
    chips.push(feedSource.zones === 'api' ? 'API zones' : 'Local zones');
    chips.push(feedSource.alerts === 'api' ? 'API alerts' : 'Local alerts');
    chips.push('Synthetic rainfall fallback');
    chips.push('AquaScan satellite fallback');
    chips.push('Mock ledger');
    chips.push('Preview routing only');
    return chips;
  }, [feedSource.alerts, feedSource.zones]);
  const recommendedNextStep = useMemo(() => {
    if (sessionStatus === 'not_started')
      return 'Press "Start Monitoring Session" to begin the guided workflow.';
    if (!completedWorkflowSteps.includes('open_agent_monitor'))
      return 'Open Agent Monitor and refresh zone evaluation.';
    if (!completedWorkflowSteps.includes('generate_evidence'))
      return 'Open the Evidence Packet tab and generate the packet for the selected alert.';
    if (!completedWorkflowSteps.includes('anchor_evidence'))
      return 'Anchor the evidence packet on the DPAL ledger.';
    if (!completedWorkflowSteps.includes('open_verification'))
      return 'Open the public verification page from the ledger record.';
    return 'Workflow complete — record is anchored and publicly verifiable.';
  }, [sessionStatus, completedWorkflowSteps]);

  const startPanelLegal =
    'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.';

  const cityGuidedWorkflow =
    sessionStatus !== 'not_started' ? (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <WaterIntelligenceWorkflowPanel
            heading="FloodGuard City Demo workflow"
            subheading="Santa Cruz de la Sierra pilot — preview routing only, mock ledger capable, remote-first screening before missions."
            steps={CITY_FLOODGUARD_WORKFLOW_PANEL_STEPS}
            completedIds={completedWorkflowSteps}
            onOpenRelated={openCityWorkflowTab}
            onMarkComplete={markWorkflowStep}
          />
        </div>
        <WaterIntelligenceAssistant
          context={{
            screen: 'city',
            completedCitySteps: completedWorkflowSteps.length,
            totalCitySteps: CITY_FLOODGUARD_WORKFLOW_PANEL_STEPS.length,
            mockLedger: true,
            fallbackLayers: modeChips.some((c) => {
              const x = c.toLowerCase();
              return x.includes('mock') || x.includes('fallback') || x.includes('synthetic');
            }),
          }}
        />
      </div>
    ) : null;

  return (
    <div className="space-y-4">
      <FloodGuardStartPanel
        projectName={`${city.name} FloodGuard Pilot`}
        cityName={city.name}
        cityCountry={city.country}
        dataMode={dataMode}
        modeChips={modeChips}
        sessionStatus={sessionStatus}
        sessionStartedAt={sessionStartedAt}
        activeAlertCount={alerts.length}
        selectedZoneCount={zones.length}
        recommendedNextStep={recommendedNextStep}
        completedSteps={completedWorkflowSteps}
        onStartSession={handleStartSession}
        onJumpToTab={(tab) => setActiveTab(tab)}
        legalDisclaimer={startPanelLegal}
        guidedWorkflowSlot={cityGuidedWorkflow}
      />

      <header
        className="rounded-2xl p-5 border dpal-border-subtle"
        style={{ background: 'var(--dpal-card)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {waterIntelligenceHome && (
                <button
                  type="button"
                  onClick={waterIntelligenceHome}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold dpal-text-muted hover:opacity-80"
                  style={{ background: 'var(--dpal-surface-alt)', border: '1px solid var(--dpal-border)' }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Water Intelligence
                </button>
              )}
              {onReturn && (
                <button
                  type="button"
                  onClick={onReturn}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold dpal-text-muted hover:opacity-80"
                  style={{ background: 'var(--dpal-surface-alt)', border: '1px solid var(--dpal-border)' }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Main menu
                </button>
              )}
              <span className="text-[10px] font-black uppercase tracking-[0.2em] dpal-text-muted">
                DPAL FloodGuard
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5"
                style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.4)' }}
              >
                Verified Flood Intelligence for Cities
              </span>
              <span className="text-[10px] dpal-text-muted hidden sm:inline">
                Zones: {feedSource.zones === 'api' ? 'API' : 'local'} · Alerts: {feedSource.alerts === 'api' ? 'API' : 'local'}
              </span>
            </div>
            <h1 className="mt-2 text-xl md:text-2xl font-extrabold flex items-center gap-2" style={{ color: 'var(--dpal-text-primary)' }}>
              <Waves className="w-6 h-6" style={{ color: 'var(--dpal-primary)' }} />
              FloodGuard Command Center · {city.name}
            </h1>
            <p className="mt-1 text-xs md:text-sm" style={{ color: 'var(--dpal-text-secondary)' }}>
              DPAL FloodGuard converts scattered flood signals — live cameras, satellite rainfall, water-index analysis,
              citizen reports, and official feeds — into a blockchain-anchored evidence packet for each flood-risk zone.
              FloodGuard supports city decisions and citizen awareness; it does not replace government emergency alerts.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <label className="text-[10px] uppercase tracking-wider dpal-text-muted">City</label>
            <select
              value={city.cityId}
              onChange={(e) => handleSelectCity(e.target.value)}
              className="rounded-lg px-2 py-1.5 text-sm"
              style={{
                background: 'var(--dpal-input-bg)',
                color: 'var(--dpal-input-text)',
                border: '1px solid var(--dpal-input-border)',
              }}
            >
              {FLOOD_CITIES.map((option) => (
                <option key={option.cityId} value={option.cityId}>
                  {option.name}, {option.country}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TAB_DEFINITIONS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
              style={{
                background: activeTab === tab.id ? 'rgba(34,211,238,0.18)' : 'var(--dpal-surface-alt)',
                color: activeTab === tab.id ? '#22d3ee' : 'var(--dpal-text-secondary)',
                border: `1px solid ${activeTab === tab.id ? 'rgba(34,211,238,0.4)' : 'var(--dpal-border)'}`,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'overview' && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <CityFloodMapView
              city={city}
              zones={zones}
              alerts={alerts}
              scoresByZone={scoresByZone}
              selectedZoneId={selectedZoneId}
              onSelectZone={(zoneId) => {
                setSelectedZoneId(zoneId);
                const alert = alerts.find((a) => a.zoneId === zoneId);
                if (alert) setSelectedAlertId(alert.alertId);
              }}
            />
            <MapSourceGuidanceCard variant="city" />
            {selectedZone && (
              <FloodZoneDetailPanel
                zone={selectedZone}
                score={scoresByZone[selectedZone.zoneId]}
                alert={alerts.find((a) => a.zoneId === selectedZone.zoneId) ?? null}
                weather={MOCK_WEATHER_SIGNALS[selectedZone.zoneId] ?? null}
                citizenReports={MOCK_CITIZEN_REPORTS.filter((r) => r.zoneId === selectedZone.zoneId)}
              />
            )}
          </div>
          <div className="space-y-4">
            {selectedZone && selectedScore && (
              <FloodRiskScoreCard zone={selectedZone} score={selectedScore} />
            )}
            <FloodAlertFeed
              alerts={alerts}
              zonesById={zonesById}
              selectedAlertId={selectedAlertId}
              onSelectAlert={handleSelectAlert}
            />
            <div
              className="rounded-2xl p-4 border dpal-border-subtle"
              style={{ background: 'var(--dpal-card)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
                <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
                  Investor positioning
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--dpal-text-secondary)' }}>
                Video AI can detect a flood. DPAL can prove where it happened, why the alert was triggered, who
                received it, what evidence supported it, and whether the city responded — that is the difference
                between a camera tool and a public accountability infrastructure.
              </p>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'alerts' && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <FloodAlertFeed
              alerts={alerts}
              zonesById={zonesById}
              selectedAlertId={selectedAlertId}
              onSelectAlert={handleSelectAlert}
            />
            {selectedZone && (
              <FloodCameraMonitorPanel
                zone={selectedZone}
                detections={cameraDetections.filter((c) => c.zoneId === selectedZone.zoneId)}
                onSubmitTestDetection={handleSubmitTestDetection}
              />
            )}
          </div>
          <div className="space-y-4">
            {selectedZone && selectedScore && (
              <FloodRiskScoreCard zone={selectedZone} score={selectedScore} />
            )}
            {selectedAlert && (
              <FloodValidatorWorkflowPanel
                alert={selectedAlert}
                onAdvance={handleAdvanceLifecycle}
                onValidatorDecision={handleValidatorDecision}
              />
            )}
          </div>
        </section>
      )}

      {activeTab === 'agent_monitor' && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <FloodAgentMonitorPanel
              cityId={city.cityId}
              actorName={actorName}
              onOpenEvidenceForZone={handleOpenEvidenceFromAgent}
            />
          </div>
          <div className="space-y-4">
            <FloodAlertFeed
              alerts={alerts}
              zonesById={zonesById}
              selectedAlertId={selectedAlertId}
              onSelectAlert={handleSelectAlert}
            />
            {selectedZone && selectedScore && (
              <FloodRiskScoreCard zone={selectedZone} score={selectedScore} />
            )}
          </div>
        </section>
      )}

      {activeTab === 'evidence' && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <FloodEvidencePacketView
              packet={evidencePacket}
              onGenerate={selectedAlert ? handleGenerateEvidence : undefined}
              onAnchor={evidencePacket ? handleAnchorAlert : undefined}
              generating={generatingEvidence}
            />
            {selectedZone && (
              <FloodZoneDetailPanel
                zone={selectedZone}
                score={scoresByZone[selectedZone.zoneId]}
                alert={selectedAlert}
                weather={MOCK_WEATHER_SIGNALS[selectedZone.zoneId] ?? null}
                citizenReports={MOCK_CITIZEN_REPORTS.filter((r) => r.zoneId === selectedZone.zoneId)}
              />
            )}
          </div>
          <div className="space-y-4">
            {selectedZone && selectedScore && (
              <FloodRiskScoreCard zone={selectedZone} score={selectedScore} />
            )}
            <FloodAlertFeed
              alerts={alerts}
              zonesById={zonesById}
              selectedAlertId={selectedAlertId}
              onSelectAlert={handleSelectAlert}
            />
          </div>
        </section>
      )}

      {activeTab === 'situation' && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {situationRoom ? (
              <FloodSituationRoomView
                room={situationRoom}
                alert={selectedAlert}
                currentParticipantName={actorName}
                currentParticipantRole={actorRole}
                onPostMessage={handlePostSituationMessage}
              />
            ) : (
              <div
                className="rounded-2xl p-5 border dpal-border-subtle text-xs dpal-text-muted"
                style={{ background: 'var(--dpal-card)' }}
              >
                Select an alert to open its situation room.
              </div>
            )}
          </div>
          <div className="space-y-4">
            {selectedAlert && (
              <FloodValidatorWorkflowPanel
                alert={selectedAlert}
                onAdvance={handleAdvanceLifecycle}
                onValidatorDecision={handleValidatorDecision}
              />
            )}
            {selectedZone && (
              <FloodZoneDetailPanel
                zone={selectedZone}
                score={scoresByZone[selectedZone.zoneId]}
                alert={selectedAlert}
                weather={MOCK_WEATHER_SIGNALS[selectedZone.zoneId] ?? null}
                citizenReports={MOCK_CITIZEN_REPORTS.filter((r) => r.zoneId === selectedZone.zoneId)}
              />
            )}
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <FloodAlertSettingsPanel settings={settings} onChange={setSettings} />
            <FloodAlertRoutingPanel alert={selectedAlert} actorName={actorName} />
          </div>
          <div className="space-y-4">
            <div
              className="rounded-2xl p-4 border dpal-border-subtle"
              style={{ background: 'var(--dpal-card)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--dpal-warning, #facc15)' }} />
                <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
                  Why this matters
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--dpal-text-secondary)' }}>
                Different audiences need different alerts at different thresholds. City officials, schools,
                emergency services, and validators see what they need — not what they don’t. NWS / CAP feeds remain
                authoritative; DPAL only adds verified civic context.
              </p>
            </div>
            <div
              className="rounded-2xl p-4 border dpal-border-subtle"
              style={{ background: 'var(--dpal-card)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Camera className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
                <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
                  Camera intake URL
                </div>
              </div>
              <code
                className="block text-[11px] font-mono break-all"
                style={{ color: 'var(--dpal-text-primary)' }}
              >
                POST /api/floodguard/camera-alert
              </code>
              <p className="text-[11px] dpal-text-muted mt-2">
                Submit detections like &#123;label, confidence, cameraId, timestamp, streamUrl&#125;.
              </p>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'public_map' && (
        <section>
          <PublicFloodMapView
            city={city}
            zones={zones}
            alerts={alerts}
            scoresByZone={scoresByZone}
            publicMarkers={MOCK_PUBLIC_MARKERS.filter((m) => m.cityId === city.cityId)}
          />
        </section>
      )}

      {activeTab === 'analytics' && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <FloodHistoricalAnalyticsPanel
              insights={MOCK_HISTORICAL_INSIGHTS.filter((insight) => insight.cityId === city.cityId)}
            />
          </div>
          <div className="space-y-4">
            <div
              className="rounded-2xl p-4 border dpal-border-subtle"
              style={{ background: 'var(--dpal-card)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
                <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
                  DPAL Flood Truth Layer
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--dpal-text-secondary)' }}>
                FloodGuard turns each alert into a long-term civic record — repeated danger zones, slowest
                response areas, drainage failure patterns — so cities can prevent the next flood, not only react
                to it.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default FloodGuardDashboard;
