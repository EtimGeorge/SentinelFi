import React, { useState } from 'react';
import Head from 'next/head';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { UploadCloud, FileText, CheckCircle, BrainCircuit, Loader2 } from 'lucide-react';
import { WBSItemBase } from '../../lib/wbsUtils';
import withAuth from '../../components/auth/withAuth';
import { Role } from '../../components/context/AuthContext';
import { formatCurrency } from '../../lib/utils';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import useToast from '../../store/toastStore'; // NEW: Import useToast

// Interface for the response from the AI agent (via the NestJS proxy)
interface AiDraftResponse {
  project_name: string;
  wbs_line_items: WBSItemBase[];
  confidence_score: number;
}

const AIBudgetDraftingPage: React.FC = () => {
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast); // NEW: Get addToast
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftResult, setDraftResult] = useState<AiDraftResponse | null>(null);
  const [aiProcessingStatus, setAiProcessingStatus] = useState<string | null>(null); // NEW: AI Processing Status

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !projectName) {
      setError("Please provide a Project Name and select a file.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setDraftResult(null);
    setAiProcessingStatus("Uploading document...");

    const formData = new FormData();
    formData.append('project_name', projectName.trim());
    formData.append('file', file);

    try {
      const response = await api.post<AiDraftResponse>('/ai/draft-budget', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          setAiProcessingStatus(`Uploading: ${percentCompleted}%`);
        }
      });
      
      setAiProcessingStatus("Analyzing document with AI...");
      // Simulate AI processing - in a real app, backend would send updates
      setTimeout(() => {
        setAiProcessingStatus("AI analysis complete.");
        setDraftResult(response.data);
        setFile(null);
      }, 2000); // Simulate AI processing time
      
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.response?.data?.message || e.message;
      setError(`AI Draft Failed: ${msg}`);
      setAiProcessingStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImportDraft = async () => {
    if (!draftResult) return;

    try {
      await api.post('/wbs/budget-draft/batch', draftResult.wbs_line_items);
      addToast({ title: 'Draft Imported', description: 'Budget draft imported successfully!', type: 'success' }); // NEW: Use toast
      setDraftResult(null); // Clear the draft after import
    } catch (error: any) {
      console.error('Failed to import draft:', error);
      addToast({ title: 'Import Failed', description: `Failed to import draft: ${error.message || 'Unknown error'}`, type: 'error' }); // NEW: Use toast
    }
  };

  return (
    <>
      <Head><title>AI Budget Draft | SentinelFi</title></Head>
      <PageContainer
        title="AI Document Intelligence"
        subtitle="Automate WBS budget creation from source documents (PDF, Excel, OCR)."
        headerContent={<BrainCircuit className="w-8 h-8 text-brand-secondary" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1">
            <Card title="Upload Source Document" borderTopColor="secondary">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-1" htmlFor="projectName">Project Name <span className="text-red-500">*</span></label>
                  <input type="text" id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} required 
                    placeholder="e.g., Alpha Project NGN Budget"
                    className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Source File (PDF, DOCX, CSV)</label>
                  <div className="border-2 border-dashed border-gray-700 p-8 rounded-lg text-center cursor-pointer hover:border-brand-primary transition">
                    <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" 
                           accept=".pdf,.docx,.csv,.xlsx,.xls" />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <CloudUpload className="w-10 h-10 mx-auto text-gray-500 mb-2" />
                      <p className="text-sm text-gray-400">Click to upload or drag and drop</p>
                      {file && <p className="text-sm text-white mt-2 font-semibold flex items-center justify-center"><FileText className="w-4 h-4 mr-1" /> {file.name}</p>}
                    </label>
                  </div>
                </div>
                
                {error && <div className="p-3 text-sm text-red-400 bg-red-900 rounded-lg border border-red-700">{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 rounded-lg font-semibold text-white bg-alert-critical hover:bg-alert-critical/90 disabled:opacity-50 transition shadow-md"
                >
                  {loading ? <Loader2 className="w-5 h-5 inline animate-spin" /> : 'Submit to AI Agent'}
                </button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card title="Extracted Draft Preview" borderTopColor="primary"
                  headerContent={draftResult && <CheckCircle className="w-6 h-6 text-alert-positive" />}>
              
              {aiProcessingStatus && loading && !error && ( // Display status while loading and no error
                <div className="p-3 mb-4 text-sm text-brand-primary bg-brand-dark/50 rounded-lg border border-brand-primary/50 flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {aiProcessingStatus}
                </div>
              )}

              {draftResult ? (
                <div className="space-y-4">
                  <div className="p-3 bg-brand-dark/50 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400">Confidence Score:</p>
                    <p className={`text-lg font-bold ${draftResult.confidence_score > 0.8 ? 'text-alert-positive' : 'text-red-500'}`}>{Math.round(draftResult.confidence_score * 100)}%</p>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-900/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">WBS</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Unit Cost</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {draftResult.wbs_line_items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-700/50 transition">
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-brand-primary">{item.wbs_code}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">{item.description}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-white">{formatCurrency(item.unit_cost_budgeted)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-white">{item.quantity_budgeted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={handleImportDraft} className="w-full py-2 bg-alert-positive rounded-lg font-semibold text-white hover:bg-green-600/90 transition">
                    Import Draft to Budget Module
                  </button>
                </div>
              ) : (
                <div className="text-gray-500 text-center p-12 border border-dashed border-gray-700 rounded-lg">
                  {loading ? <Loader2 className="w-8 h-8 inline animate-spin text-brand-primary" /> : 'Upload a budget document to generate a structured draft for review.'}
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default withAuth(AIBudgetDraftingPage, [Role.Admin, Role.Finance]);