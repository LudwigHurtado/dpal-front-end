import React from 'react';
import WaterTransactionCard from './components/WaterTransactionCard';
import { listTransactions } from './services/waterTransactionService';
import RouteBreadcrumbHeader from './components/RouteBreadcrumbHeader';

export default function WaterTransactionExchangeView(): React.ReactElement {
  const txs = listTransactions();
  return (
    <div className="space-y-4">
      <RouteBreadcrumbHeader title="Water transaction exchange" currentPageLabel="Exchange" />
      <div className="rounded-xl p-3 border border-amber-400/30 bg-amber-500/10 text-[11px] text-amber-100">
        Russ’s three pilot categories: resale, system enhancement, and sequestered/archived. No real payments, escrow, or
        legal water-right transfers through this UI.
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {txs.map((t) => (
          <WaterTransactionCard key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}
