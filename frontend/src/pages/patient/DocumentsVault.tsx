import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Upload, Grid3X3, List, Download, Trash2, Search,
  FileImage, File, Shield, FlaskConical, Pill, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores';
import { Sidebar, Header, Button, LoadingSpinner, EmptyState, Badge, Modal } from '../../components/shared';
import { useToastStore } from '../../components/shared/Toast';
import type { Document as DocRecord, DocumentType } from '../../types';

const NAV_ITEMS = [
  { icon: <FileText size={20} />, label: 'Dashboard', path: '/patient/dashboard' },
  { icon: <FileText size={20} />, label: 'Book OPD', path: '/patient/book-opd' },
  { icon: <FileText size={20} />, label: 'My Visits', path: '/patient/visits' },
  { icon: <FileText size={20} />, label: 'Health Timeline', path: '/patient/health-timeline' },
  { icon: <FileText size={20} />, label: 'Documents', path: '/patient/documents' },
  { icon: <FileText size={20} />, label: 'Profile', path: '/patient/profile' },
];

const DOC_TYPE_CONFIG: Record<DocumentType, { label: string; icon: typeof FileText; color: string; badgeVariant: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  prescription: { label: 'Prescription', icon: Pill, color: 'bg-primary-100 text-primary-600', badgeVariant: 'info' },
  lab_report: { label: 'Lab Report', icon: FlaskConical, color: 'bg-success-100 text-success-600', badgeVariant: 'success' },
  discharge_summary: { label: 'Discharge', icon: FileText, color: 'bg-warning-100 text-warning-600', badgeVariant: 'warning' },
  imaging: { label: 'Imaging', icon: FileImage, color: 'bg-indigo-100 text-indigo-600', badgeVariant: 'info' },
  insurance: { label: 'Insurance', icon: Shield, color: 'bg-teal-100 text-teal-600', badgeVariant: 'neutral' },
  other: { label: 'Other', icon: File, color: 'bg-surface-100 text-surface-600', badgeVariant: 'neutral' },
};

