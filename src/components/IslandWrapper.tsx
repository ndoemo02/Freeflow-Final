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
    sizeVariant?: 'default' | 'restaurant-stack';
}

export default function IslandWrapper({
    children,
    expanded,
    setExpanded,
    onClose,
    className = '',
    position = 'left',
    sizeVariant = 'default'
}: IslandWrapperProps) {
    const isRestaurantStack = sizeVariant === 'restaurant-stack';
    const handleDragEnd = (_event: any, info: PanInfo) => {
        const SWIPE_THRESHOLD = 50;
        const VELOCITY_THRESHOLD = 400;
        const { offset, velocity } = info;

        if (Math.abs(offset.y) <= Math.abs(offset.x)) return;

        if (offset.y < -SWIPE_THRESHOLD || velocity.y < -VELOCITY_THRESHOLD) {
            setExpanded(true);
        } else if (offset.y > SWIPE_THRESHOLD || velocity.y > VELOCITY_THRESHOLD) {
            if (expanded) {
                setExpanded(false);
            } else {
                onClose?.();
            }
        }
    };

    const sideClasses = isRestaurantStack
        ? 'left-3 sm:left-4 md:left-10'
        : position === 'left'
            ? 'left-4 md:left-10'
            : 'right-4 md:right-10';

    const sizeClasses = isRestaurantStack
        ? (
            expanded
                ? 'w-[14.5rem] sm:w-[15.5rem] md:w-[20.5rem] h-[18rem] sm:h-[20rem] md:h-[33rem] max-h-[44vh] md:max-h-[65vh]'
                : 'w-[13.5rem] sm:w-[14.5rem] md:w-[16.5rem] h-[9.75rem] sm:h-[10.5rem] md:h-[14.5rem]'
        )
        : (expanded ? 'w-[24rem] md:w-[27rem] h-auto max-h-[72vh]' : 'w-[19rem] h-[15.5rem]');

    const stackPlacement = isRestaurantStack
        ? 'bottom-[118px] sm:bottom-[126px] md:bottom-[164px]'
        : 'bottom-[172px]';

    return (
        <motion.div
            className={`fixed ${stackPlacement} ${sideClasses} z-40 ${className}`}
            initial={{ opacity: 0, x: isRestaurantStack ? 0 : (position === 'left' ? -40 : 40), scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: isRestaurantStack ? 0 : (position === 'left' ? -40 : 40), scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        >
            <motion.div
                className={`relative ${sizeClasses}`}
                drag={isRestaurantStack ? false : 'y'}
                dragDirectionLock
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.15}
                dragMomentum={false}
                onDragEnd={isRestaurantStack ? undefined : handleDragEnd}
                layout
                onClick={() => {
                    if (!isRestaurantStack && !expanded) setExpanded(true);
                }}
            >
                {children}
            </motion.div>
        </motion.div>
    );
}

