import { useEffect, useRef, useState } from 'react'
import type { AttachmentMeta } from '../types'
import { downloadBlob, formatBytes, isTextLike } from '../utils/format'
import { useApp } from '../store/AppStore'
import { Icon } from './Icons'
import { Modal } from './Modal'

interface Props {
  attachment: AttachmentMeta | null
  onClose: () => void
}

export function AttachmentPreview({ attachment, onClose }: Props) {
  const { getAttachmentBlob, notify } = useApp()
  const [url, setUrl] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const objectUrl = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setUrl(null)
    setText(null)
    setError(null)
    if (!attachment) return

    getAttachmentBlob(attachment.id)
      .then(async (blob) => {
        if (cancelled) return
        if (!blob) {
          setError('附件数据缺失，可能未包含在此前的备份中')
          return
        }
        if (isTextLike(attachment.type, attachment.name)) {
          const content = await blob.text()
          if (!cancelled) setText(content.slice(0, 200_000))
          return
        }
        const nextUrl = URL.createObjectURL(blob)
        objectUrl.current = nextUrl
        if (!cancelled) setUrl(nextUrl)
      })
      .catch(() => {
        if (!cancelled) setError('读取附件失败，请稍后重试')
      })

    return () => {
      cancelled = true
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current)
        objectUrl.current = null
      }
    }
  }, [attachment, getAttachmentBlob])

  if (!attachment) return null

  const isImage = attachment.type.startsWith('image/')
  const isPdf = attachment.type === 'application/pdf' || /\.pdf$/i.test(attachment.name)
  const isVideo = attachment.type.startsWith('video/')
  const isAudio = attachment.type.startsWith('audio/')

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await getAttachmentBlob(attachment.id)
      if (!blob) {
        notify('附件数据缺失，无法下载', 'error')
        return
      }
      downloadBlob(blob, attachment.name)
    } catch {
      notify('下载附件失败', 'error')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={attachment.name}
      subtitle={`${formatBytes(attachment.size)} · ${attachment.type || '未知类型'}`}
      size="lg"
      bodyClassName="preview-body"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
          <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={downloading || !!error}>
            <Icon name="download" size={16} />
            {downloading ? '准备中…' : '下载原文件'}
          </button>
        </>
      }
    >
      {error ? (
        <div className="empty-state compact">
          <div className="empty-icon"><Icon name="alert" size={22} /></div>
          <p>{error}</p>
        </div>
      ) : isImage && url ? (
        <img className="preview-image" src={url} alt={attachment.name} />
      ) : isPdf && url ? (
        <iframe className="preview-frame" src={url} title={attachment.name} />
      ) : isVideo && url ? (
        <video className="preview-media" src={url} controls />
      ) : isAudio && url ? (
        <div className="preview-audio">
          <Icon name="file" size={42} />
          <audio src={url} controls />
        </div>
      ) : text !== null ? (
        <pre className="preview-text">{text}</pre>
      ) : (
        <div className="preview-loading">
          <span className="spinner" />
          <p>正在读取附件…</p>
        </div>
      )}
    </Modal>
  )
}
