import { useEffect, useState } from 'react';

import { cn } from '../lib/cn';
import { Icon } from './Icon';

type NoticeKind = 'info' | 'error';

type Notice = {
  id: number;
  message: string;
  kind: NoticeKind;
};

const MAX_NOTICES = 4;
const listeners = new Set<(notices: Notice[]) => void>();
let notices: Notice[] = [];
let nextId = 1;

function publish() {
  for (const listener of listeners) listener(notices);
}

export function notify(message: string, kind: NoticeKind = 'info'): void {
  const notice: Notice = { id: nextId, message, kind };
  nextId += 1;
  notices = [...notices, notice].slice(-MAX_NOTICES);
  publish();

  if (typeof window !== 'undefined') {
    window.setTimeout(() => dismissNotice(notice.id), 6000);
  }
}

export function dismissNotice(id: number): void {
  const next = notices.filter((notice) => notice.id !== id);
  if (next.length === notices.length) return;
  notices = next;
  publish();
}

export function Notifications() {
  const [items, setItems] = useState<Notice[]>(notices);

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
        <div key={notice.id} className={cn('notice', notice.kind === 'error' ? 'is-error' : undefined)} role="status">
          <span className="notice-icon mono" aria-hidden="true">
            {notice.kind === 'error' ? '!' : 'i'}
          </span>
          <span className="notice-copy">{notice.message}</span>
          <button
            type="button"
            className="notice-close"
            aria-label="Dismiss notification"
            onClick={() => dismissNotice(notice.id)}
          >
            <Icon name="close" size="sm" />
          </button>
        </div>
      ))}
    </div>
  );
}
