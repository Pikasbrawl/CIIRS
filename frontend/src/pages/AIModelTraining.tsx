import React, { useState, useEffect } from 'react';
import { 
  Cpu, Play, CheckCircle2, RefreshCw, Upload, Database, 
  Layers, ShieldAlert, Sliders, Award, AlertCircle 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { api } from '../services/api';
import { TrainingRun, Dataset, ModelVersion } from '../types';

export const AIModelTraining: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [trainingRuns, setTrainingRuns] = useState<TrainingRun[]>([]);
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);
  const [selectedRun, setSelectedRun] = useState<TrainingRun | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Form config
  const [modelName, setModelName] = useState('CIIRS-Temporal-LSTM-v2.5');
  const [architecture, setArchitecture] = useState('Temporal LSTM + Attention');
  const [selectedDataset, setSelectedDataset] = useState('Urban Surveillance Benchmark v2.4');
  const [epochs, setEpochs] = useState(15);
  const [batchSize, setBatchSize] = useState(16);
  const [learningRate, setLearningRate] = useState(0.001);
  const [splitRatio, setSplitRatio] = useState('70/15/15');

  const scenarioCategories = [
    'Normal Activity', 'Crowd Surge', 'Physical Altercation Indicators',
    'Sudden Running', 'Fall Detection', 'Possible Medical Distress',
    'Unattended Object', 'Restricted-Area Entry', 'Unusual Movement'
  ];

  const fetchData = async () => {
    try {
      const [dsRes, runsRes, modelsRes] = await Promise.all([
        api.getDatasets(),
        api.getTrainingRuns(),
        api.getModelVersions()
      ]);
      setDatasets(dsRes);
      setTrainingRuns(runsRes);
      setModelVersions(modelsRes);
      if (runsRes.length > 0 && !selectedRun) {
        setSelectedRun(runsRes[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(async () => {
      const runs = await api.getTrainingRuns();
      setTrainingRuns(runs);
      if (selectedRun) {
        const updated = runs.find((r) => r.id === selectedRun.id);
        if (updated) setSelectedRun(updated);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedRun?.id]);

  const handleStartTraining = async () => {
    setIsStarting(true);
    try {
      const res = await api.startTrainingRun({
        model_name: modelName,
        architecture,
        dataset_name: selectedDataset,
        epochs_total: epochs,
        batch_size: batchSize,
        learning_rate: learningRate
      });
      await fetchData();
      if (res && res.run_id) {
        const newRun = await api.getTrainingRun(res.run_id);
        setSelectedRun(newRun);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsStarting(false);
    }
  };

  const handleDeployModel = async (modelId: number) => {
    try {
      await api.deployModelVersion(modelId);
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const lossHistoryData = selectedRun?.epoch_history?.map((ep) => ({
    epoch: `Ep ${ep.epoch}`,
    train_loss: ep.train_loss,
    val_loss: ep.val_loss,
    val_acc: ep.val_acc ? Number((ep.val_acc * 100).toFixed(1)) : undefined,
    f1: ep.f1_score ? Number((ep.f1_score * 100).toFixed(1)) : undefined
  })) || [
    { epoch: 'Ep 1', train_loss: 0.82, val_loss: 0.78, val_acc: 72.4, f1: 71.0 },
    { epoch: 'Ep 5', train_loss: 0.44, val_loss: 0.41, val_acc: 84.1, f1: 83.5 },
    { epoch: 'Ep 10', train_loss: 0.26, val_loss: 0.28, val_acc: 91.2, f1: 90.8 },
    { epoch: 'Ep 15', train_loss: 0.14, val_loss: 0.18, val_acc: 94.2, f1: 93.8 }
  ];

  const confusionMatrix = selectedRun?.confusion_matrix || [
    [48, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 46, 1, 1, 0, 0, 0, 0, 1],
    [0, 1, 45, 2, 0, 0, 0, 0, 2],
    [0, 1, 1, 46, 0, 0, 0, 0, 2],
    [0, 0, 0, 0, 49, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 48, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 49, 1, 0],
    [0, 0, 0, 0, 0, 0, 1, 48, 1],
    [1, 1, 2, 1, 0, 1, 0, 0, 44]
  ];

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* Top Header */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#172F50] leading-tight">
              AI Model Training & Benchmark Operations
            </h1>
            <p className="text-xs text-[#526477] mt-0.5">
              PyTorch training optimizer, loss convergence tracking, validation curves, and model registry.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="p-1.5 rounded-lg bg-[#F4F8FC] border border-[#E1EAF2] text-[#526477] hover:text-[#172F50] transition self-start md:self-auto"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Col: Training Config Form & Dataset Management */}
        <div className="space-y-4">
          {/* Training Config Panel */}
          <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-2">
              <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#2463A6]" />
                <span>Training Configuration</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-[#2463A6]">PYTORCH RUNNER</span>
            </div>

            <div>
              <label className="text-[11px] text-[#526477] font-semibold">Model Experiment Name</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full mt-1 bg-[#F4F8FC] border border-[#E1EAF2] text-[#172F50] text-xs px-2.5 py-1.5 rounded-lg focus:border-[#2463A6] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#526477] font-semibold">Architecture</label>
                <select
                  value={architecture}
                  onChange={(e) => setArchitecture(e.target.value)}
                  className="w-full mt-1 bg-[#F4F8FC] border border-[#E1EAF2] text-[#172F50] text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                >
                  <option value="Temporal LSTM + Attention">Temporal LSTM + Attention</option>
                  <option value="Temporal ConvNet (TCN)">Temporal ConvNet (TCN)</option>
                  <option value="Spatial-Temporal Transformer">Spatial-Temporal Transformer</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[#526477] font-semibold">Dataset</label>
                <select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  className="w-full mt-1 bg-[#F4F8FC] border border-[#E1EAF2] text-[#172F50] text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-[#526477] font-semibold">Epochs</label>
                <input
                  type="number"
                  value={epochs}
                  onChange={(e) => setEpochs(Number(e.target.value))}
                  className="w-full mt-1 bg-[#F4F8FC] border border-[#E1EAF2] text-[#172F50] text-xs px-2 py-1.5 rounded-lg font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#526477] font-semibold">Batch Size</label>
                <input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full mt-1 bg-[#F4F8FC] border border-[#E1EAF2] text-[#172F50] text-xs px-2 py-1.5 rounded-lg font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#526477] font-semibold">Learning Rate</label>
                <input
                  type="number"
                  step="0.0005"
                  value={learningRate}
                  onChange={(e) => setLearningRate(Number(e.target.value))}
                  className="w-full mt-1 bg-[#F4F8FC] border border-[#E1EAF2] text-[#172F50] text-xs px-2 py-1.5 rounded-lg font-mono focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#526477] font-semibold">Split Ratio (Train/Val/Test)</label>
              <input
                type="text"
                value={splitRatio}
                onChange={(e) => setSplitRatio(e.target.value)}
                className="w-full mt-1 bg-[#F4F8FC] border border-[#E1EAF2] text-[#172F50] text-xs px-2.5 py-1.5 rounded-lg font-mono focus:outline-none"
              />
            </div>

            <div>
              <span className="text-[11px] text-[#526477] font-semibold">Scenario Classes ({scenarioCategories.length}):</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {scenarioCategories.map((c) => (
                  <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EDF4FC] border border-[#CBDCEE] text-[#2463A6]">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartTraining}
              disabled={isStarting}
              className="w-full py-2.5 px-4 bg-[#2463A6] hover:bg-[#1B4E85] text-white font-bold text-xs rounded-lg transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isStarting ? 'Executing Optimizer Steps...' : 'Start Training Run'}</span>
            </button>
          </div>

          {/* Model Versions Management */}
          <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-2">
              <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider flex items-center space-x-1.5">
                <Award className="w-3.5 h-3.5 text-[#E5A12B]" />
                <span>Deployed Checkpoints</span>
              </span>
              <span className="text-[10px] font-mono text-[#8291A2]">REGISTRY</span>
            </div>

            <div className="space-y-2">
              {modelVersions.map((mv) => (
                <div 
                  key={mv.id} 
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    mv.is_active ? 'bg-[#E8F8F0] border-[#A7F3D0]' : 'bg-[#F8FAFC] border-[#E1EAF2]'
                  }`}
                >
                  <div>
                    <div className="font-bold text-[#172F50] flex items-center space-x-1.5">
                      <span>{mv.version_tag}</span>
                      {mv.is_active && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#16A36A] text-white font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#526477] mt-0.5">
                      Acc: <strong>{(mv.accuracy * 100).toFixed(1)}%</strong> • F1: <strong>{(mv.f1_score * 100).toFixed(1)}%</strong>
                    </div>
                  </div>

                  {!mv.is_active && (
                    <button
                      onClick={() => handleDeployModel(mv.id)}
                      className="px-2 py-1 text-[10px] font-semibold rounded bg-[#F4F8FC] border border-[#CBDCEE] hover:bg-[#DCEBFA] text-[#2463A6] transition"
                    >
                      Deploy
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Real-time Training Dashboard & Loss Curves */}
        <div className="lg:col-span-2 space-y-4">
          {/* Selected Run Details Header */}
          <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#E1EAF2] pb-3 mb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-[#172F50]">
                    {selectedRun?.model_name || 'CIIRS-Temporal-LSTM-v2.4.1'}
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    selectedRun?.status === 'COMPLETED' ? 'bg-[#E8F8F0] text-[#16A36A] border border-[#A7F3D0]' : 'bg-[#DCEBFA] text-[#2463A6] border border-[#BFDBFE] animate-pulse'
                  }`}>
                    {selectedRun?.status || 'COMPLETED'}
                  </span>
                </div>
                <p className="text-[11px] text-[#8291A2]">
                  {selectedRun?.architecture || 'Temporal LSTM + Attention'} on {selectedRun?.dataset_name}
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="text-[#8291A2]">Epoch:</span>
                <span className="text-[#172F50] font-bold">{selectedRun?.epochs_completed || 20} / {selectedRun?.epochs_total || 20}</span>
              </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E1EAF2]">
                <div className="text-[9px] uppercase text-[#8291A2] font-bold">Accuracy</div>
                <div className="text-base font-bold font-mono text-[#16A36A]">
                  {((selectedRun?.accuracy || 0.942) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E1EAF2]">
                <div className="text-[9px] uppercase text-[#8291A2] font-bold">Precision</div>
                <div className="text-base font-bold font-mono text-[#2463A6]">
                  {((selectedRun?.precision || 0.946) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E1EAF2]">
                <div className="text-[9px] uppercase text-[#8291A2] font-bold">Recall</div>
                <div className="text-base font-bold font-mono text-[#4B83B8]">
                  {((selectedRun?.recall || 0.938) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E1EAF2]">
                <div className="text-[9px] uppercase text-[#8291A2] font-bold">F1-Score</div>
                <div className="text-base font-bold font-mono text-[#7E3AF2]">
                  {((selectedRun?.f1_score || 0.942) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E1EAF2]">
                <div className="text-[9px] uppercase text-[#8291A2] font-bold">FPR</div>
                <div className="text-base font-bold font-mono text-[#E5A12B]">
                  {((selectedRun?.false_positive_rate || 0.038) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E1EAF2]">
                <div className="text-[9px] uppercase text-[#8291A2] font-bold">FNR</div>
                <div className="text-base font-bold font-mono text-[#E34D59]">
                  {((selectedRun?.false_negative_rate || 0.042) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Training Loss & Validation Accuracy Curve */}
          <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-[#172F50]">Training / Validation Loss & F1 Curve</h3>
                <p className="text-[11px] text-[#8291A2]">Cross-Entropy Loss backpropagation across epochs</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EDF4FC] text-[#2463A6] font-semibold">
                CONVERGENCE
              </span>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lossHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1EAF2" />
                  <XAxis dataKey="epoch" stroke="#8291A2" fontSize={11} />
                  <YAxis stroke="#8291A2" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E1EAF2', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Line type="monotone" dataKey="train_loss" name="Train Loss" stroke="#2463A6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="val_loss" name="Val Loss" stroke="#E34D59" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="f1" name="Val F1 (%)" stroke="#16A36A" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Confusion Matrix Heatmap Table */}
          <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-[#172F50]">9-Class Confusion Matrix (Validation Set)</h3>
                <p className="text-[11px] text-[#8291A2]">Rows represent Ground Truth, Columns represent Predictions</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E8F8F0] text-[#16A36A] font-semibold">94.2% ACCURACY</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono border-collapse">
                <thead>
                  <tr className="bg-[#EDF4FC] text-[#526477]">
                    <th className="p-1.5 text-left border border-[#E1EAF2]">Class</th>
                    {scenarioCategories.map((c, i) => (
                      <th key={i} className="p-1.5 text-center border border-[#E1EAF2]" title={c}>
                        C{i+1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {confusionMatrix.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#F4F8FC]">
                      <td className="p-1.5 border border-[#E1EAF2] text-[#172F50] font-semibold truncate max-w-[120px]">
                        C{rIdx+1}: {scenarioCategories[rIdx]}
                      </td>
                      {row.map((val, cIdx) => {
                        const isDiag = rIdx === cIdx;
                        return (
                          <td 
                            key={cIdx} 
                            className={`p-1.5 text-center border border-[#E1EAF2] ${
                              isDiag 
                                ? 'bg-[#E8F8F0] text-[#16A36A] font-bold' 
                                : val > 0 
                                ? 'bg-[#FEE2E2] text-[#E34D59]' 
                                : 'text-[#CBDCEE]'
                            }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
