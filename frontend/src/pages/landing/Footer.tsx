import { Globe, AtSign, Share2, Mail, Sparkles } from 'lucide-react';
import Logo from '../../components/brand/Logo';

const COLS = [
  { title: 'Product', links: ['Features', 'How It Works', 'AYUSH Mode', 'Security', 'Pricing'] },
  { title: 'Resources', links: ['Documentation', 'API Reference', 'FHIR Mapping', 'Case Studies', 'Blog'] },
  { title: 'Company', links: ['About', 'Team', 'Careers', 'Contact', 'Privacy Policy'] },
];

export default function Footer() {
  return (
    <footer className="bg-[#1A1A2E] text-white pt-20 pb-10">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 pb-14">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 font-bold text-xl" style={{ fontFamily: 'Inter' }}>
              <Logo size={34} variant="white" />
            </div>
            <p className="mt-4 text-white/60 max-w-[260px]">Built with compassion for every Indian patient.</p>
            <div className="flex gap-3 mt-6">
              {[Globe, AtSign, Share2, Mail].map((Icon, i) => (
                <a key={i} href="#top" className="w-10 h-10 rounded-full bg-white/5 hover:bg-primary-600 flex items-center justify-center transition-colors">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <div className="font-semibold mb-4 text-[15px]">{col.title}</div>
              <ul className="space-y-2.5">
                {col.links.map((lk) => (
                  <li key={lk}><a href="#top" className="text-white/55 hover:text-white transition-colors text-[14px]">{lk}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[14px] text-white/50">
          <div>© 2026 MediKiosk. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span>Made in India 🇮🇳</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">DPDP Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
