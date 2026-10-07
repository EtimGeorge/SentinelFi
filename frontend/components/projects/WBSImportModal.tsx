import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Upload, AlertCircle, CheckCircle2, FileText, X, ScanSearch, Layers } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface WBSImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}

/** Mirrors WbsImportResult on the server (backend/src/wbs/utils/wbs-spreadsheet-import.util.ts). */
interface ImportRowReport {
  sourceRow: number;
  wbs_code: string;
  description: string;
  parent_wbs_code: string | null;
  estimatedTotal: number;
  issues: string[];
  warnings: string[];
}

interface ImportColumnReport {
  header: string;
  field: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
}

interface ImportReport {
  imported: number;
  errors: string[];
  warnings: string[];
  created: Array<{ wbs_code: string; wbs_id: string; sourceRow: number }>;
  updated: Array<{ wbs_code: string; wbs_id: string; sourceRow: number }>;
  skippedExisting: Array<{ wbs_code: string; sourceRow: number }>;
  rows: ImportRowReport[];
  summary: {
    totalRows: number;
    importable: number;
    flagged: number;
    skipped: number;
    estimatedTotal: number;
  };
  truncated: boolean;
  droppedRows: number;
  headerRow: number | null;
  columns: ImportColumnReport[];
  currencies: string[];
  dryRun: boolean;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const PREVIEW_ROW_LIMIT = 8;

/**
 * What to do with a WBS code that already exists in the project. Mirrors
 * WbsImportMode on the server.
 *
 * This is not a cosmetic choice. `create` refuses a duplicate outright,
 * `update` overwrites the figures while keeping the item's id, position in the
 * tree and creation date, and `skip` leaves the existing line alone. An operator
 * who re-uploads a corrected budget needs `update`; without a control for it the
 * only option is a hand edit of every row.
 */
type ImportMode = 'create' | 'update' | 'skip';

const IMPORT_MODES: Array<{
  value: ImportMode;
  label: string;
  hint: string;
}> = [
  {
    value: 'create',
    label: 'Add new only',
    hint: 'Refuse any code that already exists in this project. Safest default.',
  },
  {
    value: 'update',
    label: 'Update existing',
    hint: 'Overwrite the values on codes that already exist, keeping their position in the tree.',
  },
  {
    value: 'skip',
    label: 'Skip existing',
    hint: 'Leave codes that already exist completely untouched.',
  },
];

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
};

const amount = (value: number): string =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value || 0);

const plural = (count: number, singular: string): string =>
  `${count} ${singular}${count === 1 ? '' : 's'}`;

/** Pulls the server's message out of either an axios error or a resolved 4xx. */
const serverMessage = (payload: any, fallback: string): string => {
  const message = payload?.data?.message ?? payload?.message;
  if (typeof message === 'string' && message.trim() !== '') return message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  return fallback;
};

