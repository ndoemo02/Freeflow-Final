import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function DrawerMenu({ isOpen, onClose, userRole = 'user', onOpenCart = null }) {
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const MenuItem = ({ icon, text, onClick, isSubItem = false, isDanger = false, route = null }) => {
    const handleClick = () => {
      if (route) {
        navigate(route);
        onClose();
      } else if (onClick) {
        onClick();
      }
    };

    return (
      <motion.li 
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        style={{ 
          marginBottom: isSubItem ? '0.5rem' : '1rem', 
          cursor: 'pointer', 
          padding: isSubItem ? '0.25rem 0.5rem' : '0.5rem', 
          borderRadius: '8px', 
          transition: 'background 0.2s',
          marginLeft: isSubItem ? '1rem' : '0',
          color: isDanger ? '#ff6b6b' : 'white',
          fontSize: isSubItem ? '0.9rem' : '1rem'
        }} 
        onMouseEnter={(e) => e.target.style.background = '#333'} 
        onMouseLeave={(e) => e.target.style.background = 'transparent'}
        onClick={handleClick}
      >
        {icon} {text}
      </motion.li>
    );
  };

  const ExpandableSection = ({ title, icon, children, isExpanded }) => (
    <>
      <motion.li 
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        style={{ 
          marginBottom: '1rem', 
          cursor: 'pointer', 
          padding: '0.5rem', 
          borderRadius: '8px', 
          transition: 'background 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }} 
        onMouseEnter={(e) => e.target.style.background = '#333'} 
        onMouseLeave={(e) => e.target.style.background = 'transparent'}
        onClick={() => toggleSection(title)}
      >
        <span>{icon} {title}</span>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </motion.li>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Ciemne tło za szufladą */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 99
            }}
          />
          
          {/* Panel szuflady */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100vh',
              width: '320px',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              color: 'white',
              zIndex: 100,
              padding: '2rem',
              boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
              overflowY: 'auto'
            }}
          >
            <div style={{ marginTop: '2rem' }}>
              {/* Logo/Header */}
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '2rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #444'
              }}>
                <h2 style={{ color: '#00E0FF', margin: 0, fontSize: '1.5rem' }}>FreeFlow</h2>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {/* Główne sekcje */}
                <MenuItem icon="🏠" text="Home" onClick={onClose} />
                <MenuItem icon="🍽️" text="Odkrywaj Jedzenie" route="/restaurants" />
                <MenuItem icon="📅" text="Rezerwacje Stolików" route="/reservations" />
                
                {/* Linia oddzielająca */}
                <div style={{ 
                  height: '1px', 
                  background: '#444', 
                  margin: '1.5rem 0',
                  opacity: 0.5 
                }} />

                {/* Panele */}
                <ExpandableSection 
                  title="Panele" 
                  icon="📂" 
                  isExpanded={expandedSections['Panele']}
                >
                  <MenuItem icon="🙍" text="Panel Klienta" route="/panel/customer" isSubItem />
                  <MenuItem icon="🏢" text="Panel Biznesowy" route="/panel/business" isSubItem />
                  <MenuItem icon="📈" text="Analytics" route="/admin" isSubItem />
                </ExpandableSection>

                {/* Moja Aktywność */}
                <ExpandableSection 
                  title="Moja Aktywność" 
                  icon="📊" 
                  isExpanded={expandedSections['Moja Aktywność']}
                >
                  <MenuItem icon="🛒" text="Koszyk" onClick={onOpenCart || onClose} isSubItem />
                  <MenuItem icon="📜" text="Historia" route="/order-history" isSubItem />
                  <MenuItem icon="❤️" text="Ulubione" route="/favorites" isSubItem />
                  <MenuItem icon="🚕" text="Moje Taksówki" route="/my-taxis" isSubItem />
                  <MenuItem icon="🏨" text="Moje Hotele" route="/my-hotels" isSubItem />
                </ExpandableSection>

                {/* Ustawienia i Pomoc */}
                <ExpandableSection 
                  title="Ustawienia i Pomoc" 
                  icon="⚙️" 
                  isExpanded={expandedSections['Ustawienia i Pomoc']}
                >
                  <MenuItem icon="👤" text="Profil" route="/profile" isSubItem />
                  <MenuItem icon="🎤" text="Ustawienia Głosu" route="/voice-settings" isSubItem />
                  <MenuItem icon="🔔" text="Powiadomienia" route="/notifications" isSubItem />
                  <MenuItem icon="❓" text="FAQ" route="/faq" isSubItem />
                  <MenuItem icon="📞" text="Kontakt" route="/contact" isSubItem />
                </ExpandableSection>

                {/* Linia oddzielająca */}
                <div style={{ 
                  height: '1px', 
                  background: '#444', 
                  margin: '1.5rem 0',
                  opacity: 0.5 
                }} />

                {/* Stopka z użytkownikiem */}
                <div style={{ 
                  padding: '1rem', 
                  background: '#333', 
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>👤</span>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>ndoemo02</div>
                      <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Użytkownik</div>
                    </div>
                  </div>
                </div>

                {/* Linia oddzielająca */}
                <div style={{ 
                  height: '1px', 
                  background: '#444', 
                  margin: '1rem 0',
                  opacity: 0.5 
                }} />

                {/* Zarządzanie - tylko dla admin/business */}
                {(userRole === 'admin' || userRole === 'business') && (
                  <ExpandableSection 
                    title="Zarządzanie" 
                    icon="🔧" 
                    isExpanded={expandedSections['Zarządzanie']}
                  >
                    <MenuItem icon="📈" text="Panel Biznesowy" route="/business-panel" isSubItem />
                    <MenuItem icon="🔑" text="Panel Admina" route="/admin-panel" isSubItem />
                  </ExpandableSection>
                )}

                {/* Labs - tylko dla admin */}
                {userRole === 'admin' && (
                  <ExpandableSection 
                    title="Labs (DEV)" 
                    icon="🚀" 
                    isExpanded={expandedSections['Labs (DEV)']}
                  >
                    <MenuItem icon="🧪" text="Testy API" route="/dev/api-tests" isSubItem />
                    <MenuItem icon="📊" text="Analytics" route="/dev/analytics" isSubItem />
                    <MenuItem icon="🔧" text="Debug Tools" route="/dev/debug" isSubItem />
                    <MenuItem icon="🗄️" text="Database" route="/dev/database" isSubItem />
                    <MenuItem icon="📝" text="Logs" route="/dev/logs" isSubItem />
                  </ExpandableSection>
                )}

                {/* Wyloguj */}
                <MenuItem icon="🚪" text="Wyloguj się" onClick={onClose} isDanger />
              </ul>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
