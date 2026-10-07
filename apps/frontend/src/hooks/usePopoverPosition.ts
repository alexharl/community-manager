import { useLayoutEffect, type RefObject } from 'react';

/**
 * Zeigt ein `popover="manual"`-Element unter (bzw. bei Platzmangel über) dem Anker an.
 * Das Popover liegt im Top-Layer und wird daher weder von Karten noch von Dialogen abgeschnitten.
 * `contentKey` neu berechnen lassen, wenn sich die Höhe ändert (z. B. Anzahl der Optionen).
 */
export function usePopoverPosition(
  popoverRef: RefObject<HTMLElement | null>,
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  contentKey?: unknown,
  offset = 4,
) {
  useLayoutEffect(() => {
    const popover = popoverRef.current;
    const anchor = anchorRef.current;
    if (!popover || !anchor) return;

    if (!open) {
      if (popover.matches(':popover-open')) popover.hidePopover();
      return;
    }

    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const height = popover.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom;
      const above = spaceBelow < height + offset && rect.top > spaceBelow;
      popover.style.left = `${rect.left}px`;
      popover.style.width = `${rect.width}px`;
      popover.style.top = `${above ? rect.top - height - offset : rect.bottom + offset}px`;
    };

    if (!popover.matches(':popover-open')) popover.showPopover();
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [popoverRef, anchorRef, open, contentKey, offset]);
}
