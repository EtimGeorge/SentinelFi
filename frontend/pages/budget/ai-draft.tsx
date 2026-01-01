import React, { useState } from 'react';
import Head from 'next/head';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { UploadCloud, FileText, CheckCircle } from 'lucide-react';
import { WBSItemBase } from '../../lib/wbsUtils';
import withAuth from '../../components/auth/withAuth';
import { Role } from '../../components/context/AuthContext';
import { formatCurrency } from '../../lib/utils';

// Interface for the response from the AI agent (via the NestJS proxy)
interface AiDraftResponse {
  project_name: string;
  wbs_line_items: WBSItemBase[];
  confidence_score: number;
}

const AIBudgetDraftingPage: React.FC = () => {
  const api = useSecuredApi();
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftResult, setDraftResult] = useState<AiDraftResponse | null>(null);

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

    const formData = new FormData();
    formData.append('project_name', projectName.trim());
    formData.append('file', file);

    try {
      const response = await api.post<AiDraftResponse>('/ai/draft-budget', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setDraftResult(response.data);
      setFile(null);
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.response?.data?.message || e.message;
      setError(`AI Draft Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportDraft = async () => {
    if (!draftResult) return;

    try {
      await api.post('/wbs/budget-draft/batch', draftResult.wbs_line_items);
      alert('Draft imported successfully!');
    } catch (error) {
      console.error('Failed to import draft:', error);
      alert('Failed to import draft. Please check the console for more details.');
    }
  };

  return (
    <>
      <Head><title>AI Budget Draft | SentinelFi</title></Head>
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-sm text-gray-400">Budgeting / AI Document Intelligence</p>
          <h1 className="text-4xl font-bold">AI Document Intelligence Drafting</h1>
          <p className="text-sm text-brand-primary mt-1">Automate WBS budget creation from source documents (PDF, Excel, OCR).</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-xl border-t-4 border-brand-secondary">
          <h2 className="text-xl font-semibold text-brand-secondary mb-4">Upload Source Document</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="projectName">Project Name <span className="text-red-500">*</span></label>
              <input type="text" id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} required 
                placeholder="e.g., Alpha Project NGN Budget"
                className="block w-full p-2 border border-gray-300 rounded-lg shadow-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source File (PDF, DOCX, CSV)</label>
              <div className="border-2 border-dashed border-gray-300 p-8 rounded-lg text-center cursor-pointer hover:border-brand-primary transition">
                <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" 
                       accept=".pdf,.docx,.csv,.xlsx,.xls" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <UploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Click to select or drag and drop</p>
                  {file && <p className="text-sm text-gray-700 mt-2 font-semibold flex items-center justify-center"><FileText className="w-4 h-4 mr-1" /> {file.name}</p>}
                </label>
              </div>
            </div>
            
            {error && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-lg font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition shadow-md"
            >
              {loading ? 'Analyzing Document...' : 'Submit to AI Agent'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-xl border-t-4 border-brand-primary">
          <h2 className="text-xl font-semibold text-brand-primary mb-4 flex justify-between items-center">
            Extracted Draft Preview {draftResult && <CheckCircle className="w-6 h-6 text-green-500" />}
          </h2>
          
          {draftResult ? (
            <div className="space-y-4">
              <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">Confidence Score:</p>
                <p className={`text-lg font-bold ${draftResult.confidence_score > 0.8 ? 'text-green-500' : 'text-red-500'}`}>{Math.round(draftResult.confidence_score * 100)}%</p>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">WBS</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Unit Cost</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {draftResult.wbs_line_items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-100 transition">
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-brand-primary">{item.wbs_code}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{item.description}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right">{formatCurrency(item.unit_cost_budgeted)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right">{item.quantity_budgeted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={handleImportDraft} className="w-full py-2 bg-green-500 rounded-lg font-semibold text-white hover:bg-green-600 transition">
                Import Draft to Budget Module
              </button>
            </div>
          ) : (
            <div className="text-gray-400 text-center p-12 border border-dashed border-gray-300 rounded-lg">
              Upload a budget document to generate a structured draft for review.
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default withAuth(AIBudgetDraftingPage, [Role.Admin, Role.Finance]);
