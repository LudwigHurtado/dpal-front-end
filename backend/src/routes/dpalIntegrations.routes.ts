import { Router, type Request, type Response } from "express";
import {
  getProviderStatus,
  getCityIntelligence,
  getFloodRisk,
  getAirQuality,
  getSatelliteValidation,
  geocodeLocation,
  estimateEmissions,
  verifyChainHash,
  buildEvidencePacketPreview,
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
