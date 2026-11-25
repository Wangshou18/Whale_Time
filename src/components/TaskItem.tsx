import type { Task } from '../types'
import { PRIORITY_META } from '../types'
import { useApp } from '../store/AppStore'
import { dueInfo, formatShort } from '../utils/date'
import { excerpt } from '../utils/markdown'
import { Icon } from './Icons'

interface Props {
  task: Task
  onEdit: () => void
  onDelete?: () => void
  compact?: boolean
}

export function TaskItem({ task, onEdit, onDelete, compact = false }: Props) {
  const { toggleTask, settings, notify } = useApp()
  const done = task.status === 'done'
  const due = dueInfo(task.dueDate, settings.reminderDays)
  const priority = PRIORITY_META[task.priority]

  const handleToggle = async () => {
    await toggleTask(task.id)
    notify(done ? '任务已恢复为未完成' : '任务已完成，做得不错', done ? 'info' : 'success')
  }

  return (
    <article className={`task-item ${done ? 'is-done' : ''} ${compact ? 'compact' : ''}`}>
      <button
        type="button"
        className={`task-check ${done ? 'checked' : ''}`}
        onClick={handleToggle}
        aria-label={done ? '恢复为未完成' : '标记为已完成'}
        title={done ? '恢复为未完成' : '标记为已完成'}
      >
        {done ? <Icon name="check" size={15} /> : null}
      </button>

      <div className="task-main" onClick={onEdit} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onEdit()}>
        <div className="task-title-row">
          <h3 title={task.title}>{task.title}</h3>
          <span className="priority-chip" style={{ color: priority.color }}>
            <span className="priority-dot" style={{ background: priority.color }} />
            {priority.label}
          </span>
        </div>

        {!compact && task.content.trim() ? <p className="task-excerpt">{excerpt(task.content, 100)}</p> : null}

        <div className="task-meta">
          <span className="meta-item">
            <Icon name="calendar" size={13} />
            {task.dueDate && task.dueDate !== task.startDate
              ? `${formatShort(task.startDate)} → ${formatShort(task.dueDate)}`
              : formatShort(task.startDate)}
          </span>
          {task.dueDate && !done ? (
            <span className={`due-chip ${due.level}`}>
              <Icon name="clock" size={13} />
              {due.label}
            </span>
          ) : null}
          {done && task.completedAt ? (
            <span className="meta-item done">
              <Icon name="checkCircle" size={13} />
              {new Date(task.completedAt).toLocaleDateString('zh-CN')} 完成
            </span>
          ) : null}
          {task.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag small">#{tag}</span>
          ))}
          {task.tags.length > 3 ? <span className="meta-item">+{task.tags.length - 3}</span> : null}
          {task.attachments.length ? (
            <span className="meta-item">
              <Icon name="paperclip" size={13} />
              {task.attachments.length}
            </span>
          ) : null}
        </div>
      </div>

      <div className="task-actions">
        <button type="button" className="mini-btn" onClick={onEdit} title="编辑任务">
          <Icon name="edit" size={15} />
        </button>
        {onDelete ? (
          <button type="button" className="mini-btn danger" onClick={onDelete} title="删除任务">
            <Icon name="trash" size={15} />
          </button>
        ) : null}
      </div>
    </article>
  )
}
