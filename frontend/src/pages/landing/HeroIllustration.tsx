import { motion } from 'framer-motion';

export default function HeroIllustration({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative w-full aspect-[16/9] flex items-center justify-center overflow-visible ${className}`}
      role="img"
      aria-label="Floating Kiosk Interface transmitting data to Doctor Tablet"
    >
      {/* Background ambient glows */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-400/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-300/20 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between px-12 gap-8">
        
        {/* Left: Patient Kiosk Screen (Floating) */}
        <motion.div 
          className="relative w-[380px] h-[520px] bg-white rounded-3xl shadow-2xl shadow-surface-900/10 border border-white/50 flex flex-col overflow-hidden"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ transformStyle: 'preserve-3d' }}
          whileHover={{ rotateY: 5, rotateX: 2, scale: 1.02 }}
        >
          {/* Glass glare */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />
          
          <div className="p-8 pb-4 flex flex-col h-full bg-gradient-to-b from-surface-50 to-white">
            <div className="w-12 h-1.5 bg-surface-200 rounded-full mx-auto mb-8" />
            
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <motion.div 
                className="w-24 h-24 rounded-full bg-primary-50 flex items-center justify-center mb-6 relative"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="absolute inset-0 rounded-full border-2 border-primary-400/30 animate-ping" />
                <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </motion.div>
              
              <h3 className="text-2xl font-semibold text-surface-900 mb-2">I have chest pain...</h3>
              <p className="text-surface-500 font-medium">Recording in English</p>
              
              {/* Audio visualizer */}
              <div className="flex items-center gap-1.5 mt-8 h-12">
                {[4, 8, 12, 16, 12, 20, 14, 8, 16, 10, 6, 12, 8, 4].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 bg-primary-500 rounded-full"
                    animate={{ height: [`${h}px`, `${h * 2}px`, `${h}px`] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
                  />
                ))}
              </div>
            </div>
            
            <div className="mt-auto pt-6 border-t border-surface-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-primary-600" />
                </div>
                <div className="w-24 h-2.5 bg-surface-200 rounded-full" />
              </div>
              <div className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center">
                <div className="w-4 h-4 bg-surface-300 rounded" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Center: Data Stream */}
        <div className="flex-1 flex items-center justify-center relative">
          <svg className="absolute w-full h-24 overflow-visible" viewBox="0 0 100 24">
            <motion.path
              d="M 0 12 C 30 12, 70 12, 100 12"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="0.5"
              strokeDasharray="4 4"
              className="opacity-40"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
            {/* Moving particles */}
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={i}
                r="1.5"
                fill="#10b981"
                className="drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                initial={{ offsetDistance: '0%' }}
                animate={{ offsetDistance: '100%' }}
                style={{ offsetPath: 'path("M 0 12 C 30 12, 70 12, 100 12")' }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: i * 0.6 }}
              />
            ))}
          </svg>
          
          <motion.div 
            className="absolute px-4 py-2 bg-white/80 backdrop-blur-md border border-surface-200 rounded-full shadow-lg text-xs font-semibold text-primary-600 flex items-center gap-2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            AI Processing
          </motion.div>
        </div>

        {/* Right: Doctor Tablet (Floating) */}
        <motion.div 
          className="relative w-[420px] h-[340px] bg-surface-900 rounded-[2rem] shadow-2xl shadow-surface-900/20 border-4 border-surface-900 p-2 overflow-hidden flex flex-col"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          whileHover={{ rotateY: -5, rotateX: 2, scale: 1.02 }}
        >
          {/* Inner Screen */}
          <div className="flex-1 bg-white rounded-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
                  MK
                </div>
                <div>
                  <h4 className="text-sm font-bold text-surface-900 leading-tight">Patient Summary</h4>
                  <p className="text-xs text-surface-500">Generated instantly</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-danger-50 text-danger-600 rounded-full text-xs font-bold uppercase tracking-wide">
                Urgent
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 flex-1 bg-white">
              <div className="mb-6">
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1">Chief Complaint</p>
                <h2 className="text-xl font-bold text-surface-900">Chest pain (retrosternal)</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 rounded-xl bg-surface-50 border border-surface-100">
                  <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-sm font-bold text-surface-800">2 hours · Sudden</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-50 border border-surface-100">
                  <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1">Severity</p>
                  <p className="text-sm font-bold text-surface-800">8/10 Radiating</p>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-primary-50 border border-primary-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-primary-600" />
                  <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">Vitals Captured</p>
                </div>
                <p className="text-sm font-bold text-primary-900">BP 150/94 · HR 96 · SpO₂ 98%</p>
              </div>
            </div>
          </div>
          
          {/* Glass glare on tablet */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-[1.8rem]" />
        </motion.div>

      </div>
    </div>
  );
}