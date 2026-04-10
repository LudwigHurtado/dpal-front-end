import React from 'react';
import type { MissionTask } from '../types';
import SectorCard from './SectorCard';

interface TaskListSectorProps {
  tasks: MissionTask[];
  onToggleTask: (taskId: string) => void;
  onGenerateWithAi: () => void;
  isGeneratingWithAi: boolean;
  aiError: string | null;
  onDismissAiError: () => void;
}

const TaskListSector: React.FC<TaskListSectorProps> = ({
  tasks,
  onToggleTask,
  onGenerateWithAi,
  isGeneratingWithAi,
  aiError,
  onDismissAiError,
}) => {
  return (
    <SectorCard title="Task List">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-600">Let AI review the report/mission and generate tasks.</p>
        <button
          type="button"
          onClick={onGenerateWithAi}
          disabled={isGeneratingWithAi}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {isGeneratingWithAi ? 'Generating...' : 'Generate with AI'}
        </button>
      </div>
      <ul className="space-y-1 rounded-lg border border-slate-300 bg-white p-2">
        {tasks.map((task) => (
          <li key={task.id} className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm">
            <button
              type="button"
              onClick={() => onToggleTask(task.id)}
              className="flex w-full items-center justify-between text-left text-slate-800"
            >
              <span>{task.done ? '☑' : '☐'} {task.title}</span>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">✓</span>
            </button>
          </li>
        ))}
      </ul>
      {aiError ? (
        <div className="mt-2 flex items-center justify-between rounded-md border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700">
          <span>{aiError}</span>
          <button type="button" onClick={onDismissAiError} className="rounded bg-rose-100 px-2 py-1">
            Dismiss
          </button>
        </div>
      ) : null}
    </SectorCard>
  );
};

export default TaskListSector;
