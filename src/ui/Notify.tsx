import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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

  const next = [...notices, notice].slice(-MAX_NOTICES);
  for (const dropped of notices) {
    if (next.includes(dropped)) continue;
    const timer = timers.get(dropped.id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(dropped.id);
    }
  }

  notices = next;
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
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    listeners.add(setItems);
    setItems(notices);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;

    const app = document.querySelector<HTMLElement>('.app');
    if (!app) return;

    const container = document.createElement('div');
    container.className = 'notices-host';
    container.setAttribute('data-notices-host', '');
    const statusbar = app.querySelector<HTMLElement>('.statusbar');
    if (statusbar) {
      app.insertBefore(container, statusbar);
    } else {
      app.appendChild(container);
    }
    setHost(container);

    return () => {
      container.remove();
    };
  }, []);

  if (items.length === 0) return null;

  const view = (
    <div
      className={cn('notices', host ? undefined : 'is-floating')}
      aria-live="polite"
      data-testid="notifications"
    >
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

  return host ? createPortal(view, host) : view;
}
