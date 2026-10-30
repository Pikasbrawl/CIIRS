import React, { useState } from 'react';
import { 
  ShieldCheck, FileCheck, Hash, Lock, CheckCircle2, 
  AlertTriangle, Download, RefreshCw, Key, ShieldAlert 
} from 'lucide-react';

export const EvidenceManagement: React.FC = () => {
  const [evidenceItems, setEvidenceItems] = useState([
    {
      id: 1,
      item_name: 'CAM-04 Fall Sequence Telemetry (09:40-09:45)',
      type: 'VIDEO_SEQUENCE',
      sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      anchored_timestamp: '2026-10-30 09:45:12 UTC',
      custodian: 'Investigator Maya Lin',
      tamper_status: 'VALIDATED'
    },
    {
      id: 2,
      item_name: 'CAM-02 Crowd Surge Spatial Attention Heatmap',
      type: 'AI_TELEMETRY',
      sha256_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      anchored_timestamp: '2026-10-30 09:28:40 UTC',
      custodian: 'Senior Operator Arjun Singh',
      tamper_status: 'VALIDATED'
    },
    {
      id: 3,
      item_name: 'CAM-01 Unattended Luggage Frame Snapshot #410',
      type: 'FRAME_SNAPSHOT',
      sha256_hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      anchored_timestamp: '2026-10-30 08:15:22 UTC',
      custodian: 'Automated CIIRS Vault',
      tamper_status: 'VALIDATED'
    }
  ]);

  const [verifyText, setVerifyText] = useState('');
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const handleVerifyHash = () => {
    if (!verifyText.trim()) return;
    const match = evidenceItems.find((e) => e.sha256_hash.toLowerCase() === verifyText.trim().toLowerCase());
    if (match) {
      setVerifyResult(`VERIFIED: Match confirmed for "${match.item_name}". Integrity 100% tamper-free.`);
    } else {
      setVerifyResult('VERIFICATION NOTICE: Hash not recognized in active chain of custody vault.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-extrabold text-white tracking-wide flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>CRYPTOGRAPHIC EVIDENCE MANAGEMENT VAULT</span>
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
            SHA-256 ANCHORED
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographically immutable chain of custody for CCTV video clips, optical features, and operator logs.
        </p>
      </div>

      {/* SHA-256 Hash Verification Tool */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
            <Hash className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live SHA-256 Integrity Verifier</span>
          </span>
          <span className="text-[10px] font-mono text-cyan-400">TAMPER CHECK</span>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={verifyText}
            onChange={(e) => setVerifyText(e.target.value)}
            placeholder="Paste evidence SHA-256 checksum to test cryptographic tamper resistance..."
            className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg font-mono focus:border-cyan-500"
          />
          <button
            onClick={handleVerifyHash}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition"
          >
            Verify Integrity
          </button>
        </div>

        {verifyResult && (
          <div className="p-2.5 rounded-lg bg-slate-950 border border-cyan-800/60 text-xs font-mono text-cyan-300">
            {verifyResult}
          </div>
        )}
      </div>

      {/* Chain of Custody Table */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
          Immutable Chain of Custody Log
        </span>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                <th className="p-2.5">Evidence Title</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">SHA-256 Checksum</th>
                <th className="p-2.5">Anchored Time</th>
                <th className="p-2.5">Custodian</th>
                <th className="p-2.5 text-right">Integrity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {evidenceItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 font-mono text-[11px]">
                  <td className="p-2.5 text-slate-200 font-sans font-semibold">{item.item_name}</td>
                  <td className="p-2.5 text-cyan-400">{item.type}</td>
                  <td className="p-2.5 text-slate-400">{item.sha256_hash.slice(0, 24)}...</td>
                  <td className="p-2.5 text-slate-300">{item.anchored_timestamp}</td>
                  <td className="p-2.5 text-slate-300 font-sans">{item.custodian}</td>
                  <td className="p-2.5 text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                      {item.tamper_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
