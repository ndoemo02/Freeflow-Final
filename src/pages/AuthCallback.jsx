import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const nav = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => nav('/panel'), 500);
    return () => clearTimeout(t);
  }, [nav]);
  return <div className="ff-alert ff-alert--info" style={{ margin:'92px auto', maxWidth: 860 }}>Logowanie…</div>;
}


