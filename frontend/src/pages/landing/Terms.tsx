import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Scale, ChevronLeft } from 'lucide-react';
import { applyPageMeta } from '../../hooks/usePageMeta';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Service',
    body:
      'MediKiosk provides self-service patient intake, clinical history collection, document digitization, and physician-review tooling for hospitals and clinics. Use of the service is subject to these terms.',
  },
  {
    title: '2. No medical advice',
    body:
      'MediKiosk assists healthcare professionals with documentation and triage support. It does not provide a medical diagnosis, prescribe treatment, or act as a substitute for consultation with a qualified clinician. In an emergency, contact your local emergency services immediately.',
  },
  {
    title: '3. Accounts and responsibilities',
    body:
      'Hospital administrators are responsible for configuring roles, consents, and retention rules for their facility. Users are responsible for keeping their login credentials secure and for using the platform in accordance with applicable law.',
  },
  {
    title: '4. Acceptable use',
    body:
      'The platform must not be used to upload unlawful content, to misrepresent clinical findings, or to process data outside of the consents and permissions in place. AI-generated outputs must be reviewed by qualified clinical staff before clinical action.',
  },
  {
    title: '5. Data protection',
    body:
      'Clinical data is handled under our Privacy Policy and applicable law, including the Digital Personal Data Protection Act 2023 in India. Facilities are data controllers for the data they collect through their own deployment.',
  },
  {
    title: '6. Availability',
    body:
      'We aim to keep the service available, but we do not guarantee uninterrupted availability. Scheduled maintenance or outages may occur. Facilities should maintain emergency and manual fallback procedures.',
  },
];

export default function Terms() {
  useEffect(() => {
    applyPageMeta({ title: 'MediKiosk | Terms of Service' });
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
          <Scale className="w-4 h-4" /> Terms of Service
        </span>
        <h1 className="mt-4 text-3xl lg:text-4xl font-bold tracking-tight">MediKiosk Terms of Service</h1>
        <p className="mt-3 text-surface-600 leading-relaxed">
          Last updated: September 2026. These terms govern use of the MediKiosk platform and its associated portals.
        </p>

        <div className="mt-10 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title} className="bg-white border border-surface-200 rounded-2xl p-6">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="mt-3 text-surface-700 leading-relaxed text-[15px]">{s.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-8 text-sm text-surface-500">
          These terms are provided for reference. Facilities should review and adopt terms reviewed by their own legal counsel.
        </p>
      </main>
    </div>
  );
}