import type { DatasetDescriptor, DatasetKey, ExportFormat } from './types'

export const APP_ID = 'whale-work-assistant'

export const FORMAT_META: Record<ExportFormat, { label: string; ext: string; hint: string; mime: string }> = {
  json: {
    label: 'JSON 数据',
    ext: 'json',
    hint: '结构化原文，可再次导入，字段一个不丢。',
    mime: 'application/json;charset=utf-8',
  },
  csv: { label: 'CSV 表格', ext: 'csv', hint: '一行一条，方便在 Excel / 表格软件里筛选。', mime: 'text/csv;charset=utf-8' },
  md: { label: 'Markdown', ext: 'md', hint: '带标题层级，可直接贴进周报或知识库。', mime: 'text/markdown;charset=utf-8' },
  txt: { label: '纯文本', ext: 'txt', hint: '无格式符号，适合打印或贴进聊天框。', mime: 'text/plain;charset=utf-8' },
  zip: { label: 'ZIP 压缩包', ext: 'zip', hint: '结构与附件一起打包，用于完整恢复。', mime: 'application/zip' },
}

/** 数据集注册表：新增数据集只需在这里补一项 */
export const DATASETS: DatasetDescriptor[] = [
  {
    key: 'tasks',
    label: '任务',
    hint: '标题、状态、优先级、标签、正文与附件清单。',
    icon: 'tasks',
    formats: ['csv', 'md', 'json'],
    count: (snapshot) => snapshot.tasks.length,
  },
  {
    key: 'notes',
    label: '笔记',
    hint: 'Markdown 正文、标签与关联日期。',
    icon: 'notes',
    formats: ['md', 'csv', 'json'],
    count: (snapshot) => snapshot.notes.length,
  },
  {
    key: 'attendance',
    label: '考勤',
    hint: '每天上午 / 下午 / 全天的打卡与休息记录。',
    icon: 'attendance',
    formats: ['csv', 'md', 'json'],
    count: (snapshot) => snapshot.attendance.length,
  },
  {
    key: 'summaries',
    label: '工作总结',
    hint: '按天记录，支持按月、按年成册导出。',
    icon: 'review',
    formats: ['md', 'txt', 'csv', 'json'],
    count: (snapshot) => snapshot.summaries.length,
  },
  {
    key: 'attachments',
    label: '附件',
    hint: '仅清单与体积；文件本体请用完整 ZIP 备份。',
    icon: 'paperclip',
    formats: ['csv', 'json'],
    count: (snapshot) => snapshot.attachmentCount,
  },
]

export const DATASET_MAP: Record<DatasetKey, DatasetDescriptor> = DATASETS.reduce(
  (acc, item) => {
    acc[item.key] = item
    return acc
  },
  {} as Record<DatasetKey, DatasetDescriptor>,
)

export function isDatasetKey(value: unknown): value is DatasetKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DATASET_MAP, value)
}
