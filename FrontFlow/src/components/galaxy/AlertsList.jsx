import GlassCard from './GlassCard';

export default function AlertsList({ alerts = [] }) {
  const defaultAlerts = [
    { id: 1, type: 'warning', msg: 'High latency in Sector 7', time: '2m ago' },
    { id: 2, type: 'success', msg: 'Daily revenue target reached', time: '15m ago' },
    { id: 3, type: 'error', msg: 'Payment gateway timeout', time: '1h ago' },
  ];

  const displayAlerts = alerts.length > 0 ? alerts : defaultAlerts;

  return (
    <GlassCard className="h-full" glowColor="pink">
      <h3 className="text-gray-300 font-medium mb-4 flex items-center gap-2">
        <i className="ph ph-bell-ringing text-pink-400"></i>
        System Alerts
      </h3>
      <div className="space-y-3">
        {displayAlerts.map(alert => (
          <div
            key={alert.id}
            className="group flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border-l-2 border-transparent transition-all hover:translate-x-1 cursor-pointer"
            style={{
              borderLeftColor:
                alert.type === 'warning' ? '#fbbf24' :
                alert.type === 'error' ? '#ef4444' :
                '#22c55e'
            }}
          >
            <div
              className={`mt-1 w-2 h-2 rounded-full ${
                alert.type === 'warning' ? 'bg-yellow-400' :
                alert.type === 'error' ? 'bg-red-400' :
                'bg-green-400'
              } shadow-[0_0_8px_currentColor]`}
            ></div>
            <div className="flex-1">
              <p className="text-sm text-gray-200">{alert.msg || alert.message}</p>
              <p className="text-xs text-gray-500 mt-1">{alert.time || (alert.created_at ? new Date(alert.created_at).toLocaleString() : '—')}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}


