import { cn } from '../lib/cn';

export type IconName =
  | 'brand'
  | 'folder'
  | 'folder-open'
  | 'file'
  | 'search'
  | 'settings'
  | 'refresh'
  | 'chevron'
  | 'chevron-down'
  | 'close'
  | 'command'
  | 'info'
  | 'save'
  | 'alert'
  | 'shield'
  | 'check'
  | 'trash'
  | 'edit'
  | 'new-file'
  | 'new-folder'
  | 'layout';

type IconProps = {
  name: IconName;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
  testId?: string;
};

export function Icon({ name, size = 'md', className, title, testId }: IconProps) {
  const sizeClass = size === 'sm' ? 'icon-sm' : size === 'lg' ? 'icon-lg' : undefined;
  return (
    <svg
      className={cn('icon', sizeClass, className)}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      data-testid={testId}
    >
      {title ? <title>{title}</title> : null}
      <use href={`#i-${name}`} />
    </svg>
  );
}

export function IconSprite() {
  return (
    <svg className="svg-sprite" aria-hidden="true" focusable="false">
      <symbol id="i-brand" viewBox="0 0 24 24"><path d="M8.5 7 4 12l4.5 5M15.5 7 20 12l-4.5 5M14 4l-4 16" /></symbol>
      <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3.5 7.5h6l2 2H20v9.5H4V7.5Z" /></symbol>
      <symbol id="i-folder-open" viewBox="0 0 24 24"><path d="M3.5 8h6l2 2H20l-2 8.5H4L2.5 11H17" /></symbol>
      <symbol id="i-file" viewBox="0 0 24 24"><path d="M6 3.5h7l5 5v12H6z" /><path d="M13 3.5v5h5" /></symbol>
      <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></symbol>
      <symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></symbol>
      <symbol id="i-refresh" viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.2 9a7 7 0 0 1 11.6-2.5L20 9M4 15l2.2 2.5A7 7 0 0 0 17.8 15" /></symbol>
      <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" /></symbol>
      <symbol id="i-chevron-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></symbol>
      <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></symbol>
      <symbol id="i-command" viewBox="0 0 24 24"><path d="M9 6a3 3 0 1 0-3 3h3V6Zm0 12a3 3 0 1 1-3-3h3v3Zm6-12a3 3 0 1 1 3 3h-3V6Zm0 12a3 3 0 1 0 3-3h-3v3ZM9 9h6v6H9z" /></symbol>
      <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 10.5V17M12 7.4v.2" /></symbol>
      <symbol id="i-save" viewBox="0 0 24 24"><path d="M4.5 4.5h11l4 4v11h-15z" /><path d="M8 4.5v5h7v-5M8 19.5v-5h8v5" /></symbol>
      <symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 4 21 20H3z" /><path d="M12 10v4M12 17.2v.2" /></symbol>
      <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3.5 19 6v5.4c0 4.4-2.8 7.5-7 9.1-4.2-1.6-7-4.7-7-9.1V6z" /><path d="m9 12 2 2 4-4.5" /></symbol>
      <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7" /></symbol>
      <symbol id="i-trash" viewBox="0 0 24 24"><path d="M4.5 7h15M9 7V4.5h6V7M6 7l1 13h10l1-13M10 10.5v6M14 10.5v6" /></symbol>
      <symbol id="i-edit" viewBox="0 0 24 24"><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10z" /><path d="m13.5 6.5 3.5 3.5" /></symbol>
      <symbol id="i-new-file" viewBox="0 0 24 24"><path d="M6 3.5h7l5 5v12H6z" /><path d="M13 3.5v5h5M9 14h5M11.5 11.5v5" /></symbol>
      <symbol id="i-new-folder" viewBox="0 0 24 24"><path d="M3.5 7.5h6l2 2H20v9.5H4V7.5Z" /><path d="M12 12v5M9.5 14.5h5" /></symbol>
      <symbol id="i-layout" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="1" /><path d="M8.5 4.5v15M8.5 10h12" /></symbol>
    </svg>
  );
}
