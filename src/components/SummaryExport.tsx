import type { DailySummary } from '../types'
import { Modal } from './Modal'
import { SummaryExportPanel } from './summary/SummaryExportPanel'
import type { SummaryFormat } from '../utils/summary'

interface SummaryExportProps {
  open: boolean
  onClose: () => void
  summaries: DailySummary[]
  defaultYear: number
  defaultMonth: number
  onExported?: (info: { filename: string; days: number; format: SummaryFormat }) => void
}

/** 总结页的导出弹窗：内容全部来自可复用的 SummaryExportPanel */
export function SummaryExport({ open, onClose, summaries, defaultYear, defaultMonth, onExported }: SummaryExportProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="导出工作总结"
      subtitle="按月份或按年份打包，文件在本机生成。"
    >
      <SummaryExportPanel
        summaries={summaries}
        defaultYear={defaultYear}
        defaultMonth={defaultMonth}
        onExported={(info) => {
          onExported?.(info)
          onClose()
        }}
      />
    </Modal>
  )
}
