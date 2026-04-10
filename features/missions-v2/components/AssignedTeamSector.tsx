import React, { useState } from 'react';
import type { TeamMemberAssignment } from '../types';
import SectorCard from './SectorCard';

interface AssignedTeamSectorProps {
  team: TeamMemberAssignment[];
  onUpdateMember: (memberId: string, updates: { name: string; profile: string }) => void;
  onDeleteMember: (memberId: string) => void;
  onSendPrivateMessage: (memberId: string, message: string) => void;
}

const AssignedTeamSector: React.FC<AssignedTeamSectorProps> = ({ team, onUpdateMember, onDeleteMember, onSendPrivateMessage }) => {
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
          <li key={member.id} className="rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {initials(member.name)}
              </span>
              <div className="flex-1">
                <p className="font-semibold">{member.role}: {member.name}</p>
                <p className="text-xs text-slate-500">Profile: {member.profile}</p>
              </div>
              <button
                type="button"
                onClick={() => startEdit(member)}
                className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDeleteMember(member.id)}
                className="rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessagingId(member.id);
                  setPrivateMessage('');
                }}
                className="rounded bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700"
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
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <input
                  value={editProfile}
                  onChange={(e) => setEditProfile(e.target.value)}
                  placeholder="@profile"
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <div className="sm:col-span-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateMember(member.id, { name: editName, profile: editProfile });
                      setEditingId(null);
                    }}
                    className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {messagingId === member.id ? (
              <div className="mt-2 rounded border border-violet-200 bg-violet-50 p-2">
                <p className="mb-1 text-xs font-semibold text-violet-800">Private message to {member.name}</p>
                <textarea
                  value={privateMessage}
                  onChange={(e) => setPrivateMessage(e.target.value)}
                  placeholder="Write a private instruction..."
                  rows={3}
                  className="w-full rounded border border-violet-200 bg-white px-2 py-1 text-sm"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSendPrivateMessage(member.id, privateMessage);
                      setMessagingId(null);
                      setPrivateMessage('');
                    }}
                    className="rounded bg-violet-600 px-2 py-1 text-xs font-semibold text-white"
                  >
                    Send Private
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMessagingId(null);
                      setPrivateMessage('');
                    }}
                    className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {member.privateMessages?.length ? (
              <p className="mt-2 text-xs text-slate-500">
                Last private message: {new Date(member.privateMessages[member.privateMessages.length - 1].sentAt).toLocaleString()}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </SectorCard>
  );
};

export default AssignedTeamSector;
