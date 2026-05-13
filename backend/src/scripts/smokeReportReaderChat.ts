import { handleReportReaderChat } from '../services/dpalReportReaderChatService';

async function main(): Promise<void> {
  const res = await handleReportReaderChat({
    question: 'What evidence is missing?',
    mode: 'evidence_audit',
    evidencePacket: { summary: 'demo packet', sources: ['landsat'], human_verified: false },
    messages: [],
  });
  if (!res.answer) throw new Error('missing answer');
  if (res.ok !== true) throw new Error('expected ok true');
  // eslint-disable-next-line no-console
  console.log('smoke:report-reader ok', { fallbackUsed: res.fallbackUsed, answerPreview: res.answer.slice(0, 160) });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
