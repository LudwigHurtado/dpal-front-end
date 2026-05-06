// src/field-os/memory/siteMemoryService.ts

import { SiteMemoryEntry, SiteMemoryQuery } from '../types';

export class SiteMemoryService {
  private memory: SiteMemoryEntry[] = [];

  // TODO: Replace with actual persistence layer (database, localStorage, etc.)
  // For now, in-memory storage

  async storeEntry(entry: Omit<SiteMemoryEntry, 'id'>): Promise<string> {
    const id = `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullEntry: SiteMemoryEntry = {
      id,
      ...entry,
    };
    this.memory.push(fullEntry);
    return id;
  }

  async queryEntries(query: SiteMemoryQuery): Promise<SiteMemoryEntry[]> {
    return this.memory.filter(entry => {
      if (query.locationId && entry.locationId !== query.locationId) return false;
      if (query.reportId && entry.reportId !== query.reportId) return false;
      if (query.situationRoomId && entry.situationRoomId !== query.situationRoomId) return false;
      if (query.scanId && entry.scanId !== query.scanId) return false;
      if (query.blockchainHash && entry.blockchainHash !== query.blockchainHash) return false;
      if (query.type && entry.type !== query.type) return false;
      if (query.startDate && entry.timestamp < query.startDate) return false;
      if (query.endDate && entry.timestamp > query.endDate) return false;
      return true;
    });
  }

  async getEntryById(id: string): Promise<SiteMemoryEntry | null> {
    return this.memory.find(entry => entry.id === id) || null;
  }

  async updateEntry(id: string, updates: Partial<SiteMemoryEntry>): Promise<boolean> {
    const index = this.memory.findIndex(entry => entry.id === id);
    if (index === -1) return false;
    this.memory[index] = { ...this.memory[index], ...updates };
    return true;
  }

  async deleteEntry(id: string): Promise<boolean> {
    const index = this.memory.findIndex(entry => entry.id === id);
    if (index === -1) return false;
    this.memory.splice(index, 1);
    return true;
  }
}