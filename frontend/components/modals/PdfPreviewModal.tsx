import React from 'react';
import { X, Download, Printer, FileText } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
  title: string;
  onDownload?: () => void;
}

const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  pdfBlob,
  title,
  onDownload
}) => {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfUrl(null);
    }
  }, [pdfBlob]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 leading-tight">{title}</h3>
              <p className="text-xs text-slate-500">Document Preview • SentinelFi Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onDownload && (
              <button 
                onClick={onDownload}
                className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                title="Download PDF"
              >
                <Download size={20} />
              </button>
            )}
            <button 
              onClick={() => window.print()}
              className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
              title="Print"
            >
              <Printer size={20} />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-2" />
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-800 relative">
          {pdfUrl ? (
            <iframe 
              src={`${pdfUrl}#toolbar=0`} 
              className="w-full h-full border-none"
              title="PDF Preview"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4" />
              <p className="text-sm font-medium">Generating document...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;
