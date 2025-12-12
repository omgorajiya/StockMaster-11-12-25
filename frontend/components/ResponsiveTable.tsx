'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

interface ResponsiveTableProps {
  headers: string[];
  rows: ReactNode[][];
  mobileCard?: (row: ReactNode[], index: number) => ReactNode;
  emptyMessage?: string;
  className?: string;
}

export default function ResponsiveTable({
  headers,
  rows,
  mobileCard,
  emptyMessage = 'No data found',
  className = '',
}: ResponsiveTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">{emptyMessage}</div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className={`block sm:hidden space-y-3 ${className}`}>
        {rows.map((row, index) => (
          <div key={index}>
            {mobileCard ? (
              mobileCard(row, index)
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                {row.map((cell, cellIndex) => (
                  <div key={cellIndex} className="mb-2 last:mb-0">
                    <span className="text-xs text-gray-500 font-medium">
                      {headers[cellIndex]}:{' '}
                    </span>
                    <span className="text-sm text-gray-900">{cell}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className={`hidden sm:block overflow-x-auto ${className}`}>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="text-left p-3 text-sm font-medium text-gray-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="border-b hover:bg-gray-50 transition-colors"
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="p-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

