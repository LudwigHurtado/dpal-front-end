import React from 'react';
import type { MissionTask } from '../types';
import { mw } from '../missionWorkspaceTheme';
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
        <p className={`${mw.textMuted} max-w-[65%]`}>Let AI review the report/mission and generate tasks.</p>
        <button
          type="button"
          onClick={onGenerateWithAi}
          disabled={isGeneratingWithAi}
          className={`${mw.btnPrimary} shrink-0 disabled:opacity-50`}
        >
          {isGeneratingWithAi ? 'Generating...' : 'Generate with AI'}
        </button>
      </div>
      <ul className={`space-y-1 rounded-lg border border-teal-900/50 bg-slate-950/40 p-2`}>
        {tasks.map((task) => (
          <li key={task.id} className="rounded-md border border-teal-900/40 bg-teal-950/40 p-2 text-sm">
            <button
              type="button"
              onClick={() => onToggleTask(task.id)}
              className="flex w-full items-center justify-between text-left text-teal-100/95"
            >
              <span>
                {task.done ? '☑' : '☐'} {task.title}
              </span>
              <span className="rounded border border-teal-700/50 bg-teal-950/80 px-2 py-0.5 text-xs text-teal-300">✓</span>
            </button>
          </li>
        ))}
      </ul>
      {aiError ? (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-rose-800/50 bg-rose-950/40 p-2 text-xs text-rose-200">
          <span>{aiError}</span>
          <button type="button" onClick={onDismissAiError} className="rounded border border-rose-800/60 bg-rose-950/60 px-2 py-1 text-rose-100">
            Dismiss
          </button>
        </div>
      ) : null}
    </SectorCard>
  );
};

export default TaskListSector;
