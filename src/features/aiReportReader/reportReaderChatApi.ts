import { buildApiUrl } from '../../config/api';
import { API_ROUTES } from '../../../constants';

export type ReportReaderChatMode =
  | 'report_reader'
  | 'evidence_audit'
  | 'validator_review'
  | 'next_steps';

export type ReportReaderChatMessage = { role: 'user' | 'assistant'; content: string };

export type ReportReaderChatRequest = {
  reportId?: string;
  roomId?: string;
  runId?: string;
  evidencePacket?: unknown;
  reportSnapshot?: unknown;
  commandCenterRun?: unknown;
  messages: ReportReaderChatMessage[];
  question: string;
  mode?: ReportReaderChatMode;
};

export type ReportReaderChatResponse = {
  ok: true;
  answer: string;
  groundedSummary: string;
  evidenceUsed: string[];
  missingEvidence: string[];
  cannotConclude: string[];
  recommendedNextSteps: string[];
  safetyWarnings: string[];
  modulesReferenced: string[];
  generatedAt: string;
  fallbackUsed?: boolean;
};

export async function postReportReaderChat(body: ReportReaderChatRequest): Promise<ReportReaderChatResponse> {
  const url = buildApiUrl(API_ROUTES.DPAL_ASSISTANT_REPORT_READER_CHAT);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as ReportReaderChatResponse & { ok?: boolean; error?: string };
  if (!res.ok || data.ok !== true) {
    throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${res.status}`);
  }
  return data as ReportReaderChatResponse;
}
