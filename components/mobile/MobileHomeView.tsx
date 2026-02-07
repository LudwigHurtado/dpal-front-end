import React from 'react';
import MobileCaseFeedView from './MobileCaseFeedView';
import type { Report } from '../../types';

interface MobileHomeViewProps {
  reports: Report[];
  onOpenReport: (report: Report) => void;
  onFollow?: (report: Report) => void;
  onShare?: (report: Report) => void;
  onConfirmWitness?: (report: Report) => void;
  onComment?: (report: Report) => void;
}

const MobileHomeView: React.FC<MobileHomeViewProps> = (props) => (
  <MobileCaseFeedView {...props} />
);

export default MobileHomeView;
