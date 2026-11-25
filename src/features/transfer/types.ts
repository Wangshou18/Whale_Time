import type { AppDataBundle } from '../../types'

/** 可独立打包的数据集 */
export type DatasetKey = 'tasks' | 'notes' | 'attendance' | 'summaries' | 'attachments'

/** 打包范围：整体或单个数据集 */
export type ExportScope = 'all' | DatasetKey

/** 导出文件格式（zip 仅用于整体备份） */
export type ExportFormat = 'json' | 'csv' | 'md' | 'txt' | 'zip'

export type ImportStrategy = 'merge' | 'overwrite'

/** 导出结果：页面只负责把 blob 交给浏览器下载 */
export interface ExportResult {
  blob: Blob
  filename: string
  /** 本包内含多少条记录 */
  records: number
  /** 人类可读的描述，用于提示与历史记录 */
  label: string
}

/** 参与统计的数据快照 */
export interface DataSnapshot extends AppDataBundle {
  attachmentCount: number
  attachmentBytes: number
}

export interface DatasetDescriptor {
  key: DatasetKey
  label: string
  hint: string
  icon: 'tasks' | 'notes' | 'attendance' | 'review' | 'paperclip'
  /** 该数据集支持的导出格式（按推荐顺序） */
  formats: ExportFormat[]
  count: (snapshot: DataSnapshot) => number
}

export interface SummaryRange {
  scope: 'month' | 'year'
  year: number
  month: number
}

export interface ExportRequest {
  scope: ExportScope
  format: ExportFormat
  /** 仅按总结导出时使用 */
  range?: SummaryRange
}
