import React, { useState, useEffect } from 'react';
import { Clock, HelpCircle, Activity } from 'lucide-react';

export default function PredictionCard({ missingLevel }) {
  const [levelData, setLevelData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/research/missing-data')
      .then(res => res.json())
      .then(data => {
        if (data && data.levels && data.levels[missingLevel]) {
          setLevelData(data.levels[missingLevel]);
        }
      })
      .catch(() => {});
  }, [missingLevel]);

  const isAvailable = levelData && levelData.ml && levelData.ml.available;
  const mae = levelData && levelData.hybrid ? levelData.hybrid.mae : '--';
  const rmse = levelData && levelData.hybrid ? levelData.hybrid.rmse : '--';
  const coverage = levelData && levelData.ml && levelData.ml.interval_coverage_percent !== null ? `${levelData.ml.interval_coverage_percent}%` : 'N/A';
  const width = levelData && levelData.ml && levelData.ml.avg_interval_width !== null ? `${levelData.ml.avg_interval_width} min` : 'N/A';

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">Metrics at {missingLevel} Signal Loss</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
            Measured Values
          </span>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 block mb-1">Hybrid MAE</span>
            <div className="text-2xl font-extrabold text-slate-900 flex items-baseline justify-center gap-1">
              <span>{mae}</span>
              <span className="text-xs font-semibold text-teal-600">min</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Mean Absolute Error</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 block mb-1">Hybrid RMSE</span>
            <div className="text-2xl font-extrabold text-slate-900 flex items-baseline justify-center gap-1">
              <span>{rmse}</span>
              <span className="text-xs font-semibold text-teal-600">min</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Root Mean Sq Error</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 block mb-1">Interval Coverage</span>
            <div className="text-2xl font-extrabold text-teal-700 flex items-baseline justify-center">
              <span>{coverage}</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">10th-90th Interval</span>
          </div>
        </div>

        {/* Uncertainty Bounds Display */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4 flex items-center justify-between text-xs">
          <span className="text-slate-700 font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-teal-600" />
            Quantile Interval Width:
          </span>
          <span className="font-bold text-slate-900 text-sm">
            {width}
          </span>
        </div>

        {/* Context Explanation */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              {isAvailable ? "ML & Hybrid predictions evaluated on retained pings." : "100% signal loss: ML unavailable, Hybrid falls back 100% to Historical Baseline."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
