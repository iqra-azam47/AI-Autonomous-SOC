import React, { useState, useRef } from 'react';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle, FileCode,
  Download, RefreshCw, ArrowRight, ShieldCheck, Database
} from 'lucide-react';
import { api } from '../services/api';
import { IngestionSummary } from '../types';
import { useNavigate } from 'react-router-dom';

export const IngestionPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [result, setResult] = useState<IngestionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const summary = await api.uploadLogFile(selectedFile);
      setResult(summary);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'File ingestion failed');
    } finally {
      setUploading(false);
    }
  };

  // Quick generation of sample test files
  const handleLoadSample = (type: 'csv' | 'json' | 'syslog') => {
    let content = '';
    let filename = '';
    let mimeType = 'text/plain';

    if (type === 'csv') {
      filename = 'sample_bruteforce_logs.csv';
      mimeType = 'text/csv';
      content = `timestamp,source_ip,destination_ip,source_port,destination_port,protocol,event_type,username,message,action,bytes_sent,bytes_received,duration_seconds,failed_login_attempts
${new Date(Date.now() - 300000).toISOString()},198.51.100.45,10.0.0.10,49152,22,TCP,AUTH_FAILURE,admin,Failed password for admin from 198.51.100.45,BLOCKED,64,0,0.1,5
${new Date(Date.now() - 240000).toISOString()},198.51.100.45,10.0.0.10,49153,22,TCP,AUTH_FAILURE,admin,Failed password for admin from 198.51.100.45,BLOCKED,64,0,0.1,6
${new Date(Date.now() - 180000).toISOString()},198.51.100.45,10.0.0.10,49154,22,TCP,AUTH_FAILURE,root,Failed password for root from 198.51.100.45,BLOCKED,64,0,0.1,7
${new Date(Date.now() - 120000).toISOString()},198.51.100.45,10.0.0.10,49155,22,TCP,AUTH_FAILURE,ubuntu,Failed password for ubuntu from 198.51.100.45,BLOCKED,64,0,0.1,8
${new Date(Date.now() - 60000).toISOString()},198.51.100.45,10.0.0.10,49156,22,TCP,AUTH_SUCCESS,admin,Accepted password for admin from 198.51.100.45,ALLOWED,128,256,1.2,0
`;
    } else if (type === 'json') {
      filename = 'sample_webattack_logs.json';
      mimeType = 'application/json';
      content = JSON.stringify([
        {
          timestamp: new Date(Date.now() - 120000).toISOString(),
          source_ip: '203.0.113.19',
          destination_ip: '10.0.0.20',
          source_port: 52100,
          destination_port: 80,
          protocol: 'TCP',
          event_type: 'WEB_REQUEST',
          message: 'GET /api/v1/users?id=1%27%20OR%201=1-- HTTP/1.1 (SQL Injection probe)',
          action: 'BLOCKED',
          bytes_sent: 512,
          bytes_received: 2048,
          duration_seconds: 0.05
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          source_ip: '203.0.113.19',
          destination_ip: '10.0.0.20',
          source_port: 52101,
          destination_port: 80,
          protocol: 'TCP',
          event_type: 'WEB_REQUEST',
          message: 'GET /../../../../etc/passwd HTTP/1.1 (Directory Traversal)',
          action: 'BLOCKED',
          bytes_sent: 420,
          bytes_received: 120,
          duration_seconds: 0.04
        }
      ], null, 2);
    } else {
      filename = 'sample_auth_syslog.log';
      mimeType = 'text/plain';
      content = `Oct 28 14:02:11 host-dc sshd[4190]: Failed password for invalid user oracle from 185.220.101.5 port 55122 ssh2
Oct 28 14:02:15 host-dc sshd[4192]: Failed password for invalid user postgres from 185.220.101.5 port 55124 ssh2
Oct 28 14:02:20 host-dc sshd[4195]: Failed password for invalid user deploy from 185.220.101.5 port 55126 ssh2
`;
    }

    const blob = new Blob([content], { type: mimeType });
    const file = new File([blob], filename, { type: mimeType });
    setSelectedFile(file);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5 font-mono">
          <UploadCloud className="w-6 h-6 text-cyan-400" />
          LOG INGESTION & PIPELINE NORMALIZATION
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Ingest raw security events across CSV, JSON, or RFC 3164/5424 syslog formats through the real-time ML & correlation pipeline.
        </p>
      </div>

      {/* Drop Zone & File Select */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-150 ${
            dragOver
              ? 'border-cyan-400 bg-cyan-500/10'
              : 'border-slate-700/80 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900/80'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv,.json,.log,.txt"
            className="hidden"
          />
          <UploadCloud className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
          <p className="text-slate-200 font-mono text-sm font-semibold">
            {selectedFile ? selectedFile.name : 'Drag and drop log files here, or click to browse'}
          </p>
          <p className="text-slate-400 font-mono text-xs mt-1">
            Supported formats: CSV, JSON array, RFC 3164/5424 Syslog (.log, .txt)
          </p>
          {selectedFile && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/60 border border-cyan-500/30 rounded text-cyan-300 font-mono text-xs">
              <FileText className="w-4 h-4" />
              <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
          )}
        </div>

        {/* Quick Sample Generators */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Or load pre-configured test dataset:</span>
            <button
              onClick={() => handleLoadSample('csv')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs transition-colors"
            >
              Brute-Force CSV
            </button>
            <button
              onClick={() => handleLoadSample('json')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs transition-colors"
            >
              Web Attack JSON
            </button>
            <button
              onClick={() => handleLoadSample('syslog')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs transition-colors"
            >
              Auth Syslog
            </button>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Process & Ingest File</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-center gap-3 font-mono">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ingestion Results Summary */}
      {result && (
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-slate-100 font-mono">
                PIPELINE EXECUTION SUMMARY
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Validated & Indexed in Database
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-center">
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Parsed Records</span>
              <span className="text-xl font-bold text-slate-100">{result.records_uploaded}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Valid Events</span>
              <span className="text-xl font-bold text-emerald-400">{result.valid_records}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Invalid</span>
              <span className="text-xl font-bold text-slate-400">{result.invalid_records}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Events Stored</span>
              <span className="text-xl font-bold text-cyan-400">{result.events_created}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Alerts Raised</span>
              <span className="text-xl font-bold text-amber-400">{result.alerts_generated}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Incidents</span>
              <span className="text-xl font-bold text-red-400">{result.incidents_generated}</span>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-lg">
              <span className="text-xs font-bold text-amber-400 font-mono block mb-1">
                Parser Warnings / Errors:
              </span>
              <ul className="text-xs font-mono text-amber-300/80 list-disc list-inside space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => navigate('/events')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <span>View Ingested Events</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {result.incidents_generated > 0 && (
              <button
                onClick={() => navigate('/incidents')}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
              >
                <span>Inspect Resulting Incidents</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Schema Reference Card */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow space-y-4">
        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
          <FileCode className="w-4 h-4 text-cyan-400" />
          Expected Event Schema & Normalization Fields
        </h4>
        <p className="text-xs text-slate-400">
          The normalization pipeline maps heterogeneous log formats into the unified SOC event schema:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono text-slate-300">
          <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
            <span className="text-cyan-400 font-bold block mb-1">Network & Flow</span>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div><code>source_ip</code>: IPv4 / IPv6</div>
              <div><code>destination_ip</code>: Target host IP</div>
              <div><code>source_port</code>, <code>destination_port</code></div>
              <div><code>protocol</code>: TCP, UDP, ICMP</div>
              <div><code>bytes_sent</code>, <code>bytes_received</code></div>
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
            <span className="text-cyan-400 font-bold block mb-1">Authentication & Identity</span>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div><code>username</code>: Subject account</div>
              <div><code>action</code>: ALLOWED, BLOCKED, DENIED</div>
              <div><code>failed_login_attempts</code>: Counter</div>
              <div><code>status</code>: SUCCESS, FAILURE</div>
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
            <span className="text-cyan-400 font-bold block mb-1">Event Classification</span>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div><code>timestamp</code>: ISO 8601 UTC</div>
              <div><code>event_type</code>: AUTH, WEB, FLOW, SYS</div>
              <div><code>message</code>: Raw payload string</div>
              <div><code>raw_log</code>: Original syslog line</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
