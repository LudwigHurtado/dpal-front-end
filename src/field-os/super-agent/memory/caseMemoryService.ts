// src/field-os/super-agent/memory/caseMemoryService.ts

export interface CaseMemoryEntry {
  id: string;
  timestamp: Date;
  agent: string;
  type: 'finding' | 'artifact' | 'action' | 'approval' | 'note';
  content: string;
  metadata: Record<string, any>;
}

export class CaseMemoryService {
  private entries: CaseMemoryEntry[] = [];

  recordEntry(agent: string, type: 'finding' | 'artifact' | 'action' | 'approval' | 'note', content: string, metadata?: Record<string, any>): string {
    const id = `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.entries.push({
      id,
      timestamp: new Date(),
      agent,
      type,
      content,
      metadata: metadata || {},
    });
    return id;
  }

  getEntriesByType(type: 'finding' | 'artifact' | 'action' | 'approval' | 'note'): CaseMemoryEntry[] {
    return this.entries.filter((entry) => entry.type === type);
  }

  getEntriesByAgent(agent: string): CaseMemoryEntry[] {
    return this.entries.filter((entry) => entry.agent === agent);
  }

  getAll(): CaseMemoryEntry[] {
    return [...this.entries];
  }

  export(): string {
    return this.entries
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map((entry) => `[${entry.timestamp.toISOString()}] ${entry.agent} > ${entry.type.toUpperCase()}: ${entry.content}`)
      .join('\n');
  }

  clear(): void {
    this.entries = [];
  }
}
