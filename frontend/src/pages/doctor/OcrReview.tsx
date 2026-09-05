import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ScanText } from 'lucide-react';
import PrescriptionOcrProcessor from '../../components/advanced/PrescriptionOcrProcessor';
import { useAdvancedStore } from '../../stores/advancedFeaturesStore';

export default function DoctorOcrReview() {
  const navigate = useNavigate();
  const ocrResults = useAdvancedStore((s) => s.ocrResults);

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900">
      <header className="bg-white border-b border-surface-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/doctor/dashboard')} className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center hover:bg-surface-200" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Prescription OCR</h1>
          <p className="text-sm text-surface-500">Digitize handwritten prescriptions with ML + AI review</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <ScanText className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold">Handwritten Prescription Extraction</h2>
          </div>
          <p className="text-sm text-surface-400 mb-6">
            Feature 2 — upload a photo of a handwritten prescription. The system runs Tesseract/EasyOCR,
            extracts drugs via entity recognition, and validates the result with Gemini so you only review
            what needs attention.
          </p>
          <PrescriptionOcrProcessor />
        </div>

        {ocrResults.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Recent Extractions</h2>
            <div className="space-y-2.5">
              {ocrResults.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-surface-50 border border-surface-100 rounded-xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-surface-800 truncate">{r.extracted_drugs.map((d) => d.name).join(', ') || '—'}</p>
                    <p className="text-xs text-surface-400">{new Date(r.created_at).toLocaleString()} · {r.extracted_diagnoses.slice(0, 2).join(', ') || 'no diagnosis'}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ml-3 ${
                    r.validation_status === 'verified'
                      ? 'bg-success-50 text-success-700 border border-success-200'
                      : r.validation_status === 'needs_review'
                      ? 'bg-warning-50 text-warning-700 border border-warning-200'
                      : 'bg-surface-100 text-surface-500 border border-surface-200'
                  }`}>
                    {r.validation_status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}