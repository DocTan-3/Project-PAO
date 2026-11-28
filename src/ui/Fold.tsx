import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Icon } from './icons';

/** A small box with a title you tap to open or close. It starts closed every time. */
export function Fold({ title, id, className, children }: { title: string; id: string; className: string; children: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  return (
    <section class={`fold ${className}`} id={id} aria-label={title}>
      <button class="fold-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span class={`caret${open ? ' open' : ''}`} aria-hidden="true"><Icon name="next" size={16} /></span>
        {title}
      </button>
      {open && <div class="fold-body">{children}</div>}
    </section>
  );
}
