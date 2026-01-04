import { useState, useRef, useEffect } from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPlacement, setAdjustedPlacement] = useState(placement);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 300);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  // Adjust placement if tooltip would overflow
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();

      let newPlacement = placement;

      // Check if tooltip overflows and adjust
      if (placement === 'top' && triggerRect.top - tooltipRect.height < 10) {
        newPlacement = 'bottom';
      } else if (
        placement === 'bottom' &&
        triggerRect.bottom + tooltipRect.height > window.innerHeight - 10
      ) {
        newPlacement = 'top';
      } else if (placement === 'left' && triggerRect.left - tooltipRect.width < 10) {
        newPlacement = 'right';
      } else if (
        placement === 'right' &&
        triggerRect.right + tooltipRect.width > window.innerWidth - 10
      ) {
        newPlacement = 'left';
      }

      if (newPlacement !== adjustedPlacement) {
        setAdjustedPlacement(newPlacement);
      }
    }
  }, [isVisible, placement, adjustedPlacement]);

  return (
    <span
      ref={triggerRef}
      className={styles.trigger}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`${styles.tooltip} ${styles[adjustedPlacement]}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </span>
  );
}
