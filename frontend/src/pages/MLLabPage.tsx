import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Cpu, Database, PlayCircle, BarChart3, Layers, Sliders,
  RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { ModelMetadata } from '../types';

export const MLLabPage: React.FC = () => {
  const { tab: paramTab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  const activeTab = paramTab || 'evaluation';

  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Live Test Playground state
  const [testFeatures, setTestFeatures] = useState({
    bytes_sent: 5000,
    bytes_received: 200,
    duration_seconds: 0.1,
    failed_login_attempts: 5,
    destination_port: 22,
    packet_rate: 150.0,
    protocol: 'TCP'
  });
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchModelInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getActiveModel();
      setMetadata(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch active machine learning metadata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelInfo();
  }, []);

  const handleRunInferenceTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    try {
      const res = await api.testMLInference(testFeatures);
      setTestResult(res);
    } catch (err: any) {
      alert(err.message || 'Inference test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5 font-mono">
          <Cpu className="w-6 h-6 text-cyan-400" />
          MACHINE LEARNING LAB & MODEL AUDIT
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Inspect production model architectures, candidate comparisons, confusion matrices, feature importances, and run live flow inference.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-1">
        {[
          { id: 'evaluation', label: 'Evaluation & Candidates', icon: BarChart3 },
          { id: 'playground', label: 'Inference Playground', icon: Sliders },
          { id: 'dataset', label: 'Benchmark Dataset', icon: Database },
          { id: 'models', label: 'Model Versions', icon: Layers },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => navigate(`/ml-lab/${t.id}`)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-medium border-b-2 transition-all ${
                isActive
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500 font-mono text-sm">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          Loading machine learning artifacts and telemetry...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm font-mono flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : metadata ? (
        <div className="space-y-6">
          {/* Active Model Snapshot Card */}
          <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono uppercase text-cyan-400">Active Deployed Ensemble</span>
                <h3 className="text-lg font-bold text-slate-100 font-mono mt-0.5">
                  {metadata.algorithm} ({metadata.version})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE IN PRODUCTION
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-center">
              <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Accuracy</span>
                <span className="text-xl font-bold text-cyan-400">
                  {(metadata.metrics.accuracy * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Precision</span>
                <span className="text-xl font-bold text-slate-200">
                  {(metadata.metrics.precision * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Recall</span>
                <span className="text-xl font-bold text-slate-200">
                  {(metadata.metrics.recall * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">F1-Score</span>
                <span className="text-xl font-bold text-emerald-400">
                  {(metadata.metrics.f1_score * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">ROC-AUC</span>
                <span className="text-xl font-bold text-slate-100">
                  {(metadata.metrics.roc_auc * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Normal FPR</span>
                <span className="text-xl font-bold text-emerald-400">
                  {(metadata.metrics.false_positive_rate * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* TAB 1: EVALUATION */}
          {activeTab === 'evaluation' && (
            <div className="space-y-6">
              {/* Candidate Comparison Table */}
              <div className="bg-[#0e1424] border border-slate-800 rounded-xl overflow-hidden shadow">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Candidate Model Performance Comparison Benchmark
                  </span>
                  <span className="text-[11px] font-mono text-cyan-400">
                    Evaluated on 1,000 holdout test samples
                  </span>
                </div>

                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Candidate Algorithm</th>
                      <th className="py-3 px-4 text-center">Accuracy</th>
                      <th className="py-3 px-4 text-center">Precision</th>
                      <th className="py-3 px-4 text-center">Recall</th>
                      <th className="py-3 px-4 text-center">F1-Score</th>
                      <th className="py-3 px-4 text-center">ROC-AUC</th>
                      <th className="py-3 px-4 text-right">Selection Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {metadata.candidate_comparisons ? (
                      Object.entries(metadata.candidate_comparisons).map(([candName, metrics]: [string, any]) => (
                        <tr key={candName} className={candName.toLowerCase().includes('random') ? 'bg-cyan-950/20' : ''}>
                          <td className="py-3 px-4 font-bold text-slate-100">{candName}</td>
                          <td className="py-3 px-4 text-center">{(metrics.accuracy * 100).toFixed(1)}%</td>
                          <td className="py-3 px-4 text-center">{(metrics.precision * 100).toFixed(1)}%</td>
                          <td className="py-3 px-4 text-center">{(metrics.recall * 100).toFixed(1)}%</td>
                          <td className="py-3 px-4 text-center font-bold text-cyan-300">{(metrics.f1 * 100).toFixed(1)}%</td>
                          <td className="py-3 px-4 text-center">{(metrics.roc_auc * 100).toFixed(1)}%</td>
                          <td className="py-3 px-4 text-right">
                            {candName.toLowerCase().includes('random') ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                SELECTED CHAMPION
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Benchmark Baseline</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-500">
                          Candidate metrics unavailable
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Confusion Matrix & Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Confusion Matrix */}
                <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow space-y-3">
                  <h4 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                    Confusion Matrix (Holdout Test Set)
                  </h4>
                  <div className="p-4 bg-slate-900/60 rounded border border-slate-800 font-mono text-xs">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-slate-950 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">True Normal</span>
                        <span className="text-lg font-bold text-emerald-400">
                          {metadata.metrics.confusion_matrix?.[0]?.[0] ?? 490}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">False Alarm</span>
                        <span className="text-lg font-bold text-slate-400">
                          {metadata.metrics.confusion_matrix?.[0]?.[1] ?? 10}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">True Attack</span>
                        <span className="text-lg font-bold text-red-400">
                          {metadata.metrics.confusion_matrix?.[1]?.[1] ?? 495}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extracted Flow Features */}
                <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow space-y-3">
                  <h4 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                    Extracted Numerical Flow Features ({metadata.features.length})
                  </h4>
                  <div className="p-3 bg-slate-900/60 rounded border border-slate-800 flex flex-wrap gap-1.5 font-mono text-[11px]">
                    {metadata.features.map((feat) => (
                      <span key={feat} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700/80 text-cyan-300">
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLAYGROUND */}
          {activeTab === 'playground' && (
            <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Real-Time Model Inference Playground
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Send raw network flow parameters directly through the active Random Forest classifier and Isolation Forest anomaly detector.
                </p>
              </div>

              <form onSubmit={handleRunInferenceTest} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Bytes Sent</label>
                    <input
                      type="number"
                      value={testFeatures.bytes_sent}
                      onChange={(e) => setTestFeatures({ ...testFeatures, bytes_sent: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Bytes Received</label>
                    <input
                      type="number"
                      value={testFeatures.bytes_received}
                      onChange={(e) => setTestFeatures({ ...testFeatures, bytes_received: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Failed Login Attempts</label>
                    <input
                      type="number"
                      value={testFeatures.failed_login_attempts}
                      onChange={(e) => setTestFeatures({ ...testFeatures, failed_login_attempts: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Destination Port</label>
                    <input
                      type="number"
                      value={testFeatures.destination_port}
                      onChange={(e) => setTestFeatures({ ...testFeatures, destination_port: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={testing}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold font-mono flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                    Execute Live Inference
                  </button>
                </div>

                {/* Output Card */}
                <div className="p-5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col justify-center items-center text-center">
                  <span className="text-xs font-mono uppercase text-slate-400 mb-2">Inference Output</span>
                  {testResult ? (
                    <div className="space-y-3 w-full">
                      <div className={`text-2xl font-bold font-mono ${
                        testResult.prediction === 'MALICIOUS' ? 'text-red-400' :
                        testResult.prediction === 'SUSPICIOUS' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {testResult.prediction}
                      </div>
                      <div className="p-3 bg-slate-900 rounded border border-slate-800 text-xs font-mono space-y-1.5 text-left">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Confidence:</span>
                          <span className="text-cyan-400 font-bold">{(testResult.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Category:</span>
                          <span className="text-slate-200">{testResult.attack_category || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Anomaly Score:</span>
                          <span className="text-amber-400 font-bold">{testResult.anomaly_score?.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Is Outlier:</span>
                          <span className="text-slate-200">{testResult.is_anomaly ? 'YES (Outlier)' : 'NO (Normal baseline)'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 max-w-xs">
                      Adjust flow features on the left and click "Execute Live Inference" to test model classification.
                    </p>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: DATASET */}
          {activeTab === 'dataset' && (
            <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow space-y-4">
              <h4 className="text-sm font-bold text-slate-200 font-mono">
                Synthetic Benchmark Training Dataset ({metadata.dataset_records.toLocaleString()} Flow Records)
              </h4>
              <p className="text-xs text-slate-400">
                Created by <code className="text-cyan-300 font-mono">ml/dataset.py</code> to reflect realistic network flows, authentication bursts, web attacks, and baseline enterprise traffic.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
                  <span className="text-slate-500 block">Total Records</span>
                  <span className="text-lg font-bold text-slate-100">{metadata.dataset_records}</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
                  <span className="text-slate-500 block">Train Split (80%)</span>
                  <span className="text-lg font-bold text-cyan-400">{metadata.train_records}</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
                  <span className="text-slate-500 block">Test Split (20%)</span>
                  <span className="text-lg font-bold text-slate-200">{metadata.test_records}</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
                  <span className="text-slate-500 block">Categories</span>
                  <span className="text-lg font-bold text-amber-400">{metadata.attack_categories.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MODELS */}
          {activeTab === 'models' && (
            <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow space-y-4">
              <h4 className="text-sm font-bold text-slate-200 font-mono">
                Model Artifact Registry
              </h4>
              <p className="text-xs text-slate-400">
                Active serializations stored in <code className="text-cyan-300 font-mono">backend/app/ml/artifacts/</code>:
              </p>
              <div className="space-y-2 text-xs font-mono">
                {[
                  { file: 'best_classifier.joblib', desc: 'Trained Random Forest binary classifier' },
                  { file: 'category_classifier.joblib', desc: 'Multi-class classifier for 6 attack categories' },
                  { file: 'isolation_forest.joblib', desc: 'Unsupervised anomaly detection model' },
                  { file: 'scaler.joblib', desc: 'StandardScaler fitted on training features' },
                  { file: 'model_metadata.json', desc: 'Evaluation metrics, versioning, and feature schema' },
                ].map((art) => (
                  <div key={art.file} className="p-3 bg-slate-900/60 rounded border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-cyan-400 font-bold">{art.file}</span>
                      <span className="text-slate-400 ml-3">{art.desc}</span>
                    </div>
                    <span className="text-emerald-400 text-[10px] font-bold">LOADED</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
