export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns?: Array<{ key: keyof T | string; header: string; format?: (val: unknown, row: T) => string }>,
): void {
  if (rows.length === 0) return;

  const cols: Array<{ key: string; header: string; format?: (val: unknown, row: T) => string }> =
    columns && columns.length > 0
      ? (columns as any)
      : Object.keys(rows[0]).map((k) => ({ key: k, header: k }));

  const headerRow = cols.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(',');

  const dataRows = rows.map((row) =>
    cols
      .map((col) => {
        const val = (row as Record<string, unknown>)[col.key];
        const formatted = col.format ? col.format(val, row) : val === null || val === undefined ? '' : String(val);
        return `"${formatted.replace(/"/g, '""')}"`;
      })
      .join(','),
  );

  // UTF-8 BOM (\uFEFF) ensures Bangla script and special characters open properly in MS Excel and Google Sheets
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
