import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const sizeClasses = {
  sm:   'max-w-md',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  '2xl':'max-w-6xl',
};

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 animate-fade-in"
        style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Dialog — Neo-Brutalist hard shadow */}
      <div
        className={`
          relative bg-white w-full ${sizeClasses[size]}
          max-h-[92vh] flex flex-col
          border-2 border-ink rounded-2xl
          animate-pop-in
        `}
        style={{ boxShadow: '8px 8px 0px 0px #0F172A' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0 rounded-t-2xl"
          style={{
            background: '#F8FAFC',
            borderBottom: '2px solid #E2E8F0',
          }}
        >
          <h2 className="text-base font-extrabold text-ink tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-sage hover:text-ink transition-all duration-150 rounded-lg"
            style={{ border: '2px solid #E2E8F0' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#0F172A';
              (e.currentTarget as HTMLElement).style.background  = '#F1F5F9';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
              (e.currentTarget as HTMLElement).style.background  = 'transparent';
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
