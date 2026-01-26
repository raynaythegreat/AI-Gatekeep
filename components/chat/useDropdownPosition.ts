import { useState, useEffect, useRef } from 'react';

interface Position {
  top?: string;
  bottom?: string;
  maxHeight: string;
}

export function useDropdownPosition(triggerRef: React.RefObject<HTMLButtonElement>, isOpen: boolean) {
  const [position, setPosition] = useState<Position>({ top: '100%', maxHeight: '400px' });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const dropdownHeight = 400;

    // Prefer downward if enough space, otherwise go up
    if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
      setPosition({ top: 'calc(100% + 8px)', maxHeight: `${Math.min(spaceBelow - 16, 400)}px` });
    } else {
      setPosition({ bottom: 'calc(100% + 8px)', maxHeight: `${Math.min(spaceAbove - 16, 400)}px` });
    }
  }, [isOpen, triggerRef]);

  return position;
}
