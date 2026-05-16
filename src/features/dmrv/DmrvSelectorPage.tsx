import React, { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, Sparkles } from '../../../components/icons';
import { DmrvBreadcrumb, type Crumb } from './components/DmrvBreadcrumb';
import {
  getFamily,
  getType,
  type DmrvFamilyId,
} from './dmrvCatalog';
import { FamilySelectorView } from './views/FamilySelectorView';
import { ProfileWorkflowView } from './views/ProfileWorkflowView';
import { TypeSelectorView } from './views/TypeSelectorView';

type Step = 'families' | 'types' | 'workspace';

type Props = {
  onReturn?: () => void;
  onNavigate?: (view: string) => void;
};

const DmrvSelectorPage: React.FC<Props> = ({ onReturn, onNavigate }) => {
  const [step, setStep] = useState<Step>('families');
  const [familyId, setFamilyId] = useState<DmrvFamilyId | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);

  const family = familyId ? getFamily(familyId) : undefined;
  const dmrvType = familyId && typeId ? getType(familyId, typeId) : undefined;

  const goFamilies = useCallback(() => {
    setStep('families');
    setFamilyId(null);
    setTypeId(null);
  }, []);

  const goTypes = useCallback((id: DmrvFamilyId) => {
    setFamilyId(id);
    setTypeId(null);
    setStep('types');
  }, []);

  const goWorkspace = useCallback((tid: string) => {
    setTypeId(tid);
    setStep('workspace');
  }, []);

  const crumbs = useMemo(() => {
    const list: Crumb[] = [{ label: 'DPAL Adaptive DMRV Engine', onClick: step !== 'families' ? goFamilies : undefined }];
    if (family) {
      list.push({
        label: family.title,
        onClick: step === 'workspace' ? () => goTypes(family.id) : undefined,
      });
    }
    if (dmrvType) {
      list.push({ label: dmrvType.label });
    }
    return list;
  }, [step, family, dmrvType, goFamilies, goTypes]);

  const subtitle =
    step === 'families'
      ? 'Select a DMRV family to view environment-specific types and workflows.'
      : step === 'types'
        ? 'Select a DMRV type to open its profile, inputs, and nine-step workflow.'
        : 'Configure evaluation scope, evidence categories, and workflow steps.';

  return (
    <main className="min-h-screen bg-[#eef1f4] text-slate-900">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {onReturn && (
            <button
              type="button"
              onClick={onReturn}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Main menu
            </button>
          )}
          {step !== 'families' && (
            <button
              type="button"
              onClick={() => {
                if (step === 'workspace' && familyId) goTypes(familyId);
                else goFamilies();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>

        <header className="mb-4 text-center">
          <h1 className="text-xl font-black uppercase tracking-[0.12em] text-[#1e293b] md:text-2xl">
            DPAL Adaptive DMRV Engine
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600 md:text-base">{subtitle}</p>
        </header>

        <DmrvBreadcrumb crumbs={crumbs} />

        {step === 'families' && <FamilySelectorView onSelectFamily={goTypes} />}

        {step === 'types' && family && (
          <TypeSelectorView family={family} onSelectType={goWorkspace} />
        )}

        {step === 'workspace' && family && dmrvType && (
          <ProfileWorkflowView family={family} dmrvType={dmrvType} onNavigate={onNavigate} />
        )}

        <footer className="mt-8 grid grid-cols-1 items-center gap-4 rounded-2xl border border-slate-300 bg-[#e8f0f7] px-5 py-4 shadow-sm lg:grid-cols-[1fr_auto]">
          <div className="flex items-start gap-3 text-slate-900">
            <Sparkles className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" />
            <p className="text-sm font-bold leading-snug tracking-wide md:text-base">
              <span className="uppercase">Adaptive. Transparent. Scientific.</span>
              <span className="mt-1 block font-medium text-slate-700 md:mt-0 md:inline md:ml-2">
                One DMRV system, configured for any environment.
              </span>
            </p>
          </div>
          <p className="text-[10px] text-slate-600 lg:text-right">
            Page {step === 'families' ? '1' : step === 'types' ? '2' : '3'} of 3 — families → types → profile &amp;
            workflow
          </p>
        </footer>

        <p className="mt-4 text-center text-[10px] text-slate-500">
          DMRV configuration does not imply certified credits, automatic verification, or regulatory approval. Human
          review and evidence gates apply in downstream DPAL workflows.
        </p>
      </div>
    </main>
  );
};

export default DmrvSelectorPage;
