import { useState } from 'react';
import { X } from 'lucide-react';

interface StickyMobileCtaProps {
  label: string;
  onClick: () => void;
  dismissible?: boolean;
}

export default function StickyMobileCta({
  label,
  onClick,
  dismissible = false,
}: StickyMobileCtaProps) {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden pb-[env(safe-area-inset-bottom)] bg-white/95 backdrop-blur-sm border-t border-surface-200 px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClick}
          className="touch-target flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-lg font-bold rounded-2xl transition-colors"
        >
          {label}
        </button>
        {dismissible && (
          <button
            type="button"
            onClick={() => setHidden(true)}
            aria-label="Dismiss"
            className="touch-target w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-surface-500 hover:text-surface-700 hover:bg-surface-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
