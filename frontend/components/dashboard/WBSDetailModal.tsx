import React from 'react';
import Card from '../common/Card';
import { X, ExternalLink } from 'lucide-react';

interface WBSDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  wbsId: string | null;
  wbsCode: string | null;
  description: string | null;
  // Potentially add more detail properties here later (e.g., expenses, LPOs)
}

const WBSDetailModal: React.FC<WBSDetailModalProps> = ({ isOpen, onClose, wbsId, wbsCode, description }) => {
  if (!isOpen || !wbsId) return null;

  // Placeholder for a potential link to a dedicated WBS detail page
  // const detailPageUrl = `/wbs/${wbsId}`; 

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <Card title={`WBS Details: ${wbsCode}`} borderTopColor="primary" className="w-full max-w-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <div className="space-y-4 text-gray-200 mt-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-400">WBS ID</h4>
            <p className="text-base">{wbsId}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-400">Description</h4>
            <p className="text-base">{description}</p>
          </div>
          {/* Add more WBS details here */}
          
          {/* Example of a button to view a full detail page */}
          {/* <a href={detailPageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-brand-primary hover:underline mt-4">
            View Full WBS Details <ExternalLink className="w-4 h-4 ml-1" />
          </a> */}
        </div>
      </Card>
    </div>
  );
};

export default WBSDetailModal;
