import { buildCsvPackage, buildFullBackup, buildLightBackup, readSnapshot } from './archive'
import { buildDatasetExport } from './exportDataset'
import type { ExportRequest, ExportResult } from './types'

export type {
  DataSnapshot,
  DatasetDescriptor,
  DatasetKey,
  ExportFormat,
  ExportRequest,
  ExportResult,
  ExportScope,
  ImportStrategy,
  SummaryRange,
} from './types'
export { DATASETS, DATASET_MAP, FORMAT_META, isDatasetKey } from './datasets'
export { readSnapshot } from './archive'
export { importBackupFile } from './importer'
export { buildDatasetExport } from './exportDataset'
export {
  clearTransferLog,
  lastExportEntry,
  loadTransferLog,
  pushTransferLog,
  type TransferLogEntry,
} from './history'

/**
 * 统一导出入口：页面只需要描述「范围 + 格式」，其余由本模块决定。
 * 全部导出走备份通道，单数据集走序列化通道。
 */
export async function runExport(request: ExportRequest): Promise<ExportResult> {
  const { snapshot, attachments } = await readSnapshot()

  if (request.scope === 'all') {
    if (request.format === 'zip') return buildFullBackup(snapshot, attachments)
    if (request.format === 'csv') return buildCsvPackage(snapshot)
    return buildLightBackup(snapshot)
  }

  return buildDatasetExport(request.scope, request.format, snapshot, attachments, request.range)
}
