import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/auth'

export default function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Redirect if not logged in
  useEffect(() => {
    if (!user?.id) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  return (
    <form className="grid gap-4">
      <label className="grid gap-2">
        <span>Imię i nazwisko</span>
        <input className="ff-input" placeholder="Jan Kowalski" />
      </label>
      <label className="grid gap-2">
        <span>E‑mail</span>
        <input type="email" className="ff-input" placeholder="email@domena.com" />
      </label>
      <label className="grid gap-2">
        <span>Telefon</span>
        <input className="ff-input" placeholder="+48..." />
      </label>
      <button type="button" className="ff-btn ff-btn--primary w-fit">Zapisz</button>
    </form>
  );
}


