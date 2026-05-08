import React from 'react';
import { Link } from 'react-router-dom';
import WaterTransactionCard from './components/WaterTransactionCard';
import { listTransactions } from './services/waterTransactionService';

export default function WaterTransactionExchangeView(): React.ReactElement {
  const txs = listTransactions();
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
        Water transaction exchange (demo)
      </h1>
      <div className="rounded-xl p-3 border border-amber-400/30 bg-amber-500/10 text-[11px] text-amber-100">
        Russ’s three pilot categories: resale, system enhancement, and sequestered/archived. No real payments, escrow, or
        legal water-right transfers through this UI.
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {txs.map((t) => (
          <WaterTransactionCard key={t.id} t={t} />
        ))}
      </div>
      <Link to="/water-intelligence/colorado-river" className="text-[11px] font-semibold text-cyan-300 hover:underline inline-block">
        ← Colorado pilot
      </Link>
    </div>
  );
}
