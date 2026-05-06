// src/field-os/super-agent/runtime/executionTraceService.ts
//
// TODO(backend persistence): append traces to durable store (caseId + trace row); replay on reopen.

export interface ExecutionTrace {
  /** Correlate traces when persisting to backend — optional until API exists. */
  caseId?: string;
  timestamp: Date;
  agent: string;
  step: string;
  tool: string;
  mode: 'dry-run' | 'live' | 'pending-adapter';
  inputSummary: string;
  outputSummary: string;
  status: 'success' | 'failed' | 'pending';
}

export class ExecutionTraceService {
  private traces: ExecutionTrace[] = [];

  recordTrace(
    agent: string,
    step: string,
    tool: string,
    mode: 'dry-run' | 'live' | 'pending-adapter',
    input: any,
    output: any,
    status: 'success' | 'failed' | 'pending' = 'success',
    caseId?: string
  ): void {
    this.traces.push({
      caseId,
      timestamp: new Date(),
      agent,
      step,
      tool,
      mode,
      inputSummary: this.summarize(input),
      outputSummary: this.summarize(output),
      status,
    });
  }

  private summarize(obj: any): string {
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object' && obj !== null) {
      const full = JSON.stringify(obj);
      return full.slice(0, 100) + (full.length > 100 ? '...' : '');
    }
    return String(obj);
  }

  getTraces(): ExecutionTrace[] {
    return [...this.traces];
  }

  /** Filter traces written with a given case id (in-memory; TODO(backend): query durable store by caseId). */
  getTracesForCase(caseId: string): ExecutionTrace[] {
    return this.traces.filter((trace) => trace.caseId === caseId);
  }

  getTracesByAgent(agent: string): ExecutionTrace[] {
    return this.traces.filter((trace) => trace.agent === agent);
  }

  export(): string {
    return this.traces
      .map((trace) => `[${trace.timestamp.toISOString()}] ${trace.agent} > ${trace.step} (${trace.mode}) — ${trace.status}`)
      .join('\n');
  }

  clear(): void {
    this.traces = [];
  }
}
