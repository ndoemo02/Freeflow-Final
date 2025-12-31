import React, { useState } from 'react';
import { StatusToggle } from '../components/driver/StatusToggle';
import { SidebarMetrics } from '../components/driver/SidebarMetrics';
import { DriverMap } from '../components/driver/DriverMap';
import { motion } from 'framer-motion';

export default function DriverPanel() {
    const [isOnline, setIsOnline] = useState(false);

    return (
        <div className="w-full h-screen bg-[#0f0f13] text-white flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-[320px] h-full bg-[#16161a] border-r border-white/5 flex flex-col z-10 shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-lg">
                            D
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Driver Panel</h1>
                            <span className="text-xs text-slate-400">FreeFlow Fleet</span>
                        </div>
                    </div>
                </div>

                {/* Status Toggle Area */}
                <div className="p-6 flex justify-center border-b border-white/5 bg-black/20">
                    <StatusToggle isOnline={isOnline} onToggle={() => setIsOnline(!isOnline)} />
                </div>

                {/* Metrics Scroll Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <SidebarMetrics />

                    {/* Additional info simulation */}
                    <div className="p-4">
                        <h3 className="text-xs font-mono uppercase text-slate-500 mb-3">Live Updates</h3>
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-3 items-start opacity-70">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                    <div>
                                        <p className="text-xs text-slate-300">New high demand area detected in <b className="text-white">Downtown</b>.</p>
                                        <span className="text-[10px] text-slate-600">2 min ago</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 text-center text-xs text-slate-600">
                    FreeFlow Driver v2.1.0
                </div>
            </div>

            {/* Main Map Content */}
            <div className="flex-1 relative bg-black">
                <div className="absolute inset-0 z-0">
                    <DriverMap isOnline={isOnline} />
                </div>

                {/* Overlay elements if needed (e.g. current trip) */}
                {isOnline && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-6 right-6 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-xl max-w-xs pointer-events-none"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-bold text-white">Searching for trips...</span>
                        </div>
                        <p className="text-xs text-slate-400">
                            We are routing you towards forecasted demand. Please follow the purple path for higher matching probability.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
