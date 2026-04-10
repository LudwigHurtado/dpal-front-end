import React from 'react';
import type { MissionTask } from '../types';
import SectorCard from './SectorCard';

interface TaskListSectorProps {
  tasks: MissionTask[];
  onToggleTask: (taskId: string) => void;
}

const TaskListSector: React.FC<TaskListSectorProps> = ({ tasks, onToggleTask }) => {
  return (
    <SectorCard title="Task List Sector" subtitle="Ordered checklist with proof requirements">
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-xs">
            <button
              type="button"
              onClick={() => onToggleTask(task.id)}
              className="w-full text-left font-semibold text-zinc-100"
            >
              {task.done ? '✓' : '○'} {task.title}
            </button>
            <p className="mt-1 text-zinc-400">Proof: {task.proofRequired}</p>
          </li>
        ))}
      </ul>
    </SectorCard>
  );
};

export default TaskListSector;
