import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: {
    page: number;
    pages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────
function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <div
                className="skeleton h-4 rounded"
                style={{ width: `${50 + Math.random() * 40}%`, animationDelay: `${i * 70}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Table<T extends { id: string }>({
  columns, data, isLoading,
  emptyMessage = 'Nenhum registro encontrado',
  pagination,
}: TableProps<T>) {
  return (
    <div className="animate-fade-in">
      {/* Table wrapper */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '2px solid #E2E8F0' }}>
        <table className="min-w-full">
          {/* Head */}
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #0F172A' }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left whitespace-nowrap ${col.className || ''}`}
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#475569',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody style={{ background: '#FFFFFF' }}>
            {isLoading ? (
              <SkeletonRows cols={columns.length} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center justify-center py-16 text-sage">
                    <div
                      className="w-14 h-14 flex items-center justify-center mb-3 rounded-xl"
                      style={{
                        border: '2px solid #E2E8F0',
                        boxShadow: '4px 4px 0px 0px #E2E8F0',
                      }}
                    >
                      <Inbox className="h-6 w-6 text-[#CBD5E1]" />
                    </div>
                    <p className="text-sm font-bold text-ink">{emptyMessage}</p>
                    <p className="text-xs text-sage mt-1">Nenhum dado disponível para exibição</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr
                  key={item.id}
                  className="group transition-all duration-100"
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    animationDelay: `${idx * 25}ms`,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = '#EFF6FF';
                    (e.currentTarget as HTMLElement).style.transform  = 'translateX(2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = '';
                    (e.currentTarget as HTMLElement).style.transform  = '';
                  }}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-ink ${col.className || ''}`}
                    >
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-1 pt-4">
          <p className="text-xs text-sage font-medium">
            <span className="font-extrabold text-ink">
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>
            {' '}de{' '}
            <span className="font-extrabold text-ink">{pagination.total}</span> registros
          </p>

          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg text-sage transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ border: '2px solid #E2E8F0' }}
              onMouseEnter={e => { if (!((e.currentTarget as HTMLButtonElement).disabled)) (e.currentTarget as HTMLElement).style.borderColor = '#0F172A'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
              const p = i + 1;
              const isActive = p === pagination.page;
              return (
                <button
                  key={p}
                  onClick={() => pagination.onPageChange(p)}
                  className="w-9 h-9 text-sm font-bold rounded-lg transition-all duration-150"
                  style={isActive ? {
                    background: '#0F172A',
                    color: '#FFFFFF',
                    border: '2px solid #0F172A',
                    boxShadow: '2px 2px 0px 0px #2563EB',
                  } : {
                    background: 'transparent',
                    color: '#64748B',
                    border: '2px solid #E2E8F0',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = '#0F172A'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; }}
                >
                  {p}
                </button>
              );
            })}

            {/* Next */}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-2 rounded-lg text-sage transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ border: '2px solid #E2E8F0' }}
              onMouseEnter={e => { if (!((e.currentTarget as HTMLButtonElement).disabled)) (e.currentTarget as HTMLElement).style.borderColor = '#0F172A'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
