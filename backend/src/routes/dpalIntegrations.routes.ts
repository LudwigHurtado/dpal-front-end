import { Router, type Request, type Response } from "express";
import { ZodError } from "zod";
import {
  getProviderStatus,
  getCityIntelligence,
  getFloodRisk,
  getAirQuality,
  getOpenAqDebugSnapshot,
  getSatelliteValidation,
  geocodeLocation,
  getGeoLedgerReverseLocation,
  estimateEmissions,
  verifyChainHash,
  buildEvidencePacketPreview,
  buildCarbonEstimatePacket,
  buildBlockchainAnchorPreview,
  getUsgsWaterSiteSnapshot,
  getNwsActiveAlertsPacket,
} from "../services/publicApiAdapters.js";

const router = Router();

/**
 * GET /api/integrations/status
 * Shows which providers are configured without leaking secrets.
 */
router.get("/status", (_req: Request, res: Response) => {
  res.json({ ok: true, providers: getProviderStatus() });
});

/**
 * GET /api/integrations/city-intelligence?lat=-17.78&lng=-63.18&city=Santa%20Cruz
 * Combines weather, radar, air, and geolocation into one DPAL city intelligence packet.
 */
router.get("/city-intelligence", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const city = String(req.query.city || "Selected City");

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, error: "lat and lng query parameters are required" });
    }

    const packet = await getCityIntelligence({ lat, lng, city });
    res.json({ ok: true, packet });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "city-intelligence failed" });
  }
});

/**
 * GET /api/integrations/flood-risk?lat=-17.78&lng=-63.18
 */
/**
 * GET /api/integrations/water/usgs/site-snapshot?site=01646500
 * GET /api/integrations/water/usgs/site-snapshot?lat=38.95&lng=-77.13
 * Optional: parameters=00060,00065,00010
 */
router.get("/water/usgs/site-snapshot", async (req: Request, res: Response) => {
  try {
    const siteRaw = req.query.site != null ? String(req.query.site).trim() : "";
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const parameters =
      req.query.parameters != null && String(req.query.parameters).trim() !== ""
        ? String(req.query.parameters)
        : undefined;

    if (!siteRaw && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
      return res.status(400).json({ ok: false, error: "Provide either site or lat/lng." });
    }

    const packet = await getUsgsWaterSiteSnapshot(
      siteRaw ? { site: siteRaw, parameters } : { lat, lng, parameters }
    );
    res.json({ ok: true, packet });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "usgs site-snapshot failed" });
  }
});

/**
 * GET /api/integrations/weather/nws/alerts?lat=38.949&lng=-77.127&label=Potomac%20Little%20Falls
 */
router.get("/weather/nws/alerts", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, error: "lat and lng query parameters are required." });
    }

    const label = req.query.label != null ? String(req.query.label) : undefined;
    const packet = await getNwsActiveAlertsPacket({ lat, lng, label });
    res.json({ ok: true, packet });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "nws alerts failed" });
  }
});

router.get("/flood-risk", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, error: "lat and lng query parameters are required" });
    }

    const result = await getFloodRisk({ lat, lng });
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "flood-risk failed" });
  }
});

/**
 * GET /api/integrations/air-quality?lat=-17.78&lng=-63.18
 */
router.get("/air-quality", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, error: "lat and lng query parameters are required" });
    }

    const result = await getAirQuality({ lat, lng });
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "air-quality failed" });
  }
});

/**
 * GET /api/integrations/openaq-debug?lat=&lng=
 * Temporary: inspect raw OpenAQ v3 shapes (no API key in response). Remove when mapping is stable.
 */
router.get("/openaq-debug", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, error: "lat and lng query parameters are required" });
    }

    const snapshot = await getOpenAqDebugSnapshot(lat, lng);
    res.json(snapshot);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "openaq-debug failed" });
  }
});

/**
 * GET /api/integrations/satellite-validation?lat=&lng=&signalType=&satelliteValue=
 * Ground-truth validation layer: compares a satellite (or modeled) signal with nearby OpenAQ readings.
 */
