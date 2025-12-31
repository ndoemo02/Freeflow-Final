import React from 'react';
import { motion } from 'framer-motion';

interface StatusToggleProps {
    isOnline: boolean;
    onToggle: () => void;
}

export const StatusToggle: React.FC<StatusToggleProps> = ({ isOnline, onToggle }) => {
    return (
        <div className="flex flex-col items-center gap-2">
            <motion.button
                onClick={onToggle}
                className={`relative w-48 h-12 rounded-2xl flex items-center px-1 cursor-pointer transition-colors duration-500 shadow-lg border border-white/10 ${isOnline ? 'bg-green-500/20 shadow-green-500/20' : 'bg-red-500/20 shadow-red-500/20'
                    }`}
                whileTap={{ scale: 0.98 }}
            >
                {/* Sliding pill */}
                <motion.div
                    className={`absolute w-[calc(50%-4px)] h-[calc(100%-8px)] rounded-xl shadow-md backdrop-blur-md z-10 flex items-center justify-center font-bold text-white tracking-wide ${isOnline ? 'bg-green-500' : 'bg-red-500'
                        }`}
                    initial={false}
                    animate={{
                        x: isOnline ? '0%' : '100%',
                        left: isOnline ? '4px' : 'auto',
                        right: isOnline ? 'auto' : '4px'
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                    {isOnline ? "ONLINE" : "OFFLINE"}
                </motion.div>

                {/* Background labels */}
                <div className="w-full h-full flex justify-between items-center text-xs font-medium text-white/40 px-6 uppercase select-none">
                    <span>Go Live</span>
                    <span>Go Offline</span>
                </div>
            </motion.button>

            <span className={`text-xs font-mono transition-colors duration-300 ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                {isOnline ? 'System is searching for orders' : 'You are currently hidden'}
            </span>
        </div>
    );
};
