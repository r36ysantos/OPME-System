interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'teal' | 'orange';
  pulse?: boolean;
}

const variants: Record<string, string> = {
  default: 'bg-[#F1F5F9] text-[#475569] border-[1.5px] border-[#CBD5E1]',
  success: 'bg-[#DCFCE7] text-[#15803D] border-[1.5px] border-[#86EFAC]',
  warning: 'bg-[#FEF9C3] text-[#A16207] border-[1.5px] border-[#FDE047]',
  danger:  'bg-[#FEE2E2] text-[#B91C1C] border-[1.5px] border-[#FCA5A5]',
  info:    'bg-[#DBEAFE] text-[#1D4ED8] border-[1.5px] border-[#93C5FD]',
  purple:  'bg-[#F3E8FF] text-[#7E22CE] border-[1.5px] border-[#C4B5FD]',
  teal:    'bg-[#CCFBF1] text-[#0F766E] border-[1.5px] border-[#5EEAD4]',
  orange:  'bg-[#FFEDD5] text-[#C2410C] border-[1.5px] border-[#FDBA74]',
};

export default function Badge({ children, variant = 'default', pulse = false }: BadgeProps) {
  return (
    <span className={`badge ${variants[variant]} ${pulse ? 'animate-hard-pulse' : ''}`}>
      {children}
    </span>
  );
}
