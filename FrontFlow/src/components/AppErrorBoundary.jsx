import React from 'react'
import { Link } from 'react-router-dom'

export default class AppErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError: false } }
  static getDerivedStateFromError(){ return { hasError: true } }
  componentDidCatch(err, info){ console.error('App error boundary:', err, info) }
  render(){
    if (this.state.hasError) {
      return (
        <div style={{ padding:'24px 16px', maxWidth: 860, margin: '92px auto' }}>
          <div className="ff-card" style={{ padding: 16 }}>
            <h2 style={{ marginBottom: 8 }}>Coś poszło nie tak</h2>
            <p className="opacity-80">Spróbuj wrócić na stronę główną.</p>
            <div style={{ marginTop: 12 }}>
              <Link to="/" className="ff-btn ff-btn--primary">Powrót do strony głównej</Link>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}


