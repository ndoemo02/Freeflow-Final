/**
 * OrgSwitcher - Komponent do przełączania między organizacjami
 * Widoczny dla vendor i admin
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../state/auth';
import { getUserOrganizations, Organization, getPlanDetails } from '../lib/organizations';

export default function OrgSwitcher() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadOrganizations();
    }
  }, [user?.id]);

  const loadOrganizations = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const orgs = await getUserOrganizations(user.id);
      setOrganizations(orgs);
      
      // Ustaw pierwszą organizację jako aktualną (lub odczytaj z localStorage)
      const savedOrgId = localStorage.getItem('freeflow_current_org');
      const org = savedOrgId 
        ? orgs.find(o => o.id === savedOrgId) || orgs[0]
        : orgs[0];
      
      if (org) {
        setCurrentOrg(org);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = (org: Organization) => {
    setCurrentOrg(org);
    localStorage.setItem('freeflow_current_org', org.id);
    setIsOpen(false);
    
    // Opcjonalnie: przeładuj stronę lub zaktualizuj kontekst
    console.log('Switched to organization:', org.name);
  };

  // Nie pokazuj dla użytkowników bez organizacji
  if (!user || organizations.length === 0) {
    return null;
  }

  // Nie pokazuj jeśli jest tylko jedna organizacja
  if (organizations.length === 1 && !isOpen) {
    return (
      <div className="fixed top-4 left-4 z-40">
        <div className="px-4 py-2 rounded-xl bg-black/40 backdrop-blur-xl border border-white/20 text-white text-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏢</span>
            <span className="font-semibold">{currentOrg?.name}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-4 z-40">
      {/* Current Organization Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 rounded-xl bg-black/40 backdrop-blur-xl border border-white/20 hover:bg-black/60 hover:border-white/30 transition-all text-white text-sm shadow-lg"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-orange-400/30 flex items-center justify-center">
            <span className="text-lg">🏢</span>
          </div>
          <div className="text-left">
            <div className="font-semibold">{currentOrg?.name || 'Wybierz organizację'}</div>
            <div className="text-xs text-white/60">
              {currentOrg && getPlanDetails(currentOrg.plan).name}
            </div>
          </div>
          <motion.svg
            className="w-4 h-4 text-white/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </motion.button>

      {/* Organizations Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              className="absolute top-full left-0 mt-2 w-80 rounded-2xl bg-black/90 backdrop-blur-2xl border border-white/20 shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="p-3 border-b border-white/10">
                <div className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Twoje organizacje
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {organizations.map((org, index) => {
                  const isActive = currentOrg?.id === org.id;
                  const planDetails = getPlanDetails(org.plan);

                  return (
                    <motion.button
                      key={org.id}
                      onClick={() => switchOrganization(org)}
                      className={`
                        w-full p-4 text-left transition-all
                        ${isActive 
                          ? 'bg-gradient-to-r from-orange-500/20 to-purple-500/20 border-l-4 border-orange-400' 
                          : 'hover:bg-white/5 border-l-4 border-transparent'
                        }
                      `}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center
                          ${isActive 
                            ? 'bg-gradient-to-br from-orange-500/30 to-purple-500/30 border-2 border-orange-400/50' 
                            : 'bg-white/5 border border-white/10'
                          }
                        `}>
                          <span className="text-xl">
                            {org.metadata?.industry === 'restaurant' && '🍕'}
                            {org.metadata?.industry === 'transportation' && '🚕'}
                            {org.metadata?.industry === 'hospitality' && '🏨'}
                            {!org.metadata?.industry && '🏢'}
                          </span>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${isActive ? 'text-white' : 'text-white/90'}`}>
                              {org.name}
                            </span>
                            {isActive && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-200 border border-orange-400/30">
                                Aktywna
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-${planDetails.color}-500/20 text-${planDetails.color}-200 border border-${planDetails.color}-400/30`}>
                              {planDetails.name}
                            </span>
                            <span className="text-xs text-white/50">
                              {org.slug}
                            </span>
                          </div>
                        </div>

                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-orange-400"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="p-3 border-t border-white/10">
                <button
                  className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500/20 to-purple-500/20 border border-orange-400/30 text-white text-sm font-medium hover:from-orange-500/30 hover:to-purple-500/30 transition-all"
                  onClick={() => {
                    setIsOpen(false);
                    // TODO: Otwórz modal tworzenia nowej organizacji
                    console.log('Create new organization');
                  }}
                >
                  + Dodaj organizację
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

