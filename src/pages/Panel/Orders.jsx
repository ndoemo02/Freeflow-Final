import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/auth'

export default function Orders() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Redirect if not logged in
  useEffect(() => {
    if (!user?.id) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  const items = [
    { id: 'ZAM-001', title: 'Zamówienie #1', status: 'w realizacji' },
    { id: 'ZAM-002', title: 'Zamówienie #2', status: 'przyjęte' },
    { id: 'ZAM-003', title: 'Zamówienie #3', status: 'zakończone' },
  ];
  return (
    <ul className="grid gap-3">
      {items.map((o) => (
        <li key={o.id} className="ff-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{o.title}</div>
              <div className="opacity-80 text-sm">{o.id}</div>
            </div>
            <span className="ff-badge">{o.status}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}


