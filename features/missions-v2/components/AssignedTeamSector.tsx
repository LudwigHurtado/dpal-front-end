import React, { useState } from 'react';
import type { TeamMemberAssignment } from '../types';
import { mw } from '../missionWorkspaceTheme';
import SectorCard from './SectorCard';

interface AssignedTeamSectorProps {
  team: TeamMemberAssignment[];
  onUpdateMember: (memberId: string, updates: { name: string; profile: string }) => void;
  onDeleteMember: (memberId: string) => void;
  onSendPrivateMessage: (memberId: string, message: string) => void;
}

const AssignedTeamSector: React.FC<AssignedTeamSectorProps> = ({
  team,
  onUpdateMember,
  onDeleteMember,
  onSendPrivateMessage,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editProfile, setEditProfile] = useState('');
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [privateMessage, setPrivateMessage] = useState('');

  const initials = (name: string) =>
    name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const startEdit = (member: TeamMemberAssignment) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditProfile(member.profile);
  };

  return (
    <SectorCard title="Assigned Team">
      <ul className="space-y-2">
        {team.map((member) => (
          <li
            key={member.id}
            className="rounded-md border border-teal-900/50 bg-slate-950/50 p-2 text-sm text-teal-100/90"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-teal-700/40 bg-teal-950/80 text-xs font-bold text-teal-200">
                {initials(member.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-teal-50">
                  {member.role}: {member.name}
                </p>
                <p className={`text-xs ${mw.textMuted}`}>Profile: {member.profile}</p>
              </div>
              <button
                type="button"
                onClick={() => startEdit(member)}
                className="rounded-lg border border-teal-800/60 bg-teal-950/70 px-2 py-1 text-xs font-semibold text-teal-200 hover:bg-teal-900/80"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDeleteMember(member.id)}
                className="rounded-lg border border-rose-800/50 bg-rose-950/40 px-2 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-950/70"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessagingId(member.id);
                  setPrivateMessage('');
                }}
                className="rounded-lg border border-violet-800/50 bg-violet-950/40 px-2 py-1 text-xs font-semibold text-violet-200 hover:bg-violet-950/70"
              >
                Message
              </button>
            </div>
            {editingId === member.id ? (
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Member name"
                  className={mw.field}
                />
                <input
                  value={editProfile}
                  onChange={(e) => setEditProfile(e.target.value)}
                  placeholder="@profile"
                  className={mw.field}
                />
                <div className="flex gap-2 sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateMember(member.id, { name: editName, profile: editProfile });
                      setEditingId(null);
                    }}
                    className="rounded-lg border border-emerald-700/50 bg-emerald-950/50 px-2 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-950/80"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-teal-900/60 bg-teal-950/60 px-2 py-1 text-xs font-semibold text-teal-200 hover:bg-teal-900/80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {messagingId === member.id ? (
              <div className="mt-2 rounded-lg border border-violet-800/45 bg-violet-950/35 p-2">
                <p className="mb-1 text-xs font-semibold text-violet-200">Private message to {member.name}</p>
                <textarea
                  value={privateMessage}
                  onChange={(e) => setPrivateMessage(e.target.value)}
                  placeholder="Write a private instruction..."
                  rows={3}
                  className="w-full rounded-lg border border-violet-800/50 bg-slate-950/80 px-2 py-1 text-sm text-violet-100 placeholder:text-violet-700/70"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSendPrivateMessage(member.id, privateMessage);
                      setMessagingId(null);
                      setPrivateMessage('');
                    }}
                    className="rounded-lg border border-violet-600/60 bg-violet-900/80 px-2 py-1 text-xs font-semibold text-violet-50 hover:bg-violet-800/90"
                  >
                    Send Private
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMessagingId(null);
                      setPrivateMessage('');
                    }}
                    className="rounded-lg border border-teal-900/60 bg-teal-950/60 px-2 py-1 text-xs font-semibold text-teal-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {member.privateMessages?.length ? (
              <p className={`mt-2 text-xs ${mw.textMuted}`}>
                Last private message:{' '}
                {new Date(member.privateMessages[member.privateMessages.length - 1].sentAt).toLocaleString()}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </SectorCard>
  );
};

export default AssignedTeamSector;
