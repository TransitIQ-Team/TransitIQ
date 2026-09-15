import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';

export default function ModelComparisonCard() {
  const [metrics, setMetrics] = useState({
    historical_baseline: { mae: 0.88, rmse: 1.17 },
    ml: { mae: 1.17, rmse: 1.65 },
    hybrid: { mae: 1.01, rmse: 1.42 },
    evaluation_note: 'Controlled historical/simulated prototype evaluation on held-out 20% test set.'
  });

  useEffect(() => {
    fetch('http://localhost:5000/api/metrics')
      .then(res => res.json())
      .then(data => {
        if (data && data.historical_baseline) {
          setMetrics(data);
        }
      })
      .catch(() => {});
  }, []);

  const modelsList = [
    {
      name: 'Historical Baseline',
      type: 'Hierarchical Segment Aggregation',
      mae: metrics.historical_baseline.mae,
      rmse: metrics.historical_baseline.rmse,
      badge: 'High Baseline Accuracy',
      color: 'border-slate-200 bg-slate-50',
    },
    {
      name: 'Random Forest ML',
      type: 'RandomForestRegressor + Quantiles',
      mae: metrics.ml.mae,
      rmse: metrics.ml.rmse,
      badge: 'Feature-Driven Model',
      color: 'border-slate-200 bg-slate-50',
    },
    {
      name: 'Hybrid ETA Strategy',
      type: 'State-Aware Weighted Decision Layer',
      mae: metrics.hybrid.mae,
      rmse: metrics.hybrid.rmse,
      badge: 'Signal-Weighted Resilience',
      color: 'border-teal-200 bg-teal-50/60',
    }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">Model Comparison Benchmark</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Historical Baseline vs ML-only vs Hybrid decision layer metrics on held-out test data.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
          Held-out Test Split
        </span>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modelsList.map((item, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border flex flex-col justify-between ${item.color}`}>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 inline-block mb-2">
                {item.badge}
              </span>
              <h4 className="text-sm font-bold text-slate-900 mb-0.5">{item.name}</h4>
              <p className="text-[11px] text-slate-500 mb-3">{item.type}</p>
            </div>

            <div className="pt-3 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Test MAE</span>
                <span className="font-bold text-slate-900">{item.mae} min</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Test RMSE</span>
                <span className="font-bold text-slate-900">{item.rmse} min</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">Evaluation Methodology:</p>
        <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
          {metrics.evaluation_note} Dataset contains 1 observed pilot record + 49 simulated corridor trips split 80/20 with fixed random seed (42).
        </p>
      </div>
    </div>
  );
}
