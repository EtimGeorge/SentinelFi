import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle, AlertTriangle, FileText, Trash2, Eye, Download, RotateCcw, Brain, ChevronRight, ChevronLeft } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Select from '../common/Select';
import Tooltip from '../common/Tooltip';

interface ExtractedField {
  key: string;
  label: string;
  value: string;
  confidence: number;
  type: 'text' | 'number' | 'date' | 'currency' | 'select';
  options?: string[];
}

interface ExtractedData {
  document_type: 'wbs-budget' | 'requisition' | 'invoice' | 'purchase-order';
  fields: ExtractedField[];
  tables?: { headers: string[]; rows: string[][] }[];
  raw_text: string;
  confidence_score: number;
}

interface DocumentToFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetForm: 'wbs-budget' | 'requisition' | 'invoice' | 'purchase-order';
  projectId?: string;
  onSave: (data: Record<string, any>) => void;
}

const FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/csv': '.csv',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const DocumentToFormModal: React.FC<DocumentToFormModalProps> = ({
  isOpen,
  onClose,
  targetForm,
  projectId,
  onSave,
}) => {
  const [step, setStep] = useState<'upload' | 'review' | 'confirm'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragActiveRef = useRef(false);

  const formLabels: Record<string, string> = {
    'wbs-budget': 'WBS Budget Draft',
    'requisition': 'Purchase Requisition',
    'invoice': 'Vendor Invoice',
    'purchase-order': 'Purchase Order',
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragActiveRef.current = true;
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragActiveRef.current = false;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragActiveRef.current = false;

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    
    // Validate file type
    const validTypes = Object.keys(FILE_TYPES);
    if (!validTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload PDF, DOCX, XLSX, or CSV files.');
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setFile(selectedFile);
    setUploadProgress(0);
    setStep('upload');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const uploadAndExtract = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_form', targetForm);
      if (projectId) formData.append('project_id', projectId);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/v1/ai/document/fill-form', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(err.message || 'Failed to process document');
      }

      const data: ExtractedData = await response.json();
      setExtractedData(data);
      
      // Initialize edited fields with extracted values
      const initialFields: Record<string, string> = {};
      data.fields.forEach(f => {
        initialFields[f.key] = f.value;
      });
      setEditedFields(initialFields);
      
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'Failed to process document. Please try again.');
      setUploadProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setEditedFields(prev => ({ ...prev, [key]: value }));
  };

  const proceedToConfirm = () => {
    setStep('confirm');
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      // Convert edited fields to the appropriate format
      const saveData: Record<string, any> = {};
      extractedData?.fields.forEach(field => {
        const value = editedFields[field.key] || field.value;
        if (field.type === 'number' || field.type === 'currency') {
          saveData[field.key] = parseFloat(value) || 0;
        } else if (field.type === 'date') {
          saveData[field.key] = value;
        } else {
          saveData[field.key] = value;
        }
      });
      
      await onSave(saveData);
      onClose();
      resetModal();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setUploadProgress(0);
    setExtractedData(null);
    setEditedFields({});
    setStep('upload');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Document to ${formLabels[targetForm]}`}
      size="xl"
      hideCloseButton={step !== 'upload'}
    >
      <div className="h-full flex flex-col">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
          {['upload', 'review', 'confirm'].map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  (step === s || (step === 'review' && s === 'upload') || (step === 'confirm' && s !== 'upload'))
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-700 text-gray-500'
                }`}>
                  {i + 1}
                </div>
                {s !== 'confirm' && <div className={`w-16 h-0.5 mx-2 ${step !== 'upload' ? 'bg-brand-primary' : 'bg-gray-700'}`} />}
              </div>
              <span className={`text-xs font-medium ${step === s || (step === 'review' && s === 'upload') || (step === 'confirm' && s !== 'upload') ? 'text-white' : 'text-gray-500'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto">
          {/* UPLOAD STEP */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
              <div
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                  dragActiveRef.current
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.csv"
                  onChange={handleFileInputChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isProcessing}
                />
                <div className="relative z-10">
                  <Upload className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                  <p className="text-lg font-medium text-white mb-1">
                    Drag & drop your document here
                  </p>
                  <p className="text-gray-500 mb-4">
                    or click to browse • PDF, DOCX, XLSX, CSV • Max 10MB
                  </p>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                    Select File
                  </Button>
                </div>
              </div>

              {file && (
                <div className="mt-6 w-full max-w-md">
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <FileText className="w-10 h-10 text-brand-primary" />
                        <div>
                          <p className="font-medium text-white truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setFile(null); resetModal(); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-right mt-1">{uploadProgress}%</p>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full mt-4"
                    size="lg"
                    onClick={uploadAndExtract}
                    disabled={isProcessing || uploadProgress < 100}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing with AI...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Extract & Continue
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* REVIEW STEP */}
          {step === 'review' && extractedData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Review Extracted Data</h3>
                  <p className="text-sm text-gray-500">
                    AI confidence: <span className={getConfidenceColor(extractedData.confidence_score)} font-bold>{(extractedData.confidence_score * 100).toFixed(0)}%</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Re-upload
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {extractedData.fields.map((field, index) => (
                  <div key={index} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <label className="text-xs font-bold text-gray-500 r flex-1 pr-2">
                        {field.label}
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-bold ${getConfidenceColor(field.confidence)}`}>
                          {(field.confidence * 100).toFixed(0)}%
                        </span>
                      </label>
                    </div>
                    
                    {field.type === 'select' && field.options ? (
                      <Select
                        value={editedFields[field.key] || field.value}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        options={field.options.map(opt => ({ value: opt, label: opt }))}
                        className="w-full"
                      />
                    ) : field.type === 'date' ? (
                      <input
                        type="date"
                        value={editedFields[field.key] || field.value}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                      />
                    ) : (
                      <input
                        type={field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
                        value={editedFields[field.key] || field.value}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                        step={field.type === 'currency' ? '0.01' : '1'}
                        min={field.type === 'number' ? '0' : undefined}
                      />
                    )}
                    
                    {field.confidence < 0.7 && (
                      <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Low confidence — please verify
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {extractedData.tables && extractedData.tables.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-400 r mb-3">Extracted Tables</h4>
                  {extractedData.tables.map((table, tIndex) => (
                    <div key={tIndex} className="overflow-x-auto bg-gray-800 border border-gray-700 rounded-xl">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-gray-900 border-b border-gray-700">
                            {table.headers.map((h, i) => (
                              <th key={i} className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {table.rows.map((row, rIndex) => (
                            <tr key={rIndex} className="hover:bg-gray-700/50">
                              {row.map((cell, cIndex) => (
                                <td key={cIndex} className="px-3 py-2 text-sm text-gray-300">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-700">
                <Button variant="secondary" onClick={() => setStep('upload')}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button variant="primary" onClick={proceedToConfirm}>
                  Continue to Confirm <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* CONFIRM STEP */}
          {step === 'confirm' && extractedData && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white">Confirm & Save</h3>
              <p className="text-gray-500">Review the final data before saving as a {formLabels[targetForm].toLowerCase()}.</p>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 max-h-96 overflow-y-auto">
                {extractedData.fields.map((field, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-gray-700 last:border-0">
                    <span className="text-xs font-bold text-gray-500 r">{field.label}</span>
                    <span className="font-mono text-white text-right max-w-xs truncate">{editedFields[field.key] || field.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <Button variant="secondary" onClick={() => setStep('review')}>
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save as {formLabels[targetForm]}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DocumentToFormModal;