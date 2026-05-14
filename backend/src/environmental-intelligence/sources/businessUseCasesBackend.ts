import type { BackendBusinessUseCase } from './sourceTypes';
import payload from './businessUseCases.payload.json';

export function getAllBusinessUseCases(): BackendBusinessUseCase[] {
  return payload as BackendBusinessUseCase[];
}
