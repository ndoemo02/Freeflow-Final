import React from 'react';
import { motion, PanInfo } from 'framer-motion';

interface IslandWrapperProps {
    children: React.ReactNode;
    expanded: boolean;
    setExpanded: (expanded: boolean) => void;
    onSwipeNext?: () => void;
    onSwipePrev?: () => void;
    onClose?: () => void;
    className?: string;
    position?: 'left' | 'right';
}

export default function IslandWrapper({
    children,
    expanded,
    setExpanded,
    onSwipeNext,
    onSwipePrev,
    onClose,
    className = '',
    position = 'left'
}: IslandWrapperProps) {
    const handleDragEnd = (event: any, info: PanInfo) => {
        const SWIPE_THRESHOLD = 50;
        const VELOCITY_THRESHOLD = 400;
        const { offset, velocity } = info;

        // Horizontal Swipe (Navigate Items)
        if (Math.abs(offset.x) > Math.abs(offset.y)) {
            if (offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD) {
                onSwipeNext?.();
            } else if (offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) {
                onSwipePrev?.();
            }
        }
        // Vertical Swipe (Expand / Collapse / Close)
        else {
            if (offset.y < -SWIPE_THRESHOLD || velocity.y < -VELOCITY_THRESHOLD) {
                // Swipe Up -> Expand
                setExpanded(true);
            } else if (offset.y > SWIPE_THRESHOLD || velocity.y > VELOCITY_THRESHOLD) {
                // Swipe Down
                if (expanded) {
                    setExpanded(false);
                } else {
                    onClose?.();
                }
            }
        }
    };

    const sideClasses = position === 'left' ? 'left-4 md:left-8' : 'right-4 md:right-8';

    return (
        <motion.div
            className={`fixed bottom-[180px] ${sideClasses} z-40 ${className}`}
            initial={{ opacity: 0, x: position === 'left' ? -50 : 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: position === 'left' ? -50 : 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            <motion.div
                className={`
                    relative bg-black/40 backdrop-blur-xl border border-white/10 
                    rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.3)]
                    overflow-hidden cursor-grab active:cursor-grabbing
                    ${expanded ? 'w-80 h-auto' : 'w-64 h-24'}
                `}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                layout
                onClick={() => !expanded && setExpanded(true)}
            >
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />

                {children}
            </motion.div>
        </motion.div>
    );
}
