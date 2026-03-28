import React from 'react';
import { Category } from '../../types';
import CaseboardReport from './CaseboardReport';

type CaseboardReportProps = React.ComponentProps<typeof CaseboardReport>;

const EducationCaseboardReport: React.FC<Omit<CaseboardReportProps, 'category'>> = (props) => (
  <CaseboardReport category={Category.Education} {...props} />
);

export default EducationCaseboardReport;
