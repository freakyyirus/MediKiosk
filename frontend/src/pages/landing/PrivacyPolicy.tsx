import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Database, Eye, FileText, Cpu, Trash2, LifeBuoy, ChevronLeft } from 'lucide-react';
import { applyPageMeta } from '../../hooks/usePageMeta';

const SECTIONS: { icon: typeof Shield; title: string; body: string }[] = [
  {
    icon: Database,
    title: 'What data MediKiosk collects',
    body:
      'MediKiosk collects the information you provide during self-service check-in and clinical interviews, including your name, contact details, date of birth, language preference, symptoms, clinical history, vital signs, and any documents you choose to upload (such as prescriptions or lab reports). When you register an account, we also store your login details and role through our authentication provider.',
  },
  {
    icon: Eye,
    title: 'Why this data is collected',
    body:
      'This information helps hospital staff prepare for your consultation. It supports the clinical history collection, triage, and summarization features used in hospital workflows. We do not sell patient data and do not use it for advertising.',
  },
  {
    icon: FileText,
    title: 'How medical documents are processed',
    body:
      'Uploaded documents are processed to extract text (OCR) and organize the information for clinical review. Documents are stored in private, access-controlled storage and are only shared with authorized hospital staff involved in your care. Documents are never exposed through public URLs.',
  },
  {
    icon: Cpu,
    title: 'How AI is used',
    body:
      'MediKiosk uses artificial intelligence to assist with clinical history processing, document understanding, translation, and summarization. AI-generated information is intended to support healthcare professionals and must be reviewed by qualified clinical staff. MediKiosk does not diagnose patients or replace clinicians.',
  },
  {
    icon: Lock,
    title: 'Storage and security',
    body:
      'MediKiosk stores data in infrastructure managed by our hosting providers (Supabase for the database and file storage) using encryption in transit and at rest. Access to clinical data is limited to you, authorized hospital staff, and the clinical workflow. Role-based access controls are enforced on the platform.',
  },
  {
    icon: Shield,
    title: 'Authentication',
    body:
      'Access to the patient, doctor, and hospital portals is protected by authentication managed through Clerk and Supabase. Only signed-in users with the appropriate role can view their own data or role-relevant dashboards.',
  },
  {
    icon: Trash2,
    title: 'Data retention and deletion',
    body:
      'MediKiosk retains data only as long as needed for clinical and legal purposes. Hospital administrators can run retention cleanups, and patients can request erasure of their records in accordance with applicable data protection law (including, in India, the Digital Personal Data Protection Act 2023). Erasure requests are reviewed before processing.',
  },
  {
    icon: LifeBuoy,
    title: 'Third-party services',
    body:
      'MediKiosk relies on trusted third-party providers, including our hosting, authentication, AI (Google Gemini), translation and speech services (Bhashini/ULCA), and, where enabled, ABDM for ABHA-linked records. These providers may process data necessary to deliver the service. Where third parties process clinical data, they are subject to our agreements and applicable law.',
  },
  {
    icon: Eye,
    title: 'Your rights',
    body:
      'You may access, correct, export, or request deletion of your personal information. To exercise these rights, contact the facility you are visiting or support@medikiosk.ai. We will respond within the timeframes required by law.',
  },
];

export default function PrivacyPolicy() {
  useEffect(() => {
    applyPageMeta({
      title: 'MediKiosk | Privacy Policy',
      description:
        'Learn how MediKiosk collects, uses, secures, and retains clinical data across its patient intake, document digitization, and physician review workflows.',
    });
  }, []);

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900">
      <header className="border-b border-surface-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="font-bold text-xl" style={{ fontFamily: 'Inter' }}>MediKiosk</div>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary-700 hover:text-primary-800 font-medium">
            <ChevronLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-800 text-sm font-medium border border-primary-200">
          <Shield className="w-4 h-4" /> Privacy Policy
        </span>
        <h1 className="mt-4 text-3xl lg:text-4xl font-bold tracking-tight">MediKiosk Privacy Policy</h1>
        <p className="mt-3 text-surface-600 leading-relaxed">
          Last updated: September 2026. This policy explains how MediKiosk handles the clinical and personal information
          collected through its patient kiosks, portals, and document digitization workflows.
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title} className="bg-white border border-surface-200 rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5 text-primary-700" />
                </span>
                <h2 className="text-lg font-semibold">{s.title}</h2>
              </div>
              <p className="mt-4 text-surface-700 leading-relaxed text-[15px]">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 bg-white border border-surface-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Lock className="w-5 h-5 text-primary-700" /> Contact & support</h2>
          <p className="mt-3 text-surface-700 leading-relaxed text-[15px]">
            Questions about this policy, your data, or an erasure request can be sent to{' '}
            <a href="mailto:support@medikiosk.ai" className="text-primary-700 font-medium underline underline-offset-2">support@medikiosk.ai</a>{' '}
            or to the hospital facility you visit. If you are in India, you may also raise concerns under the Digital Personal Data Protection Act 2023.
          </p>
        </div>

        <p className="mt-8 text-sm text-surface-500">
          This page describes current practices in plain language. It is not a substitute for a legally reviewed agreement
          tailored to your organization; facilities should confirm compliance with their own legal counsel before going live.
        </p>
      </main>
    </div>
  );
}