import React, { useState, useEffect } from 'react';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import Head from 'next/head';
import { Send, Clock } from 'lucide-react';
import { Role } from '../../components/context/AuthContext';

// DTO for the automated report request (matches backend)
interface AutomatedReportRequestDto {
    reportType: 'Variance' | 'WBS' | 'Executive';
    wbsCategory: string; // Filter by a Level 1 WBS Category
    emailRecipients: string; // Comma-separated string for simplicity
    schedule: 'Daily EOD' | 'Weekly' | 'Manual';
}

const AutomatedReporting: React.FC = () => {
    const api = useSecuredApi();
    const [formData, setFormData] = useState<AutomatedReportRequestDto>({
        reportType: 'Variance',
        wbsCategory: '1.0',
        emailRecipients: '',
        schedule: 'Daily EOD',
    });
    const [categories, setCategories] = useState<{ code: string, description: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Fetch WBS Categories for the filter dropdown
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await api.get('/wbs/categories');
                setCategories(response.data);
            } catch (e) {
                console.error("Failed to fetch WBS categories:", e);
            }
        };
        fetchCategories();
    }, [api]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        // Final payload preparation (splitting emails)
        const recipientsArray = formData.emailRecipients.split(',').map(email => email.trim()).filter(email => email !== '');

        if (recipientsArray.length === 0) {
            setError("Please enter at least one email address.");
            setLoading(false);
            return;
        }

        try {
            // CRITICAL: Call the DCS Integration API
            await api.post('/dcs/schedule-report', {
                ...formData,
                emailRecipients: recipientsArray,
            });
            
            setSuccess(`Report generation successfully scheduled to run ${formData.schedule} for ${recipientsArray.length} recipients.`);
        } catch (e: any) {
            const msg = e.response?.data?.message || e.message;
            setError(`Scheduling Failed: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

      return (
        <>
          <Head><title>Schedule Report | SentinelFi</title></Head>            
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white mt-1 flex items-center">
                        <Clock className="w-8 h-8 mr-3 text-alert-critical" /> Automated Report Scheduling
                    </h1>
                    <p className="text-lg text-gray-400 mt-1">Configure scheduled distribution for your operational and financial reports (DCS Integration).</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Scheduling Form (lg:col-span-2) */}
                <div className="lg:col-span-2 bg-gray-800 p-8 rounded-xl shadow-xl border-t-4 border-alert-critical">
                    <h2 className="text-2xl font-bold text-alert-critical mb-6">Setup Distribution Job (US-003)</h2>
                    
                    {success && <div className="p-3 mb-4 text-sm text-alert-positive bg-green-900 rounded-lg border border-green-700">{success}</div>}
                    {error && <div className="p-3 mb-4 text-sm text-red-400 bg-red-900 rounded-lg border border-red-700">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-3 gap-6">
                            {/* Report Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="reportType">Report Type</label>
                                <select name="reportType" id="reportType" value={formData.reportType} onChange={handleChange} required
                                    className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white appearance-none">
                                    <option value="Variance">Variance Report</option>
                                    <option value="WBS">WBS Cost Summary</option>
                                    <option value="Executive">Executive KPI Report</option>
                                </select>
                            </div>
                            {/* Schedule */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="schedule">Schedule</label>
                                <select name="schedule" id="schedule" value={formData.schedule} onChange={handleChange} required
                                    className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white appearance-none">
                                    <option value="Daily EOD">Daily EOD</option>
                                    <option value="Weekly">Weekly (Monday AM)</option>
                                    <option value="Manual">Manual Trigger</option>
                                </select>
                            </div>
                            {/* WBS Category Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="wbsCategory">Filter by Category</label>
                                <select name="wbsCategory" id="wbsCategory" value={formData.wbsCategory} onChange={handleChange} required
                                    className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white appearance-none">
                                    {categories.map(cat => (
                                        <option key={cat.code} value={cat.code}>{cat.code} - {cat.description}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Recipients */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-1" htmlFor="emailRecipients">Email Recipients (Comma separated list)</label>
                            <textarea name="emailRecipients" id="emailRecipients" value={formData.emailRecipients} onChange={handleChange} rows={3}
                                placeholder="user1@example.com, user2@example.com"
                                className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white"></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-lg font-bold text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary/50 transition duration-150 ease-in-out disabled:opacity-50"
                        >
                            {loading ? 'Scheduling...' : <><Send className="w-5 h-5 inline mr-2" /> Schedule Report Job</>}
                        </button>
                    </form>
                </div>
                
                {/* Right Column: Key Details */}
                <div className="lg:col-span-1 bg-gray-800 p-6 rounded-xl shadow-lg border-t-4 border-brand-primary">
                    <h3 className="text-xl font-semibold text-brand-primary mb-4">DCS Integration Status</h3>
                    <div className="text-gray-400 space-y-3">
                        <p className="flex items-center text-alert-positive font-semibold">API Endpoint: LIVE</p>
                        <p className="text-sm">Sends secure PDF/CSV data to internal Document Control System (DCS) for external distribution.</p>
                        <p className="text-sm">Requires Finance/Ops Head role to initiate the job.</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AutomatedReporting;
