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
    const handleDragEnd = (_event: any, info: PanInfo) => {
        const SWIPE_THRESHOLD = 50;
        const VELOCITY_THRESHOLD = 400;
        const { offset, velocity } = info;

        // Only respond to vertical gestures — horizontal is handled by inner slider
        // Guard: only process if the gesture is predominantly vertical
        if (Math.abs(offset.y) <= Math.abs(offset.x)) return;

        // Vertical Swipe (Expand / Collapse / Close)
        if (offset.y < -SWIPE_THRESHOLD || velocity.y < -VELOCITY_THRESHOLD) {
            // Swipe Up → Expand
            setExpanded(true);
        } else if (offset.y > SWIPE_THRESHOLD || velocity.y > VELOCITY_THRESHOLD) {
            // Swipe Down
            if (expanded) {
                setExpanded(false);
            } else {
                onClose?.();
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
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            <motion.div
                className={`
                    relative bg-black/40 backdrop-blur-xl border border-white/10
                    rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.3)]
                    overflow-hidden
                    ${expanded ? 'w-80 h-auto' : 'w-64 h-24'}
                `}
                // Vertical-only drag for expand / close gesture
                drag="y"
                dragDirectionLock
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.15}
                dragMomentum={false}
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
