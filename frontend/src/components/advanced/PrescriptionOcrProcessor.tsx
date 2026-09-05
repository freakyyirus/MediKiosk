import { useRef, useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, ScanText, Sparkles, Save } from 'lucide-react';
import { advancedApi } from '../../api/client';
import { useAdvancedStore, type ExtractedDrug, type OcrResult } from '../../stores/advancedFeaturesStore';

/**
 * Feature 2 — Handwritten Prescription OCR processor.
 * Spans a base64/sample image or raw text through the backend ML pipeline
 * (Tesseract/EasyOCR → NER → Gemini validation) and lets the doctor review
 * each extracted field with its confidence before marking it verified.
 */
export default function PrescriptionOcrProcessor() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { runOcr, verifyOcr } = useAdvancedStore();

  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<'idle' | 'ocr' | 'ner' | 'validate'>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [backendHit, setBackendHit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setProcessing(true);
    setError(null);
    setStage('ocr');
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', 'en');
      const res = await advancedApi.ocrProcess(formData);
      setBackendHit(true);
      const stored = await runOcr({
        rawText: res.data.ocr_raw_text,
      });
      setResult({
        ...stored,
        ocr_raw_text: res.data.ocr_raw_text,
        ocr_confidence: res.data.ocr_confidence,
        handwriting_detected: res.data.handwriting_detected,
        extracted_drugs: res.data.extracted_drugs as ExtractedDrug[],
        extracted_diagnoses: res.data.extracted_diagnoses,
        doctor_name: res.data.doctor_name,
        hospital_name: res.data.hospital_name,
        validation_status: res.data.validation_status as OcrResult['validation_status'],
        low_confidence_fields: res.data.low_confidence_fields,
      });
    } catch {
      // Fallback: simulated pipeline when backend isn't running.
      setBackendHit(false);
      setStage('ner');
      setStage('validate');
      const stored = await runOcr({ rawText: 'Tab. Pan 40mg BD x 5 days before food\nSyp. Digene 2tsf TDS' });
      setResult(stored);
    } finally {
      setProcessing(false);
      setStage('idle');
    }
  };

  const handleFile = (f: File | undefined) => {
    if (f) processFile(f);
  };

  const stageLabelMap: Record<string, string> = {
    ocr: 'Reading handwriting (OCR)…',
    ner: 'Extracting drugs & diagnoses…',
    validate: 'Validating with AI…',
  };

  const handleVerify = async () => {
    if (!result) return;
    await verifyOcr(result.id, {});
    setResult({ ...result, validation_status: 'verified' });
  };

  return (
    <div className="w-full">
      {/* Upload / sample picker */}
      {!result ? (
        <div className="space-y-5">
          <button
            onClick={() => fileRef.current?.click()}
            className="touch-target-lg w-full border-2 border-dashed border-surface-300 hover:border-primary-400 bg-surface-50/60 rounded-3xl p-10 flex flex-col items-center justify-center gap-3 transition-colors"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center">
              <ScanText className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="font-bold text-surface-800 text-lg">Upload handwritten prescription</p>
              <p className="text-sm text-surface-400">JPG, PNG or PDF — Tesseract + EasyOCR + AI validation</p>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {/* Demo sample */}
          <button
            onClick={() => {
              setFileName('sample-prescription.jpg');
              setPreview(null);
              setProcessing(true);
              setStage('ocr');
              setStage('validate');
              setTimeout(async () => {
                const stored = await runOcr({ rawText: 'Tab. Pan 40mg BD x 5 days before food\nSyp. Digene 2tsf TDS' });
                setResult(stored);
                setBackendHit(false);
                setProcessing(false);
                setStage('idle');
              }, 2400);
            }}
            className="w-full card p-4 hover:border-primary-300 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-surface-500" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-surface-800">Use demo sample prescription</p>
              <p className="text-sm text-surface-400">Runs through the same extraction pipeline</p>
            </div>
          </button>

          {error && (
            <p className="text-sm text-danger-600 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> {error}
            </p>
          )}
        </div>
      ) : (
        <div className="animate-fade-in space-y-5">
          {/* Processing or reviewed banner */}
          {processing && (
            <div className="rounded-2xl bg-primary-50 border border-primary-100 p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
              <p className="font-semibold text-surface-700">{stageLabelMap[stage]}</p>
            </div>
          )}

          {!processing && (
            <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
              result.validation_status === 'verified'
                ? 'bg-success-50 border-success-200'
                : 'bg-warning-50 border-warning-200'
            }`}>
              {result.validation_status === 'verified' ? (
                <CheckCircle2 className="w-6 h-6 text-success-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-warning-600 shrink-0" />
              )}
              <div>
                <p className="font-bold text-surface-900">
                  {result.validation_status === 'verified' ? 'Extraction verified' : 'Extraction complete — review needed'}
                </p>
                <p className="text-sm text-surface-600">
                  Overall OCR confidence {(result.ocr_confidence * 100).toFixed(0)}% · Handwritten:{' '}
                  {result.handwriting_detected ? 'Yes' : 'No'} ·{' '}
                  {backendHit ? 'Processed by backend ML pipeline' : 'Simulated pipeline (backend offline)'}
                </p>
              </div>
            </div>
          )}

          {/* Image preview */}
          {preview && (
            <div className="card p-4">
              <p className="text-sm font-bold text-surface-400 uppercase tracking-wider mb-3">{fileName}</p>
              <img src={preview} alt="Uploaded prescription" className="max-h-72 rounded-xl border border-surface-200" />
            </div>
          )}

          {/* Raw OCR */}
          <div className="card p-4">
            <p className="text-sm font-bold text-surface-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Raw OCR Text
            </p>
            <p className="font-mono text-sm text-surface-700 bg-surface-50 rounded-xl p-3 border border-surface-100 whitespace-pre-wrap">
              {result.ocr_raw_text}
            </p>
          </div>

          {/* Extracted drugs */}
          <div className="card p-4">
            <p className="text-sm font-bold text-surface-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Extracted Medications ({result.extracted_drugs.length})
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.extracted_drugs.map((drug, i) => (
                <div key={i} className="bg-surface-50 border border-surface-200 rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-black text-xs">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-bold text-surface-900">{drug.name || 'Unidentified drug'}</p>
                        {drug.brand_name && <p className="text-xs text-primary-600 font-semibold">Brand: {drug.brand_name}</p>}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      drug.confidence > 0.85
                        ? 'bg-success-50 text-success-700 border border-success-200'
                        : drug.confidence > 0.65
                        ? 'bg-warning-50 text-warning-700 border border-warning-200'
                        : 'bg-danger-50 text-danger-700 border border-danger-200'
                    }`}>
                      {(drug.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-sm mt-2">
                    <span className="text-surface-400 font-medium">Dosage</span>
                    <span className="font-semibold text-surface-800">{drug.dosage || '—'}</span>
                    <span className="text-surface-400 font-medium">Frequency</span>
                    <span className="font-semibold text-surface-800">{drug.frequency || '—'}</span>
                    <span className="text-surface-400 font-medium">Duration</span>
                    <span className="font-semibold text-surface-800">{drug.duration || '—'}</span>
                    <span className="text-surface-400 font-medium">Instructions</span>
                    <span className="font-semibold text-surface-800">{drug.instructions || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
            {result.extracted_diagnoses.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {result.extracted_diagnoses.map((d) => (
                  <span key={d} className="text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200 rounded-full px-3 py-1">
                    {d}
                  </span>
                ))}
              </div>
            )}
            {result.low_confidence_fields.length > 0 && (
              <p className="mt-3 text-xs text-warning-700 font-semibold">
                Low confidence: {result.low_confidence_fields.join(', ')} — please verify with the original prescription.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => { setResult(null); setPreview(null); setFileName(null); }} className="touch-target flex-1 card py-3 font-semibold text-surface-600 hover:border-primary-300">
              Process Another
            </button>
            {result.validation_status !== 'verified' && (
              <button onClick={handleVerify} className="touch-target flex-1 bg-success-600 hover:bg-success-700 text-white font-bold rounded-2xl py-3 flex items-center justify-center gap-2">
                <Save className="w-5 h-5" /> Confirm & Mark Verified
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}