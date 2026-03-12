import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Database, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

interface WbsTemplate {
  id: string;
  name: string;
  industry: string;
  structure: any[];
}

interface WBSApplyTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}

export const WBSApplyTemplateModal: React.FC<WBSApplyTemplateModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onSuccess
}) => {
  const [templates, setTemplates] = useState<WbsTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/wbs/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to load WBS templates', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedTemplateId) return;
    setIsApplying(true);
    try {
      await api.post(`/wbs/templates/apply/${projectId}`, { templateId: selectedTemplateId });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to apply template', error);
      alert('Failed to apply template. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply WBS Template"
      size="md"
      footer={
        <div className="flex justify-end space-x-3 w-full">
          <Button variant="secondary" onClick={onClose} disabled={isApplying}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={!selectedTemplateId || isApplying}
          >
            {isApplying ? 'Applying...' : 'Apply Template'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-xl mb-4">
          <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">Select Project Structure</p>
          <p className="text-[10px] text-gray-500 mt-1">Applying a template will bulk-add a set of pre-defined WBS nodes to this project. Existing nodes will NOT be deleted.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500">
            No templates found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplateId(template.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between
                                    ${selectedTemplateId === template.id
                    ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/50'
                    : 'border-gray-800 bg-gray-800/20 hover:border-gray-600'}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${selectedTemplateId === template.id ? 'bg-brand-primary text-white' : 'bg-gray-800 text-gray-400'}`}>
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{template.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono tracking-wider">{template.industry} • {template.structure.length} items</div>
                  </div>
                </div>
                {selectedTemplateId === template.id && (
                  <CheckCircle className="w-5 h-5 text-brand-primary" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
