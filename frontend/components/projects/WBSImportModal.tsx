import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Upload, AlertCircle, CheckCircle2, FileText, X } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface WBSImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}

export const WBSImportModal: React.FC<WBSImportModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onSuccess
}) => {
  const [csvContent, setCsvContent] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFileName(selectedFile.name);
    setFile(selectedFile);
    setImportResult(null);

    if (selectedFile.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvContent(content);
      };
      reader.readAsText(selectedFile);
    } else {
      setCsvContent(''); // Not used for Excel
    }
  };

  const handleImport = async () => {
    if (!file && !csvContent) return;
    setIsUploading(true);
    try {
      let response;
      if (file?.name.endsWith('.xlsx')) {
        const formData = new FormData();
        formData.append('file', file);
        response = await api.post(`/wbs/import-excel/${projectId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await api.post(`/wbs/import-csv/${projectId}`, { csvContent });
      }

      setImportResult(response.data);
      if (response.data.imported > 0) {
        toast.success(`Successfully imported ${response.data.imported} items`);
        onSuccess();
      }
    } catch (error: any) {
      console.error('Import failed', error);
      toast.error(error.response?.data?.message || 'Failed to import file');
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setCsvContent('');
    setFile(null);
    setFileName('');
    setImportResult(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { onClose(); reset(); }}
      title="Bulk Import WBS Items"
      size="lg"
      footer={
        <div className="flex justify-end space-x-3 w-full">
          <Button variant="secondary" onClick={() => { onClose(); reset(); }} disabled={isUploading}>Close</Button>
          {!importResult && (
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!csvContent || isUploading}
            >
              {isUploading ? 'Importing...' : 'Start Import'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {!importResult ? (
          <>
            <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">CSV / Excel Format Requirements</h4>
                <button
                  onClick={() => {
                    const headers = ["WBS Code", "Description", "Unit Cost", "Quantity", "Days", "Parent WBS Code"];
                    const csvLines = [headers.join(","), "1.0,Sample Phase,0,0,0,", "1.1,Sample Activity,100,10,1,1.0"];
                    const blob = new Blob([csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "wbs_import_template.csv");
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="text-[10px] text-brand-primary hover:underline flex items-center"
                >
                  <FileText className="w-3 h-3 mr-1" /> Download Template
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mb-3">
                Your file should include these headers: <code className="text-brand-primary">WBS Code</code>, <code className="text-brand-primary">Description</code>, <code className="text-brand-primary">Unit Cost</code>, <code className="text-brand-primary">Quantity</code>, <code className="text-brand-primary">Days</code>.
              </p>
              <div className="flex items-center space-x-2 text-[10px] text-yellow-500 bg-yellow-900/10 p-2 rounded border border-yellow-900/30">
                <AlertCircle className="w-4 h-4" />
                <span>Note: Parent relationships are automatically resolved if WBS codes follow a standard hierarchy (e.g., 1.1 is child of 1.0).</span>
              </div>
            </div>

            <div className="relative border-2 border-dashed border-gray-800 rounded-2xl p-10 text-center hover:border-brand-primary transition-colors">
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center">
                <div className="p-3 bg-gray-800 rounded-xl mb-4 group-hover:bg-brand-primary/20 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 group-hover:text-brand-primary" />
                </div>
                <p className="text-sm font-bold text-white mb-1">
                  {fileName || 'Click or drag CSV/Excel file to upload'}
                </p>
                <p className="text-xs text-gray-500">Maximum file size: 5MB</p>
              </div>
            </div>

            {fileName && (
              <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-brand-primary" />
                  <span className="text-xs text-gray-300 font-mono">{fileName} loaded</span>
                </div>
                <button onClick={reset} className="p-1 hover:bg-gray-800 rounded-full transition">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-4 bg-green-900/20 rounded-full mb-2">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Import Process Complete</h3>
              <p className="text-sm text-gray-400">
                Successfully drafted <span className="text-green-400 font-bold">{importResult.imported}</span> WBS items.
              </p>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" /> Anomalies ({importResult.errors.length})
                </h4>
                <div className="max-h-40 overflow-y-auto bg-red-900/10 border border-red-900/30 rounded-xl p-3">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-[10px] text-red-400/80 mb-1 font-mono">• {err}</p>
                  ))}
                </div>
              </div>
            )}

            <Button variant="primary" className="w-full mt-4" onClick={() => { onClose(); reset(); }}>
              Back to WBS Manager
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