router.get("/satellite-validation", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, error: "lat and lng query parameters are required" });
    }

    const signalType = String(req.query.signalType || "pm25").trim() || "pm25";
    const satelliteRaw = req.query.satelliteValue != null ? String(req.query.satelliteValue) : "";
    const satelliteNumeric = Number(satelliteRaw);

    const result = await getSatelliteValidation({
      lat,
      lng,
      signalType,
      satelliteNumeric,
      satelliteRaw,
    });
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "satellite-validation failed" });
  }
});

/**
 * GET /api/integrations/geocode?text=Santa%20Cruz%20Bolivia
 */
router.get("/geocode", async (req: Request, res: Response) => {
  try {
    const text = String(req.query.text || "").trim();
    if (!text) return res.status(400).json({ ok: false, error: "text query parameter is required" });

    const result = await geocodeLocation(text);
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "geocode failed" });
  }
});

/**
 * GET /api/integrations/geoledger/reverse?lat=&lng=&label=
 * DPAL GeoLedger Location Validator: reverse-geocode coordinates via Geoapify into a structured packet.
 */
router.get("/geoledger/reverse", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, error: "lat and lng query parameters are required" });
    }

    const label = String(req.query.label ?? "");
    const packet = await getGeoLedgerReverseLocation({ lat, lng, label });
    res.json({ ok: true, packet });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "geoledger reverse failed" });
  }
});

/**
 * POST /api/integrations/emissions/estimate
 * Body:
 * {
 *   "activity_id": "electricity-supply_grid-source_residual_mix",
 *   "data_version": "^21",
 *   "parameters": { "energy": 100, "energy_unit": "kWh" }
 * }
 */
router.post("/emissions/estimate", async (req: Request, res: Response) => {
  try {
    const result = await estimateEmissions(req.body);
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "emissions estimate failed" });
  }
});

/**
 * POST /api/integrations/carbon/estimate-packet
 * DPAL carbon/MRV pre-screening packet from Climatiq estimate data (advisory).
 */
router.post("/carbon/estimate-packet", async (req: Request, res: Response) => {
  try {
    const packet = await buildCarbonEstimatePacket(req.body);
    res.json({ ok: true, packet });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        ok: false,
        error: err.flatten ? err.flatten() : err.message,
      });
    }
    const msg = err instanceof Error ? err.message : "carbon estimate packet failed";
    res.status(500).json({ ok: false, error: msg });
  }
});

/**
 * GET /api/integrations/blockchain/verify?chainid=1&txhash=0x...
 */
router.get("/blockchain/verify", async (req: Request, res: Response) => {
  try {
    const txhash = String(req.query.txhash || "").trim();
    const chainid = String(req.query.chainid || "1").trim();
    if (!txhash) return res.status(400).json({ ok: false, error: "txhash query parameter is required" });

    const result = await verifyChainHash({ chainid, txhash });
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "blockchain verify failed" });
  }
});

/**
 * POST /api/integrations/blockchain/anchor-preview
 * Preview-only anchor envelope for a DPAL evidenceHash (no transaction broadcast).
 */
router.post("/blockchain/anchor-preview", async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const evidenceHash =
      body.evidenceHash != null && String(body.evidenceHash).trim() !== ""
        ? String(body.evidenceHash).trim()
        : "";
    if (!evidenceHash) {
      return res.status(400).json({
        ok: false,
        error: "evidenceHash is required in the JSON body",
      });
    }

    const packet = buildBlockchainAnchorPreview({
      evidenceHash,
      packetType: body.packetType,
      sourceModule: body.sourceModule,
      location: body.location,
      projectId: body.projectId,
      validatorStatus: body.validatorStatus,
    });
    res.json({ ok: true, packet });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "blockchain anchor preview failed" });
  }
});

/**
 * POST /api/integrations/evidence/packet-preview
 * Builds a normalized DPAL packet object. This is not blockchain anchoring yet;
 * it is the clean data envelope that later gets hashed/anchored.
 */
router.post("/evidence/packet-preview", async (req: Request, res: Response) => {
  try {
    const packet = buildEvidencePacketPreview(req.body);
    res.json({ ok: true, packet });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "packet preview failed" });
  }
});

export default router;
