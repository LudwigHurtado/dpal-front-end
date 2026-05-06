// src/field-os/super-agent/memory/siteMemoryBridge.ts

import { CaseMemoryService } from './caseMemoryService';

export class SiteMemoryBridge {
  private caseMemory: CaseMemoryService;

  constructor() {
    this.caseMemory = new CaseMemoryService();
  }

  recordFinding(agent: string, finding: string, metadata?: any): string {
    return this.caseMemory.recordEntry(agent, 'finding', finding, metadata);
  }

  recordArtifact(agent: string, artifactType: string, artifactId: string): string {
    return this.caseMemory.recordEntry(agent, 'artifact', `${artifactType}: ${artifactId}`, { artifactType, artifactId });
  }

  recordAction(agent: string, action: string, result?: string): string {
    return this.caseMemory.recordEntry(agent, 'action', action, { result });
  }

  recordApproval(gateName: string, approvedBy: string, notes?: string): string {
    return this.caseMemory.recordEntry('HumanApprovalGate', 'approval', `${gateName} approved by ${approvedBy}`, { notes });
  }

  recordNote(source: string, note: string): string {
    return this.caseMemory.recordEntry(source, 'note', note);
  }

  getTimeline(): string {
    return this.caseMemory.export();
  }

  getFindings(): Array<{ agent: string; content: string; timestamp: Date }> {
    return this.caseMemory.getEntriesByType('finding').map((entry) => ({
      agent: entry.agent,
      content: entry.content,
      timestamp: entry.timestamp,
    }));
  }

  clear(): void {
    this.caseMemory.clear();
  }
}
