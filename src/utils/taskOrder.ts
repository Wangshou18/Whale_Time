import type { Task } from '../types'
import { PRIORITY_META } from '../types'

/**
 * 待办任务的统一排序（仪表盘与任务页共用）：
 * 1. 有截止日期的排在前面，无截止日期的沉到最后
 * 2. 截止日期越近越靠前 —— 即「剩余天数」少的先，已逾期（剩余为负）的最先
 * 3. 同一天到期（或同样没有截止日期）按优先级：紧急 > 高 > 中 > 低
 * 4. 仍然相同则先创建的先显示，保证每次渲染顺序稳定
 */
export function compareOpenTasks(a: Task, b: Task): number {
  if (a.dueDate && b.dueDate) {
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  } else if (a.dueDate) {
    return -1
  } else if (b.dueDate) {
    return 1
  }

  const byPriority = PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight
  if (byPriority !== 0) return byPriority

  return a.createdAt.localeCompare(b.createdAt)
}
