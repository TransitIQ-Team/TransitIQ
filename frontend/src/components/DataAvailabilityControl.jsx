import React, { useState, useEffect } from 'react';
import { Wifi, SignalLow, SignalZero, Sliders, AlertCircle, BarChart2 } from 'lucide-react';

export default function DataAvailabilityControl({ missingLevel, setMissingLevel }) {
  const levels = ["0%", "25%", "50%", "75%", "100%"];
  const [experimentData, setExperimentData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/research/missing-data')
      .then(res => res.json())
      .then(data => {
        if (data && data.levels) {
          setExperimentData(data.levels);
        }
      })
      .catch(() => {});
  }, []);

  const getStageInfo = (lvl) => {
    switch (lvl) {
      case "0%":
        return {
          stage: "LIVE",
          color: "border-emerald-200 text-emerald-800 bg-emerald-50",
          icon: Wifi,
          title: "Live GPS Stream Active",
          desc: "Full telemetry stream available (100% retained pings)."
        };
      case "100%":
        return {
          stage: "NO LIVE DATA",
          color: "border-slate-200 text-slate-800 bg-slate-100",
          icon: SignalZero,
          title: "Complete Telemetry Loss",
          desc: "Live GPS unavailable; prediction relies entirely on historical baseline fallback."
        };
      default:
        return {
          stage: "PARTIAL",
          color: "border-amber-200 text-amber-800 bg-amber-50",
          icon: SignalLow,
          title: `Partial Telemetry (${lvl} Signal Loss)`,
          desc: "Live signal degraded; state-aware hybrid strategy balances ML and historical metrics."
        };
    }
  };

  const currentInfo = getStageInfo(missingLevel);
  const CurrentIcon = currentInfo.icon;
  const currentMetrics = experimentData ? experimentData[missingLevel] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">Missing-Data Signal Loss</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Select simulated signal loss to inspect measured error metrics.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
          Controlled Experiment
        </span>
      </div>

      {/* 5-Level Selector Buttons */}
      <div className="grid grid-cols-5 gap-2">
        {levels.map((lvl) => {
          const isActive = missingLevel === lvl;
          return (
            <button
              key={lvl}
              onClick={() => setMissingLevel(lvl)}
              className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition-all ${
                isActive
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {lvl} Loss
            </button>
          );
        })}
      </div>

      {/* Current Level Summary Card */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3 ${currentInfo.color}`}>
        <CurrentIcon className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-xs font-bold text-slate-900">{currentInfo.title}</h4>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-white border border-current">
              {currentInfo.stage}
            </span>
          </div>
          <p className="text-xs leading-relaxed">{currentInfo.desc}</p>
        </div>
      </div>

      {/* Measured Metrics Breakdown for Selected Level */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-teal-600" />
            Measured Metrics ({missingLevel} Loss):
          </span>
          <span className="text-[11px] text-slate-500">Test Set (124 samples)</span>
        </div>

        {currentMetrics ? (
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {/* Historical Baseline */}
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 block mb-0.5">Historical Baseline</span>
              <span className="text-sm font-bold text-slate-900">{currentMetrics.historical_baseline.mae}m MAE</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{currentMetrics.historical_baseline.rmse}m RMSE</span>
            </div>

            {/* ML-only */}
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 block mb-0.5">ML-only</span>
              {currentMetrics.ml.available ? (
                <>
                  <span className="text-sm font-bold text-slate-900">{currentMetrics.ml.mae}m MAE</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{currentMetrics.ml.rmse}m RMSE</span>
                </>
              ) : (
                <>
                  <span className="text-xs font-bold text-rose-600 block mt-1">UNAVAILABLE</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5 line-clamp-1">{currentMetrics.ml.reason}</span>
                </>
              )}
            </div>

            {/* Hybrid */}
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
              <span className="text-[10px] text-teal-800 block mb-0.5 font-bold">Hybrid Strategy</span>
              <span className="text-sm font-extrabold text-teal-900">{currentMetrics.hybrid.mae}m MAE</span>
              <span className="text-[10px] text-teal-700 block mt-0.5">{currentMetrics.hybrid.rmse}m RMSE</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic text-center py-2">Loading experiment results...</p>
        )}
      </div>
    </div>
  );
}
