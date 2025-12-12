'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  operationsService,
  DocumentComment,
  DocumentAttachment,
} from '@/lib/operations';
import { showToast } from '@/lib/toast';
import { X, MessageSquare, Paperclip, Loader2 } from 'lucide-react';

type DocumentType = 'receipt' | 'delivery' | 'return' | 'transfer' | 'adjustment';

interface DocumentCollaborationPanelProps {
  open: boolean;
  documentType: DocumentType;
  documentId?: number;
  documentNumber?: string;
  onClose: () => void;
}

const formatBytes = (bytes: number) => {
  if (!bytes || Number.isNaN(bytes)) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value?: string) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const extractResults = <T,>(payload: any): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  if ('results' in payload && Array.isArray(payload.results)) {
    return payload.results as T[];
  }
  return [];
};

export default function DocumentCollaborationPanel({
  open,
  documentType,
  documentId,
  documentNumber,
  onClose,
}: DocumentCollaborationPanelProps) {
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    if (open && documentId) {
      void loadCollaborationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentId, documentType]);

  const loadCollaborationData = async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      const [commentsData, attachmentsData] = await Promise.all([
        operationsService.getComments({
          document_type: documentType,
          document_id: documentId,
        }),
        operationsService.getAttachments({
          document_type: documentType,
          document_id: documentId,
        }),
      ]);
      setComments(extractResults<DocumentComment>(commentsData));
      setAttachments(extractResults<DocumentAttachment>(attachmentsData));
    } catch (error) {
      console.error('Failed to load collaboration data', error);
      showToast.error('Unable to load comments or attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !documentId) {
      showToast.error('Enter a comment first');
      return;
    }
    try {
      setCommentSubmitting(true);
      const newComment = await operationsService.createComment({
        document_type: documentType,
        document_id: documentId,
        message: commentText.trim(),
      });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      showToast.success('Comment added');
    } catch (error: any) {
      showToast.error(error.response?.data?.detail || 'Failed to add comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleUploadAttachment = async () => {
    if (!pendingFile || !documentId) {
      showToast.error('Select a file first');
      return;
    }
    try {
      setUploading(true);
      const attachment = await operationsService.createAttachment({
        document_type: documentType,
        document_id: documentId,
        file: pendingFile,
      });
      setAttachments((prev) => [attachment, ...prev]);
      setPendingFile(null);
      setFileInputKey((key) => key + 1);
      showToast.success('Attachment uploaded');
    } catch (error: any) {
      showToast.error(error.response?.data?.detail || 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  const currentTitle = useMemo(() => {
    if (!documentNumber) return documentType.toUpperCase();
    return `${documentType.toUpperCase()} • ${documentNumber}`;
  }, [documentType, documentNumber]);

  if (!open || !documentId) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Collaboration
            </p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{currentTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            aria-label="Close collaboration panel"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={18} className="text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Comments</h3>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="animate-spin" size={16} />
                Loading comments…
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-gray-500">No comments yet. Be the first to leave a note.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 bg-gray-50/50 dark:bg-gray-800/40"
                  >
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {comment.author_name || 'Unknown user'}
                      </span>
                      <span>{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-800 dark:text-gray-100 whitespace-pre-line">
                      {comment.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Leave an update or question for the team..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAddComment}
                  disabled={commentSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700 disabled:opacity-60"
                >
                  {commentSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Add comment
                </button>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Paperclip size={18} className="text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Attachments</h3>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="animate-spin" size={16} />
                Loading attachments…
              </div>
            ) : attachments.length === 0 ? (
              <p className="text-sm text-gray-500">
                No supporting files yet. Add packing slips, photos, or approvals here.
              </p>
            ) : (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file_url || attachment.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-gray-100 dark:border-gray-800 p-3 hover:border-primary-200 hover:bg-primary-50/40 dark:hover:border-primary-500 transition"
                  >
                    <div className="flex items-center justify-between text-sm text-gray-800 dark:text-gray-200">
                      <span className="font-medium">{attachment.file_name}</span>
                      <span className="text-xs text-gray-500">{formatBytes(attachment.file_size)}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3 mt-1">
                      <span>{attachment.mime_type}</span>
                      <span>•</span>
                      <span>{formatDate(attachment.uploaded_at)}</span>
                      {attachment.uploaded_by_name && (
                        <>
                          <span>•</span>
                          <span>by {attachment.uploaded_by_name}</span>
                        </>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-2">
              <input
                key={fileInputKey}
                type="file"
                onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-3
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleUploadAttachment}
                  disabled={!pendingFile || uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-200 text-primary-600 text-sm hover:bg-primary-50 disabled:opacity-60"
                >
                  {uploading && <Loader2 size={16} className="animate-spin" />}
                  Upload file
                </button>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}


