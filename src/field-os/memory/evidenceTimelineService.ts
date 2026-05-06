// src/field-os/memory/evidenceTimelineService.ts

import { EvidenceTimelineEvent, SiteMemoryEntry } from '../types';
import { SiteMemoryService } from './siteMemoryService';

export class EvidenceTimelineService {
  constructor(private siteMemory: SiteMemoryService) {}

  async buildTimeline(caseId: string): Promise<EvidenceTimelineEvent[]> {
    // Query all entries related to this case
    const entries = await this.siteMemory.queryEntries({ reportId: caseId });

    // Convert entries to timeline events
    const events: EvidenceTimelineEvent[] = entries.map(entry => ({
      timestamp: entry.timestamp,
      type: entry.type,
      description: this.generateDescription(entry),
      data: entry.data,
      confidence: this.determineConfidence(entry),
    }));

    // Sort by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return events;
  }

  private generateDescription(entry: SiteMemoryEntry): string {
    switch (entry.type) {
      case 'report':
        return `Report created: ${entry.data.description || 'New report'}`;
      case 'scan':
        return `Satellite scan performed: ${entry.data.type || 'Unknown scan'}`;
      case 'evidence':
        return `Evidence stored: ${entry.data.id || 'Evidence item'}`;
      case 'validation':
        return `Validation requested: ${entry.data.evidenceId || 'Evidence review'}`;
      case 'situation_room':
        return `Situation Room created: ${entry.data.id || 'Investigation room'}`;
      default:
        return `Activity: ${entry.type}`;
    }
  }

  private determineConfidence(entry: SiteMemoryEntry): 'low' | 'medium' | 'high' | 'verified' {
    // TODO: Implement confidence logic based on entry data
    // For now, default to medium
    return 'medium';
  }

  async addTimelineEvent(caseId: string, event: Omit<EvidenceTimelineEvent, 'timestamp'>): Promise<string> {
    const entry: Omit<SiteMemoryEntry, 'id'> = {
      reportId: caseId,
      type: event.type as any,
      timestamp: new Date(),
      data: event.data,
    };

    return await this.siteMemory.storeEntry(entry);
  }
}