import React, { useState, useEffect, useCallback } from 'react';
import Card from '../common/Card';
import { X, ExternalLink, MessageSquare, Send, Loader2 } from 'lucide-react';
import { useSecuredApi } from '../hooks/useSecuredApi';
import { format } from 'date-fns';

interface WBSDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  wbsId: string | null;
  wbsCode: string | null;
  description: string | null;
}

interface Annotation {
  id: string;
  content: string;
  created_at: string;
  author: {
    first_name: string;
    last_name: string;
  };
}

const WBSDetailModal: React.FC<WBSDetailModalProps> = ({ isOpen, onClose, wbsId, wbsCode, description }) => {
  const api = useSecuredApi();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!wbsId) return;
    setLoadingNotes(true);
    try {
      const resp = await api.get(`/dashboard/annotations`, {
        params: { targetType: 'WBS', targetId: wbsId }
      });
      setAnnotations(resp.data);
    } catch (err) {
      console.error('Failed to fetch annotations:', err);
    } finally {
      setLoadingNotes(false);
    }
  }, [api, wbsId]);

  useEffect(() => {
    if (isOpen && wbsId) {
      fetchNotes();
      setNewNote('');
    }
  }, [isOpen, wbsId, fetchNotes]);

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !wbsId) return;

    setSubmitting(true);
    try {
      await api.post('/dashboard/annotations', {
        target_type: 'WBS',
        target_id: wbsId,
        content: newNote.trim()
      });
      setNewNote('');
      fetchNotes();
    } catch (err) {
      console.error('Failed to save annotation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !wbsId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <Card title={`WBS Details: ${wbsCode}`} borderTopColor="primary" className="w-full max-w-3xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Left Column: Properties */}
          <div className="space-y-4 text-gray-200">
            <div>
              <h4 className="text-sm font-semibold text-gray-400">WBS ID</h4>
              <p className="text-xs font-mono break-all">{wbsId}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-400">Description</h4>
              <p className="text-base">{description}</p>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500 italic">
                Advanced drill-down for expenses and LPOs coming soon in v2.
              </p>
            </div>
          </div>

          {/* Right Column: CEO Annotation Engine */}
          <div className="bg-brand-dark/20 border border-gray-700 rounded-xl p-4 flex flex-col h-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-brand-primary" />
              <h3 className="text-lg font-medium text-white">CEO Feedback Engine</h3>
            </div>

            {/* Note List */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 scrollbar-thin scrollbar-thumb-gray-700">
              {loadingNotes ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-primary" /></div>
              ) : annotations.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">No feedback yet. Add a management note below.</p>
              ) : (
                annotations.map((note) => (
                  <div key={note.id} className="bg-gray-800/80 p-3 rounded-lg border-l-2 border-brand-primary">
                    <p className="text-sm text-gray-200">{note.content}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-brand-primary uppercase font-bold">
                        {note.author.first_name} {note.author.last_name}
                      </span>
                      <span className="text-[10px] text-gray-500 italic">
                        {format(new Date(note.created_at), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Note Input */}
            <form onSubmit={handleSubmitNote} className="relative">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Leave a management note..."
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white focus:ring-brand-primary focus:border-brand-primary resize-none h-24"
              />
              <button
                type="submit"
                disabled={submitting || !newNote.trim()}
                className="absolute bottom-2 right-2 p-2 bg-brand-primary rounded-lg text-white hover:bg-brand-primary/90 disabled:opacity-50 transition"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WBSDetailModal;
