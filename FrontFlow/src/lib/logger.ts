type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: any;
}

class Logger {
    private logs: LogEntry[] = [];
    private maxLogs = 500;
    private subscribers: ((entry: LogEntry) => void)[] = [];

    subscribe(callback: (entry: LogEntry) => void) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    private addLog(level: LogLevel, message: string, data?: any) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        };

        this.logs.unshift(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }

        // Notify subscribers
        this.subscribers.forEach(cb => cb(entry));

        // Console output for Development Experience
        // W produkcji możemy to wyciszyć, ale błędy zawsze logujemy
        if (import.meta.env.DEV || level === 'error') {
            const styles = {
                info: 'color: #00bcd4; font-weight: bold',
                warn: 'color: #ff9800; font-weight: bold',
                error: 'color: #f44336; font-weight: bold',
                debug: 'color: #9e9e9e; font-weight: bold'
            };

            console.groupCollapsed(`%c[${level.toUpperCase()}] ${message}`, styles[level]);
            console.log('Timestamp:', entry.timestamp);
            if (data) console.log('Data:', data);
            console.groupEnd();
        }
    }

    info(message: string, data?: any) { this.addLog('info', message, data); }
    warn(message: string, data?: any) { this.addLog('warn', message, data); }
    error(message: string, data?: any) { this.addLog('error', message, data); }
    debug(message: string, data?: any) { this.addLog('debug', message, data); }

    getHistory() { return this.logs; }
    clear() { this.logs = []; }
}

export const logger = new Logger();