const DOC_TYPE_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'prescription', label: 'Prescriptions' },
  { key: 'lab_report', label: 'Lab Reports' },
  { key: 'discharge_summary', label: 'Discharge' },
  { key: 'imaging', label: 'Imaging' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'other', label: 'Other' },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function DocumentsVault() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const addToast = useToastStore(s => s.addToast);

  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DocRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState<DocumentType>('other');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDocuments((data || []) as DocRecord[]);
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [user?.id, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleNavigate = (path: string) => navigate(path);
  const handleLogout = () => { logout(); navigate('/'); };

  const filteredDocs = documents.filter(d => {
    if (activeFilter !== 'all' && d.document_type !== activeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = (d.file_name || '').toLowerCase().includes(q) ||
        (d.hospital_name || '').toLowerCase().includes(q) ||
        (d.doctor_name || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('documents').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDocuments(prev => prev.filter(d => d.id !== deleteTarget.id));
      addToast('success', 'Document deleted');
    } catch {
      addToast('error', 'Failed to delete document');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !user?.id) return;
    setUploading(true);
    try {
      const filePath = `documents/${user.id}/${Date.now()}-${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('patient-documents')
        .upload(filePath, uploadFile);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('documents').insert({
        patient_id: user.id,
        file_name: uploadFile.name,
        file_size_bytes: uploadFile.size,
        mime_type: uploadFile.type,
        document_type: uploadType,
        document_date: new Date().toISOString(),
        processing_status: 'completed',
      });
      if (insertError) throw insertError;

      addToast('success', 'Document uploaded successfully');
      setShowUpload(false);
      setUploadFile(null);
      setUploadType('other');
      fetchData();
    } catch {
      addToast('error', 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: DocRecord) => {
    try {
      const { data: files, error: listError } = await supabase.storage
        .from('patient-documents')
        .list('documents', { search: doc.file_name || '' });
      if (listError) throw listError;
      const file = files?.[0];
      if (!file) throw new Error('File not found');
      const { data: urlData, error: urlError } = await supabase.storage
        .from('patient-documents')
        .createSignedUrl(`documents/${user?.id}/${file.name}`, 60);
      if (urlError || !urlData) throw urlError || new Error('Could not create download link');
      const a = document.createElement('a');
      a.href = urlData.signedUrl;
      a.download = doc.file_name || file.name;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      addToast('error', 'Could not download document');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFile(e.dataTransfer.files[0]);
    }
  };

  const renderGridCard = (doc: DocRecord) => {
    const typeConf = DOC_TYPE_CONFIG[doc.document_type || 'other'];
    const TypeIcon = typeConf.icon;
    return (
      <motion.div key={doc.id} {...fadeUp} className="card p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeConf.color}`}>
            <TypeIcon size={22} />
          </div>
          <Badge variant={typeConf.badgeVariant} size="sm">{typeConf.label}</Badge>
        </div>
        <h4 className="text-sm font-semibold text-surface-900 truncate mb-1">{doc.file_name || 'Untitled'}</h4>
        <p className="text-xs text-surface-400">
          {doc.created_at && new Date(doc.created_at).toLocaleDateString('en-IN')}
        </p>
        {doc.hospital_name && (
          <p className="text-xs text-surface-500 mt-0.5 truncate">{doc.hospital_name}</p>
        )}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-100">
          <button
            onClick={() => handleDownload(doc)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 min-h-[44px] rounded-lg bg-surface-50 hover:bg-surface-100 text-xs font-medium text-surface-600 transition-colors"
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={() => setDeleteTarget(doc)}
            aria-label={`Delete ${doc.file_name || 'document'}`}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </motion.div>
    );
  };

  const renderListRow = (doc: DocRecord) => {
    const typeConf = DOC_TYPE_CONFIG[doc.document_type || 'other'];
    return (
      <tr key={doc.id} className="hover:bg-surface-50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${typeConf.color}`}>
              <typeConf.icon size={18} />
            </div>
            <span className="text-sm font-medium text-surface-900 truncate max-w-[200px]">{doc.file_name || 'Untitled'}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge variant={typeConf.badgeVariant} size="sm">{typeConf.label}</Badge>
        </td>
        <td className="px-4 py-3 text-sm text-surface-500">
          {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-IN') : '—'}
        </td>
        <td className="px-4 py-3 text-sm text-surface-500 truncate max-w-[150px]">
          {doc.hospital_name || '—'}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleDownload(doc)}
              aria-label={`Download ${doc.file_name || 'document'}`}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Download size={14} />
            </button>
            <button
              onClick={() => setDeleteTarget(doc)}
              aria-label={`Delete ${doc.file_name || 'document'}`}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar
        items={NAV_ITEMS}
        currentPath="/patient/documents"
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        user={{ name: 'Patient', role: 'Patient' }}
      />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header
          title="Documents Vault"
          subtitle="Manage your medical documents"
          actions={
            <Button variant="primary" size="sm" icon={<Upload size={16} />} onClick={() => setShowUpload(true)}>
              Upload
            </Button>
          }
          onMenuToggle={() => {}}
          user={{ name: 'Patient', role: 'Patient' }}
        />
        <main className="flex-1 p-4 sm:p-6">
          <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white border border-surface-200 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={`w-11 h-11 flex items-center justify-center rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-surface-400 hover:text-surface-600'}`}
              >
                <Grid3X3 size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={`w-11 h-11 flex items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-surface-400 hover:text-surface-600'}`}
              >
                <List size={18} />
              </button>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            {DOC_TYPE_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeFilter === f.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-surface-600 hover:bg-surface-100 border border-surface-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : filteredDocs.length === 0 ? (
            <EmptyState
              icon={<FileText size={24} />}
              title="No documents found"
              description={activeFilter !== 'all' ? 'No documents in this category.' : 'Upload your first document to get started.'}
              action={{ label: 'Upload Document', onClick: () => setShowUpload(true) }}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDocs.map(d => renderGridCard(d))}
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wide">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wide">Visit</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {filteredDocs.map(d => renderListRow(d))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      <Modal isOpen={showUpload} onClose={() => { setShowUpload(false); setUploadFile(null); }} title="Upload Document" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Document Type</label>
            <select
              value={uploadType}
              onChange={e => setUploadType(e.target.value as DocumentType)}
              className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {Object.entries(DOC_TYPE_CONFIG).map(([key, conf]) => (
                <option key={key} value={key}>{conf.label}</option>
              ))}
            </select>
          </div>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
              dragActive ? 'border-primary-400 bg-primary-50' : uploadFile ? 'border-success-300 bg-success-50' : 'border-surface-300 hover:bg-surface-50'
            }`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input id="file-input" type="file" className="hidden" onChange={e => {
              if (e.target.files?.[0]) setUploadFile(e.target.files[0]);
            }} />
            {uploadFile ? (
              <div className="text-center">
                <FileText size={20} className="mx-auto text-success-600 mb-1" />
                <p className="text-sm font-medium text-surface-900">{uploadFile.name}</p>
                <p className="text-xs text-surface-400">{(uploadFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="text-center">
                <Upload size={24} className="mx-auto text-surface-400 mb-1" />
                <p className="text-sm text-surface-500">Drag & drop or click to upload</p>
                <p className="text-xs text-surface-400">PDF, JPG, PNG up to 10MB</p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="primary" onClick={handleUpload} loading={uploading} disabled={!uploadFile} className="flex-1">
              Upload
            </Button>
            <Button variant="ghost" onClick={() => { setShowUpload(false); setUploadFile(null); }}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Document" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-danger-50 rounded-xl">
            <AlertCircle size={20} className="text-danger-600 shrink-0" />
            <p className="text-sm text-danger-700">
              Are you sure you want to delete <strong>{deleteTarget?.file_name}</strong>? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleDelete} loading={deleting} className="flex-1">
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
