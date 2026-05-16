import React from 'react';
import type { DmrvInputConfigType } from '../dmrvInputRegistry';
import type { DmrvDataSourceSettings } from '../services/dmrvInputConfigTypes';

type FieldProps = {
  settings: DmrvDataSourceSettings;
  onChange: (key: string, value: string | boolean) => void;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15';

function TextField({
  label,
  fieldKey,
  settings,
  onChange,
  type = 'text',
}: FieldProps & { label: string; fieldKey: string; type?: string }): React.ReactElement {
  return (
    <Field label={label}>
      <input
        type={type}
        className={inputClass}
        value={String(settings[fieldKey] ?? '')}
        onChange={(e) => onChange(fieldKey, e.target.value)}
      />
    </Field>
  );
}

function ToggleField({
  label,
  fieldKey,
  settings,
  onChange,
}: FieldProps & { label: string; fieldKey: string }): React.ReactElement {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <input
        type="checkbox"
        checked={Boolean(settings[fieldKey])}
        onChange={(e) => onChange(fieldKey, e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-[#1e3a5f]"
      />
      <span className="text-sm font-medium text-slate-800">{label}</span>
    </label>
  );
}

function SelectField({
  label,
  fieldKey,
  options,
  settings,
  onChange,
}: FieldProps & { label: string; fieldKey: string; options: string[] }): React.ReactElement {
  return (
    <Field label={label}>
      <select
        className={inputClass}
        value={String(settings[fieldKey] ?? '')}
        onChange={(e) => onChange(fieldKey, e.target.value)}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ConfigGrid({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function DmrvDataSourceFields({
  configType,
  settings,
  onChange,
}: {
  configType: DmrvInputConfigType;
  settings: DmrvDataSourceSettings;
  onChange: (key: string, value: string | boolean) => void;
}): React.ReactElement {
  const props: FieldProps = { settings, onChange };

  switch (configType) {
    case 'satellite':
      return (
        <ConfigGrid>
          <SelectField
            {...props}
            label="Provider"
            fieldKey="provider"
            options={['NASA', 'Sentinel', 'Landsat', 'PACE', 'Planetary Computer', 'Custom']}
          />
          <TextField {...props} label="Collection / product" fieldKey="collection" />
          <TextField {...props} label="Date range start" fieldKey="startDate" type="date" />
          <TextField {...props} label="Date range end" fieldKey="endDate" type="date" />
          <TextField {...props} label="Cloud cover limit (%)" fieldKey="cloudCoverLimit" />
          <TextField {...props} label="Resolution" fieldKey="resolution" />
          <ToggleField {...props} label="AOI required" fieldKey="aoiRequired" />
          <TextField {...props} label="Minimum coverage %" fieldKey="minimumCoveragePct" />
          <SelectField
            {...props}
            label="Refresh frequency"
            fieldKey="refreshFrequency"
            options={['daily', 'weekly', 'monthly', 'quarterly', 'on_demand']}
          />
        </ConfigGrid>
      );
    case 'lidar':
      return (
        <ConfigGrid>
          <TextField {...props} label="Provider" fieldKey="provider" />
          <TextField {...props} label="Point cloud source" fieldKey="pointCloudSource" />
          <TextField {...props} label="Vertical accuracy (m)" fieldKey="verticalAccuracy" />
          <ToggleField {...props} label="Ground classification required" fieldKey="groundClassificationRequired" />
          <ToggleField {...props} label="Canopy height model" fieldKey="canopyHeightModel" />
          <TextField {...props} label="Upload file / URL" fieldKey="uploadUrl" />
        </ConfigGrid>
      );
    case 'field-plots':
      return (
        <ConfigGrid>
          <TextField {...props} label="Plot ID" fieldKey="plotId" />
          <TextField {...props} label="Latitude" fieldKey="latitude" />
          <TextField {...props} label="Longitude" fieldKey="longitude" />
          <TextField {...props} label="Species / land cover" fieldKey="speciesLandCover" />
          <TextField {...props} label="Sample date" fieldKey="sampleDate" type="date" />
          <TextField {...props} label="Surveyor" fieldKey="surveyor" />
          <ToggleField {...props} label="Photos required" fieldKey="photosRequired" />
          <TextField {...props} label="Minimum plot count" fieldKey="minimumPlotCount" />
        </ConfigGrid>
      );
    case 'biomass':
      return (
        <ConfigGrid>
          <TextField {...props} label="Equation / model used" fieldKey="equationModel" />
          <TextField {...props} label="Units" fieldKey="units" />
          <TextField {...props} label="Conversion factor" fieldKey="conversionFactor" />
          <TextField {...props} label="Carbon fraction" fieldKey="carbonFraction" />
          <TextField {...props} label="Uncertainty %" fieldKey="uncertaintyPct" />
          <TextField {...props} label="QA/QC notes" fieldKey="qaQcNotes" />
        </ConfigGrid>
      );
    case 'activity':
      return (
        <ConfigGrid>
          <TextField {...props} label="Activity type" fieldKey="activityType" />
          <TextField {...props} label="Source document" fieldKey="sourceDocument" />
          <TextField {...props} label="Reporting entity" fieldKey="reportingEntity" />
          <TextField {...props} label="Emission / removal factor" fieldKey="emissionRemovalFactor" />
          <ToggleField {...props} label="Supporting attachment required" fieldKey="supportingAttachmentRequired" />
        </ConfigGrid>
      );
    case 'soil':
      return (
        <ConfigGrid>
          <TextField {...props} label="Lab name" fieldKey="labName" />
          <TextField {...props} label="Sample depth" fieldKey="sampleDepth" />
          <TextField {...props} label="Organic carbon %" fieldKey="organicCarbonPct" />
          <TextField {...props} label="Sample date" fieldKey="sampleDate" type="date" />
          <ToggleField {...props} label="Chain of custody required" fieldKey="chainOfCustodyRequired" />
        </ConfigGrid>
      );
    case 'iot':
      return (
        <ConfigGrid>
          <TextField {...props} label="Sensor ID" fieldKey="sensorId" />
          <TextField {...props} label="Sensor type" fieldKey="sensorType" />
          <TextField {...props} label="API endpoint" fieldKey="apiEndpoint" />
          <TextField {...props} label="Sampling interval" fieldKey="samplingInterval" />
          <TextField {...props} label="Calibration date" fieldKey="calibrationDate" type="date" />
          <ToggleField {...props} label="Tamper detection" fieldKey="tamperDetection" />
        </ConfigGrid>
      );
    case 'weather':
      return (
        <ConfigGrid>
          <TextField {...props} label="Provider" fieldKey="provider" />
          <TextField {...props} label="Station ID" fieldKey="stationId" />
          <TextField {...props} label="Variables monitored" fieldKey="variablesMonitored" />
          <TextField {...props} label="Date range start" fieldKey="startDate" type="date" />
          <TextField {...props} label="Date range end" fieldKey="endDate" type="date" />
          <TextField {...props} label="Gap tolerance" fieldKey="gapTolerance" />
        </ConfigGrid>
      );
    case 'fire':
      return (
        <ConfigGrid>
          <SelectField
            {...props}
            label="Provider"
            fieldKey="provider"
            options={['NASA FIRMS', 'Copernicus', 'Custom']}
          />
          <TextField {...props} label="Burn area source" fieldKey="burnAreaSource" />
          <TextField {...props} label="Confidence threshold" fieldKey="confidenceThreshold" />
          <TextField {...props} label="Date range start" fieldKey="startDate" type="date" />
          <TextField {...props} label="Date range end" fieldKey="endDate" type="date" />
          <TextField {...props} label="Severity index" fieldKey="severityIndex" />
        </ConfigGrid>
      );
    case 'grazing':
      return (
        <ConfigGrid>
          <TextField {...props} label="Herd count" fieldKey="herdCount" />
          <TextField {...props} label="Grazing period" fieldKey="grazingPeriod" />
          <TextField {...props} label="Area used (ha)" fieldKey="areaUsed" />
          <TextField {...props} label="Stocking rate" fieldKey="stockingRate" />
          <TextField {...props} label="Supporting records" fieldKey="supportingRecords" />
        </ConfigGrid>
      );
    default:
      return (
        <ConfigGrid>
          <TextField {...props} label="Source notes" fieldKey="notes" />
        </ConfigGrid>
      );
  }
}
