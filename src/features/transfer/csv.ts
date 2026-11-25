/** CSV 单元格转义：统一双引号包裹，内部引号翻倍 */
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

/** 生成带 BOM 的 CSV，Excel 打开中文不乱码 */
export function csvFromRows(rows: unknown[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
}