export const WBSImportModal: React.FC<WBSImportModalProps> = ({
  isOpen, onClose, projectId, onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [mode, setMode] = useState<ImportMode>('create');
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<ImportReport | null>(null);
  const [importResult, setImportResult] = useState<ImportReport | null>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setImportResult(null);
    setIsBusy(false);
    setIsDragging(false);
  };

  /** Shared by the file input and the drop handlers so both reject identically. */
  const acceptFile = (selectedFile: File) => {
    if (!ACCEPTED_EXTENSIONS.includes(extensionOf(selectedFile.name))) {
      toast.error('Only .xlsx, .xls and .csv files can be imported.');
      return;
    }
    if (selectedFile.size > MAX_FILE_BYTES) {
      toast.error('That file is larger than 5MB. Remove rows you do not need, or split the sheet.');
      return;
    }
    if (selectedFile.size === 0) {
      toast.error('That file is empty.');
      return;
    }
    setFile(selectedFile);
    setPreview(null);
    setImportResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    acceptFile(selectedFile);
    // Reset so choosing the same file again fires a change event.
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) acceptFile(dropped);
  };

  /**
   * Both steps post the file itself. Reading a .csv in the browser and sending
   * its text used to be how this modal worked, and it is what disabled the import
   * button for every Excel file — the text was empty, so the button thought there
   * was nothing to send. The server now decodes and detects the format instead.
   */
  const postFile = async (endpoint: string, importMode: ImportMode): Promise<ImportReport> => {
    if (!file) throw new Error('No file selected.');
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(
      `/wbs/${endpoint}/${projectId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, params: { mode: importMode } },
    );

    // The shared axios client resolves 2xx-4xx so that a 401 can be renewed and
    // retried transparently. That makes a 400, a 413 and a 422 land here on the
    // "success" path, and reading their body as an ImportReport would render a
    // result screen full of `undefined` and a "0 items" success message. Every
    // non-2xx is therefore turned back into a thrown error here.
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        serverMessage(response, `The server rejected that file (HTTP ${response.status}).`),
      );
    }
    return response.data as ImportReport;
  };

  const handlePreview = async (importMode: ImportMode = mode) => {
    if (!file) return;
    setIsBusy(true);
    try {
      const report = await postFile('import-preview', importMode);
      setPreview(report);
      if (report.imported === 0) {
        toast.error('Nothing importable in that file yet — the reasons are listed below.');
      }
    } catch (error: any) {
      console.error('Import preview failed', error);
      setPreview(null);
      toast.error(serverMessage(error, 'Could not read that file.'));
    } finally {
      setIsBusy(false);
    }
  };

  /**
   * Changing the mode changes what would be written, so the review screen is
   * discarded and re-read. Importing against a stale preview is how an operator
   * ends up overwriting a budget they meant to leave alone.
   */
  const handleModeChange = (nextMode: ImportMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    if (preview) void handlePreview(nextMode);
  };

  const handleImport = async () => {
    setIsBusy(true);
    try {
      const report = await postFile('import-excel', mode);
      setImportResult(report);
      if (report.imported > 0) {
        toast.success(`Drafted ${plural(report.imported, 'WBS item')}`);
        onSuccess();
      } else {
        toast.error('Nothing was imported — review the reasons below.');
      }
    } catch (error: any) {
      console.error('Import failed', error);
      toast.error(serverMessage(error, 'Failed to import file'));
    } finally {
      setIsBusy(false);
    }
  };

  const mappedColumns = preview?.columns.filter((column) => column.field) ?? [];
  const ignoredColumns =
    preview?.columns.filter((column) => !column.field && column.header !== '') ?? [];
  const problemRows = preview?.rows.filter((row) => row.issues.length > 0) ?? [];
  const importBlocked = !preview || preview.imported === 0 || preview.truncated;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { onClose(); reset(); }}
      title="Bulk Import WBS Items"
      size="lg"
      footer={
        <div className="flex justify-between items-center space-x-3 w-full">
          <Button variant="secondary" onClick={() => { onClose(); reset(); }} disabled={isBusy}>Close</Button>

          {importResult ? (
            <Button variant="primary" onClick={() => { onClose(); reset(); }}>Back to WBS Manager</Button>
          ) : preview ? (
            <div className="flex space-x-3">
              <Button variant="secondary" onClick={() => { setPreview(null); reset(); }} disabled={isBusy}>
                Choose another file
              </Button>
              <Button variant="primary" onClick={handleImport} disabled={isBusy || importBlocked}>
                {isBusy
                  ? 'Importing...'
                  : importBlocked
                    ? 'Cannot import yet'
                    : `Import ${plural(preview.imported, 'item')}`}
              </Button>
            </div>
          ) : (
              <Button
                variant="primary"
                onClick={() => void handlePreview()}
                disabled={!file || isBusy}
              >
                {isBusy ? 'Reading file...' : 'Review file'}
              </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* The mode control sits above both states on purpose. It used to live
            only in the file-picker view, which meant the control disappeared the
            moment a preview was shown — exactly when an operator discovers that
            the file contains codes the project already has. */}
        {!importResult && (
          <fieldset className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
            <legend className="px-1 text-xs font-bold text-gray-400">
              When a WBS code already exists in this project
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
              {IMPORT_MODES.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    mode === option.value
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="wbs-import-mode"
                    value={option.value}
                    checked={mode === option.value}
                    onChange={() => handleModeChange(option.value)}
                    className="mt-0.5 accent-brand-primary"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-white">{option.label}</span>
                    <span className="block text-xs text-gray-500">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {!preview && !importResult ? (
          <>
            <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-xs font-bold text-gray-400 ">CSV / Excel Format Requirements</h4>
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
                  className="text-xs text-brand-primary hover:underline flex items-center"
                >
                  <FileText className="w-3 h-3 mr-1" /> Download Template
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Headers the importer looks for: <code className="text-brand-primary">WBS Code</code>, <code className="text-brand-primary">Description</code>, <code className="text-brand-primary">Unit Cost</code>, <code className="text-brand-primary">Quantity</code>, <code className="text-brand-primary">Days</code>. Most real-world exports also work as-is: title rows above the header, extra columns, currency symbols, thousand separators, and column names like <code className="text-brand-primary">Activity</code>, <code className="text-brand-primary">Rate</code> or <code className="text-brand-primary">Amount</code>.
              </p>
              <div className="flex items-start space-x-2 text-xs text-yellow-500 bg-yellow-900/10 p-2 rounded border border-yellow-900/30">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Parent relationships are resolved from the WBS codes (1.1 belongs to 1.0) even when the file has no parent column. Nothing is written until you review the file and confirm.</span>
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              aria-label="Upload an Excel or CSV budget file"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed p-10 text-center transition-colors ${
                isDragging
                  ? 'border-brand-primary bg-brand-primary/5'
                  : 'border-gray-800 hover:border-brand-primary'
              }`}
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center">
                <div className="p-3 bg-gray-800 rounded-xl mb-4 group-hover:bg-brand-primary/20 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 group-hover:text-brand-primary" />
                </div>
                <p className="text-sm font-bold text-white mb-1">
                  {file?.name || (isDragging ? 'Drop the file here' : 'Click or drag an Excel or CSV file to upload')}
                </p>
                <p className="text-xs text-gray-500">.xlsx, .xls or .csv &middot; Maximum file size: 5MB</p>
              </div>
            </div>

            {file && (
              <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-brand-primary" />
                  <span className="text-xs text-gray-300 font-mono break-all">{file.name}</span>
                </div>
                <button onClick={reset} className="p-1 hover:bg-gray-800 rounded-full transition" aria-label="Remove file">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
          </>
        ) : preview ? (
          <>
            <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-bold text-gray-400 flex items-center">
                  <ScanSearch className="w-4 h-4 mr-1 text-brand-primary" /> How this file was read
                </h4>
                <button onClick={reset} className="p-1 hover:bg-gray-800 rounded-full transition" aria-label="Discard file">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-300 font-mono mt-2 break-all">{file?.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {preview.headerRow
                  ? `Header row found on row ${preview.headerRow}, with ${plural(preview.summary.totalRows, 'data row')} below it.`
                  : 'No header row was found, so no columns could be mapped.'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Existing codes will be handled by{' '}
                <span className="text-gray-300">{IMPORT_MODES.find((option) => option.value === mode)?.label}</span>.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Will be imported', value: preview.imported },
                { label: 'Need attention', value: preview.summary.flagged },
                { label: 'Already in project', value: preview.skippedExisting.length },
                { label: 'Total rows ignored', value: preview.summary.skipped },
              ].map((stat) => (
                <div key={stat.label} className="p-3 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg flex items-center justify-between">
              <span className="text-xs text-gray-400 flex items-center">
                <Layers className="w-4 h-4 mr-2 text-brand-primary" /> Value of rows to be imported
              </span>
              <span className="text-sm font-bold text-white">
                {amount(preview.summary.estimatedTotal)}
                {preview.currencies.length > 0 && (
                  <span className="text-xs text-gray-500 ml-1">{preview.currencies.join(', ')}</span>
                )}
              </span>
            </div>

            {preview.truncated && (
              <div className="flex items-start space-x-2 text-xs text-red-400 bg-red-900/10 p-3 rounded-xl border border-red-900/30">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>This file is bigger than the importer reads: {plural(preview.droppedRows, 'row')} were never read, so importing is blocked. Split the sheet and import the parts one at a time.</span>
              </div>
            )}

            {(mappedColumns.length > 0 || ignoredColumns.length > 0) && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 mb-2">Columns</h4>
                <div className="flex flex-wrap gap-2">
                  {mappedColumns.map((column) => (
                    <span key={`${column.header}-${column.field}`} className="text-xs px-2 py-1 rounded bg-green-900/20 text-green-400 border border-green-900/30">
                      {column.header} <span className="text-gray-500">&rarr;</span> {column.field}
                    </span>
                  ))}
                  {ignoredColumns.map((column) => (
                    <span key={`ignored-${column.header}`} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-500 border border-gray-700" title="This column is not used by the import">
                      {column.header}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {preview.imported === 0 && preview.errors.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-red-400 mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" /> Why nothing can be imported
                </h4>
                <div className="max-h-40 overflow-y-auto bg-red-900/10 border border-red-900/30 rounded-xl p-3 space-y-1">
                  {preview.errors.map((message, index) => (
                    <p key={index} className="text-xs text-red-400/80 font-mono">&bull; {message}</p>
                  ))}
                </div>
              </div>
            )}

            {problemRows.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-red-400 mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" /> Rows that will be skipped ({problemRows.length})
                </h4>
                <div className="max-h-40 overflow-y-auto bg-red-900/10 border border-red-900/30 rounded-xl p-3 space-y-1">
                  {problemRows.slice(0, PREVIEW_ROW_LIMIT).map((row) => (
                    <p key={row.sourceRow} className="text-xs text-red-400/80 font-mono">
                      &bull; Row {row.sourceRow}{row.wbs_code ? ` (${row.wbs_code})` : ''}: {row.issues.join('; ')}
                    </p>
                  ))}
                  {problemRows.length > PREVIEW_ROW_LIMIT && (
                    <p className="text-xs text-red-400/60 font-mono">+ {problemRows.length - PREVIEW_ROW_LIMIT} more</p>
                  )}
                </div>
              </div>
            )}

            {preview.skippedExisting.length > 0 && (
              <div className="p-3 bg-yellow-900/10 border border-yellow-900/30 rounded-xl">
                <p className="text-xs text-yellow-500">
                  {plural(preview.skippedExisting.length, 'code')} already exist in this project and will be left as they are:{' '}
                  <span className="font-mono">
                    {preview.skippedExisting.slice(0, PREVIEW_ROW_LIMIT).map((item) => item.wbs_code).join(', ')}
                    {preview.skippedExisting.length > PREVIEW_ROW_LIMIT ? ' …' : ''}
                  </span>
                </p>
              </div>
            )}

            {preview.warnings.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 mb-2">Notes ({preview.warnings.length})</h4>
                <div className="max-h-32 overflow-y-auto p-3 bg-gray-800/50 border border-gray-700 rounded-xl space-y-1">
                  {preview.warnings.map((warning, index) => (
                    <p key={index} className="text-xs text-gray-500">&bull; {warning}</p>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`p-4 rounded-full mb-2 ${importResult.imported > 0 ? 'bg-green-900/20' : 'bg-yellow-900/20'}`}>
                {importResult.imported > 0 ? (
                  <CheckCircle2 className="w-12 h-12 text-green-400" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-yellow-500" />
                )}
              </div>
              <h3 className="text-lg font-bold text-white">
                {importResult.imported > 0 ? 'Import complete' : 'Nothing was imported'}
              </h3>
              <p className="text-sm text-gray-400">
                {importResult.imported > 0 ? (
                  <>Drafted <span className="text-green-400 font-bold">{importResult.imported}</span> WBS items.</>
                ) : (
                  'The file was read, but no line item could be created. The reasons are listed below.'
                )}
              </p>
              {importResult.skippedExisting.length > 0 && (
                <p className="text-xs text-gray-500">
                  {plural(importResult.skippedExisting.length, 'row')} already existed in this project and were left unchanged.
                </p>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-bold text-red-400  mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" /> Anomalies ({importResult.errors.length})
                </h4>
                <div className="max-h-40 overflow-y-auto bg-red-900/10 border border-red-900/30 rounded-xl p-3">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-400/80 mb-1 font-mono">• {err}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
