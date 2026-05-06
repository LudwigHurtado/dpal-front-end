// src/field-os/replay/evidenceReplayService.ts

import { EvidenceReplay, EvidenceTimelineEvent } from '../types';
import { EvidenceTimelineService } from '../memory/evidenceTimelineService';

export class EvidenceReplayService {
  constructor(private timelineService: EvidenceTimelineService) {}

  async reconstructCase(caseId: string): Promise<EvidenceReplay> {
    const timeline = await this.timelineService.buildTimeline(caseId);

    const summary = this.generateSummary(timeline);

    return {
      caseId,
      timeline,
      summary,
    };
  }

  private generateSummary(timeline: EvidenceTimelineEvent[]): string {
    if (timeline.length === 0) {
      return 'No timeline events found for this case.';
    }

    const eventCounts = timeline.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const startDate = timeline[0]?.timestamp.toISOString().split('T')[0];
    const endDate = timeline[timeline.length - 1]?.timestamp.toISOString().split('T')[0];

    let summary = `Case timeline from ${startDate} to ${endDate}. `;
    summary += `Total events: ${timeline.length}. `;

    const eventTypes = Object.keys(eventCounts);
    if (eventTypes.length > 0) {
      summary += `Event breakdown: ${eventTypes.map(type => `${eventCounts[type]} ${type}`).join(', ')}.`;
    }

    // Add confidence assessment
    const highConfidenceEvents = timeline.filter(e => e.confidence === 'high' || e.confidence === 'verified').length;
    const totalEvents = timeline.length;
    const confidenceRatio = totalEvents > 0 ? highConfidenceEvents / totalEvents : 0;

    if (confidenceRatio > 0.8) {
      summary += ' High confidence case with strong evidence chain.';
    } else if (confidenceRatio > 0.5) {
      summary += ' Medium confidence case with developing evidence.';
    } else {
      summary += ' Low confidence case requiring additional verification.';
    }

    return summary;
  }

  async exportTimeline(caseId: string, format: 'json' | 'text' = 'json'): Promise<string> {
    const replay = await this.reconstructCase(caseId);

    if (format === 'json') {
      return JSON.stringify(replay, null, 2);
    } else {
      let text = `Evidence Replay for Case ${caseId}\n\n`;
      text += `Summary: ${replay.summary}\n\n`;
      text += 'Timeline:\n';

      replay.timeline.forEach((event, index) => {
        text += `${index + 1}. ${event.timestamp.toISOString()} - ${event.type}: ${event.description}\n`;
        text += `   Confidence: ${event.confidence}\n`;
        if (event.data) {
          text += `   Data: ${JSON.stringify(event.data)}\n`;
        }
        text += '\n';
      });

      return text;
    }
  }
}