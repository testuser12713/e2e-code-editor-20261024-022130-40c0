import { useEffect, useState } from 'react';

import { cn } from '../lib/cn';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

export type NoticeKind = 'info' | 'error';

export type NoticeItem = {
  id: number;
  message: string;
  kind: NoticeKind;
  title?: string;
};

export type NoticeViewProps = {
  message: string;
  kind?: NoticeKind;
  title?: string;
  onDismiss?: () => void;
  className?: string;
  testId?: string;
};

export type NotifyOptions = {
  title?: string;
};

const MAX_NOTICES = 4;
const AUTO_DISMISS_MS = 6000;
const listeners = new Set<(notices: NoticeItem[]) => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();
let notices: NoticeItem[] = [];
let nextId = 1;

function publish() {
  for (const listener of listeners) listener(notices);
}

function scheduleDismiss(id: number) {
  const timer = setTimeout(() => {
    timers.delete(id);
    dismissNotice(id);
  }, AUTO_DISMISS_MS);
  timers.set(id, timer);
}

export function notify(message: string, kind: NoticeKind = 'info', options: NotifyOptions = {}): void {
  const notice: NoticeItem = { id: nextId, message, kind, title: options.title };
  nextId += 1;
  notices = [...notices, notice].slice(-MAX_NOTICES);
  publish();
  scheduleDismiss(notice.id);
}

export function dismissNotice(id: number): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }

  const next = notices.filter((notice) => notice.id !== id);
  if (next.length === notices.length) return;
  notices = next;
  publish();
}

export function NoticeView({
  message,
  kind = 'info',
  title,
  onDismiss,
  className,
  testId,
}: NoticeViewProps) {
  return (
    <div
      className={cn('notice', kind === 'error' ? 'is-error' : undefined, className)}
      role={kind === 'error' ? 'alert' : 'status'}
      data-testid={testId}
    >
      <span className="notice-icon mono" aria-hidden="true">
        {kind === 'error' ? '!' : 'i'}
      </span>
      <span className="notice-body">
        {title ? <span className="notice-title">{title}</span> : null}
        <span className="notice-copy">{message}</span>
      </span>
      {onDismiss ? (
        <IconButton label="Dismiss notification" size="sm" className="notice-close" onClick={onDismiss}>
          <Icon name="close" size="sm" />
        </IconButton>
      ) : (
        <span className="notice-close-spacer" aria-hidden="true" />
      )}
    </div>
  );
}

export function Notifications() {
  const [items, setItems] = useState<NoticeItem[]>(notices);

  useEffect(() => {
    listeners.add(setItems);
    setItems(notices);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="notices" aria-live="polite" data-testid="notifications">
      {items.map((notice) => (
        <NoticeView
          key={notice.id}
          message={notice.message}
          kind={notice.kind}
          title={notice.title}
          onDismiss={() => dismissNotice(notice.id)}
        />
      ))}
    </div>
  );
}
