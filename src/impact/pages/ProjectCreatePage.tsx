import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IM_PATHS } from '../routes/paths';
import type { ProjectType } from '../types/project';
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_ICONS } from '../types/project';
import * as projectSvc from '../services/impactProjectService';

const TYPES = Object.keys(PROJECT_TYPE_LABELS) as ProjectType[];

interface Form {
  title: string;
  type: ProjectType;
  address: string;
  country: string;
  lat: string;
  lng: string;
  radiusKm: string;
  areaHectares: string;
  baselineSummary: string;
  expectedOutcome: string;
  beneficiaryGroup: string;
  ownerOrg: string;
  startDate: string;
  tags: string;
}

const EMPTY: Form = {
  title: '', type: 'reforestation', address: '', country: '', lat: '', lng: '',
  radiusKm: '', areaHectares: '', baselineSummary: '', expectedOutcome: '',
  beneficiaryGroup: '', ownerOrg: '', startDate: '', tags: '',
};

const ProjectCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof Form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.address || !form.baselineSummary || !form.expectedOutcome) {
      setError('Title, address, baseline, and expected outcome are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await projectSvc.createProject({
        title: form.title,
        type: form.type,
        status: 'draft',
        ownerId: 'user-1',
        ownerOrg: form.ownerOrg || undefined,
        location: {
          address: form.address,
          country: form.country,
          boundary: {
            lat: parseFloat(form.lat) || 0,
            lng: parseFloat(form.lng) || 0,
            radiusKm: parseFloat(form.radiusKm) || undefined,
          },
        },
        areaHectares: parseFloat(form.areaHectares) || undefined,
        baselineSummary: form.baselineSummary,
        expectedOutcome: form.expectedOutcome,
        beneficiaryGroup: form.beneficiaryGroup,
        startDate: form.startDate || new Date().toISOString().split('T')[0],
        verificationStatus: 'submitted',
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      navigate(IM_PATHS.projects);
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="im-page" style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button className="im-btn im-btn-ghost" style={{ marginBottom: 12 }} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5' }}>New Environmental Project</div>
        <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>
          Saved as draft — submit for verification when ready.
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Basic info */}
        <div className="im-card">
          <div className="im-section-title" style={{ marginBottom: 12 }}>Basic Info</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="im-field">
              <label className="im-label">Project Title *</label>
              <input className="im-input" value={form.title} onChange={set('title')} placeholder="e.g. Cerro Verde Reforestation Corridor" />
            </div>
            <div className="im-field">
              <label className="im-label">Project Type</label>
              <select className="im-select" value={form.type} onChange={set('type')}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{PROJECT_TYPE_ICONS[t]} {PROJECT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="im-form-row">
              <div className="im-field">
                <label className="im-label">Organisation (optional)</label>
                <input className="im-input" value={form.ownerOrg} onChange={set('ownerOrg')} placeholder="EcoLand Foundation" />
              </div>
              <div className="im-field">
                <label className="im-label">Start Date</label>
                <input className="im-input" type="date" value={form.startDate} onChange={set('startDate')} />
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="im-card">
          <div className="im-section-title" style={{ marginBottom: 12 }}>Location</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="im-form-row">
              <div className="im-field">
                <label className="im-label">Address / Region *</label>
                <input className="im-input" value={form.address} onChange={set('address')} placeholder="Oaxaca, Mexico" />
              </div>
              <div className="im-field">
                <label className="im-label">Country Code</label>
                <input className="im-input" value={form.country} onChange={set('country')} placeholder="MX" maxLength={3} />
              </div>
            </div>
            <div className="im-form-row">
              <div className="im-field">
                <label className="im-label">Latitude</label>
                <input className="im-input" value={form.lat} onChange={set('lat')} placeholder="17.0732" type="number" step="any" />
              </div>
              <div className="im-field">
                <label className="im-label">Longitude</label>
                <input className="im-input" value={form.lng} onChange={set('lng')} placeholder="-96.7266" type="number" step="any" />
              </div>
            </div>
            <div className="im-form-row">
              <div className="im-field">
                <label className="im-label">Radius (km)</label>
                <input className="im-input" value={form.radiusKm} onChange={set('radiusKm')} placeholder="12" type="number" step="any" />
              </div>
              <div className="im-field">
                <label className="im-label">Area (hectares)</label>
                <input className="im-input" value={form.areaHectares} onChange={set('areaHectares')} placeholder="1400" type="number" step="any" />
              </div>
            </div>
          </div>
        </div>

        {/* Outcome */}
        <div className="im-card">
          <div className="im-section-title" style={{ marginBottom: 12 }}>Baseline & Outcomes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="im-field">
              <label className="im-label">Baseline Summary *</label>
              <textarea className="im-textarea" value={form.baselineSummary} onChange={set('baselineSummary')}
                placeholder="Describe the current degraded state before intervention..." />
            </div>
            <div className="im-field">
              <label className="im-label">Expected Outcome *</label>
              <textarea className="im-textarea" value={form.expectedOutcome} onChange={set('expectedOutcome')}
                placeholder="What measurable outcome will be achieved..." />
            </div>
            <div className="im-field">
              <label className="im-label">Beneficiary Group</label>
              <input className="im-input" value={form.beneficiaryGroup} onChange={set('beneficiaryGroup')}
                placeholder="3 indigenous communities (~2,200 people)" />
            </div>
            <div className="im-field">
              <label className="im-label">Tags (comma-separated)</label>
              <input className="im-input" value={form.tags} onChange={set('tags')} placeholder="REDD+, indigenous-led, canopy" />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 13, color: '#f87171', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="im-btn im-btn-primary" disabled={saving}>
            {saving ? <><span className="im-spinner" style={{ width: 14, height: 14 }} /> Saving…</> : 'Save as Draft'}
          </button>
          <button type="button" className="im-btn im-btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectCreatePage;
