'use client';

import type { ReactNode } from 'react';
import { SkeletonTable } from './Loading';

export interface Column<T> {
  /** React key + fallback header text. */
  key: string;
  header?: ReactNode;
  cell: (row: T) => ReactNode;
  /** Extra classes for this column's cells, e.g. 'text-xs muted'. */
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  /** Shown in place of rows when the result set is empty. */
  empty?: ReactNode;
  rowKey: (row: T, index: number) => string;
  /** Gold row highlight on hover — off for read-only logs. */
  hover?: boolean;
  skeletonRows?: number;
}

/**
 * The list surface shared by Leads, Investors and Audit: bordered panel,
 * horizontal scroll, skeleton while loading, and a centred empty row.
 */
export function DataTable<T>({
  columns, rows, loading, empty = 'Nothing to show.', rowKey, hover = true, skeletonRows = 6,
}: DataTableProps<T>) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto crm-scroll">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key} className="th">{c.header ?? c.key}</th>)}
            </tr>
          </thead>
          {loading && <SkeletonTable rows={skeletonRows} cols={columns.length} />}
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td className="td muted text-center py-10" colSpan={columns.length}>{empty}</td>
              </tr>
            )}
            {!loading && rows.map((row, i) => (
              <tr key={rowKey(row, i)} className={hover ? 'row-hover' : ''}>
                {columns.map((c) => (
                  <td key={c.key} className={`td ${c.className ?? ''}`}>{c.cell(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
