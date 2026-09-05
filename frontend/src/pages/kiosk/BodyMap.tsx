import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Plus, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { useAudioStore, useUIStore } from '../../stores';
import { useAdvancedStore } from '../../stores/advancedFeaturesStore';
import { advancedApi } from '../../api/client';
import InteractiveBodyMap from '../../components/advanced/InteractiveBodyMap';
import { bodyPartById, detectRedFlagsForBodyPart, type BodyPartDefinition } from '../../components/advanced/bodyMapData';
import Stepper from '../../components/Stepper';
import EmergencyFab from '../../components/EmergencyFab';

interface SelectedPart {
  part: BodyPartDefinition;
  symptoms: string[];
}

export default function BodyMapPage() {
  const navigate = useNavigate();
  const { lowLiteracyMode, highContrast } = useUIStore();
  const { transcription, setTranscription } = useAudioStore();
  const recordBodyTap = useAdvancedStore((s) => s.recordBodyTap);

  const [selected, setSelected] = useState<SelectedPart | null>(null);
  const [redFlags, setRedFlags] = useState<{ symptom: string; severity: string; message_en: string; message_hi: string }[]>([]);
  const [doneParts, setDoneParts] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  const language = useUIStore((s) => s.language.code);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      u.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      speechSynthesis.speak(u);
    }
  }, [language]);

  useEffect(() => {
    speak(language === 'hi' ? 'अपने दर्द वाले हिस्से पर टच करें' : 'Touch where it hurts');
    return () => speechSynthesis.cancel();
  }, [speak, language]);

  const handleSelect = (partId: string) => {
    const part = bodyPartById(partId);
    if (!part) return;
    setSelected({ part, symptoms: [] });
    setRedFlags([]);
    setTranscription('', 0);
    speak(language === 'hi' ? part.label_hi : part.label_en);
  };

  const toggleSymptom = (value: string) => {
    if (!selected) return;
    const exists = selected.symptoms.includes(value);
    const symptoms = exists
      ? selected.symptoms.filter((v) => v !== value)
      : [...selected.symptoms, value];
    const updated = { ...selected, symptoms };
    setSelected(updated);
    const flags = detectRedFlagsForBodyPart(selected.part, symptoms);
    setRedFlags(flags.map((f) => ({ ...f })));
    setTranscription(symptoms.join(', ') || '', 0.95);
  };

  const confirmSelection = async () => {
    if (!selected) return;
    setConfirming(true);
    await recordBodyTap({
      body_part: selected.part.id,
      body_part_hindi: selected.part.label_hi,
      selected_symptoms: selected.symptoms,
      coordinates: { x: 200, y: 200 },
    });
    try {
      await advancedApi.bodyMapTap({
        body_part: selected.part.id,
        selected_symptoms: selected.symptoms,
      });
    } catch {
      /* backend offline — analytics-only call, non-fatal */
    }
    setDoneParts((p) => [...p, selected.part.id]);
    setConfirming(false);
    setSelected(null);
    setRedFlags([]);
    setTranscription('', 0);
  };

  const goNext = () => navigate('/kiosk/interview');
  const goBack = () => navigate('/kiosk/consent');

  const criticalFlag = redFlags.find((f) => f.severity === 'critical' || f.severity === 'high');

  return (
    <div className={`min-h-screen mesh-bg flex flex-col ${lowLiteracyMode ? 'low-literacy' : ''} ${highContrast ? 'high-contrast' : ''}`}>
      <div className="px-10 pt-8">
        <Stepper steps={[{ label: 'Language' }, { label: 'Health Check' }, { label: 'Documents' }, { label: 'Done' }]} current={1} />
      </div>

      <div className="flex-1 flex flex-col items-center max-w-4xl mx-auto w-full px-6 py-6">
        {!selected ? (
          <>
            <div className="text-center mb-4 animate-fade-in">
              <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary-600 bg-primary-100 px-3 py-1 rounded-full">
                <Sparkles className="w-4 h-4" /> Touch the map
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-surface-900 mt-3">
                {language === 'hi' ? 'अपने दर्द वाले हिस्से पर टच करें' : 'Touch where it hurts'}
              </h2>
              <p className="text-lg text-surface-500 mt-2 max-w-xl mx-auto">
                {language === 'hi'
                  ? 'नीचे चित्र में जहाँ दर्द है वहाँ टच करें — कोई बात नहीं अगर आप पढ़ नहीं सकते।'
                  : 'Tap the body part on the picture — no reading needed.'}
              </p>
              {doneParts.length > 0 && (
                <div className="mt-4 inline-flex flex-wrap justify-center gap-2">
                  {doneParts.map((p) => {
                    const def = bodyPartById(p);
                    return (
                      <span key={p} className="inline-flex items-center gap-1.5 bg-success-50 text-success-700 border border-success-200 rounded-full px-3 py-1 text-sm font-semibold">
                        <Check className="w-4 h-4" /> {language === 'hi' ? def?.label_hi : def?.label_en}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="w-full card p-6 animate-slide-up">
              <InteractiveBodyMap
                language={language === 'hi' ? 'hi' : 'en'}
                onSelect={handleSelect}
                selectedIds={doneParts}
                highContrast={highContrast}
                lowLiteracy={lowLiteracyMode}
              />
            </div>
          </>
        ) : (
          <div className="w-full max-w-2xl animate-fade-in">
            <button onClick={() => { setSelected(null); setRedFlags([]); speechSynthesis.cancel(); }} className="mb-4 inline-flex items-center gap-2 text-surface-500 hover:text-surface-800 font-medium">
              <ArrowLeft className="w-5 h-5" /> {language === 'hi' ? 'वापस (Body Map)' : 'Back (Body Map)'}
            </button>
            <div className="card p-8">
              <div className="text-center mb-6">
                <span className="text-4xl block mb-2">{selected.part.icon}</span>
                <h2 className="text-3xl font-bold text-surface-900">
                  {language === 'hi' ? selected.part.label_hi : selected.part.label_en}
                </h2>
                <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mt-2">
                  {language === 'hi' ? selected.part.department_hindi : selected.part.department}
                </p>
              </div>

              {selected.part.id === 'private' ? (
                <div className="text-center bg-warning-50 border border-warning-200 rounded-2xl p-6">
                  <AlertTriangle className="w-8 h-8 text-warning-600 mx-auto mb-3" />
                  <p className="text-xl font-semibold text-surface-800">
                    {language === 'hi' ? selected.part.questions[0].question_hi : selected.part.questions[0].question_en}
                  </p>
                  <div className="flex flex-col gap-3 mt-6 max-w-sm mx-auto">
                    {selected.part.questions[0].options.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setTranscription(language === 'hi' ? opt.label_hi : opt.label_en, 1); setSelected({ ...selected, symptoms: [opt.value] }); }}
                        className="touch-target card px-5 py-4 text-lg font-semibold text-surface-800 bg-white hover:border-primary-400"
                      >
                        {language === 'hi' ? opt.label_hi : opt.label_en}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {selected.part.questions.map((q) => (
                    <div key={q.id}>
                      <p className="text-2xl font-bold text-surface-900 mb-4">
                        {language === 'hi' ? q.question_hi : q.question_en}
                      </p>
                      <div className={`grid gap-3 ${q.type === 'multi_select' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {q.options.map((opt) => {
                          const active = selected.symptoms.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              onClick={() => toggleSymptom(opt.value)}
                              className={`touch-target-lg card px-4 py-4 text-lg font-semibold flex items-center justify-center gap-2 transition-all text-center ${
                                active ? 'border-success-400 bg-success-50 text-success-700 shadow-sm' : 'bg-white text-surface-700 hover:border-primary-400'
                              }`}
                            >
                              {active && <Check className="w-5 h-5" />}
                              {language === 'hi' ? opt.label_hi : opt.label_en}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {redFlags.length > 0 && (
                    <div className={`rounded-2xl p-4 border flex items-start gap-3 animate-fade-in ${
                      criticalFlag ? 'bg-danger-50 border-danger-200' : 'bg-warning-50 border-warning-200'
                    }`}>
                      <AlertTriangle className={`w-6 h-6 shrink-0 mt-0.5 ${criticalFlag ? 'text-danger-600' : 'text-warning-600'}`} />
                      <div>
                        <p className={`font-bold ${criticalFlag ? 'text-danger-700' : 'text-warning-700'}`}>Red Flag</p>
                        <p className="text-surface-700">{language === 'hi' ? criticalFlag?.message_hi || redFlags[0].message_hi : criticalFlag?.message_en || redFlags[0].message_en}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={confirmSelection}
                    disabled={selected.symptoms.length === 0 || confirming}
                    className="touch-target-lg w-full bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 disabled:text-surface-500 text-white text-xl font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-primary-600/25 transition-colors"
                  >
                    {confirming ? 'Saving...' : language === 'hi' ? 'सही है — आगे बढ़ें' : 'Looks good — continue'}
                    {!confirming && <ArrowRight className="w-6 h-6" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!selected && (
          <div className="w-full flex gap-3 max-w-xl mt-6">
            <button onClick={goBack} className="touch-target card px-4 flex items-center justify-center text-surface-500 hover:border-surface-300" aria-label="Back">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button onClick={goNext} className="touch-target flex-1 bg-primary-600 hover:bg-primary-700 text-white text-lg font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-600/25">
              Continue to Interview <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <EmergencyFab />
    </div>
  );
}