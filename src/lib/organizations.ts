/**
 * FreeFlow Organizations - Multi-tenant Architecture
 * Struktura danych i funkcje do zarządzania organizacjami
 */

export type OrganizationPlan = 'free' | 'starter' | 'business' | 'enterprise';
export type OrganizationStatus = 'active' | 'suspended' | 'trial' | 'cancelled';
export type OrgUserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string; // Dla subdomen: slug.freeflow.app
  plan: OrganizationPlan;
  status: OrganizationStatus;
  created_at: string;
  updated_at: string;
  settings?: {
    logo_url?: string;
    primary_color?: string;
    timezone?: string;
    currency?: string;
  };
  metadata?: {
    industry?: string;
    size?: string;
    country?: string;
  };
}

export interface UserOrganization {
  user_id: string;
  org_id: string;
  role: OrgUserRole;
  joined_at: string;
  permissions?: string[];
}

export interface OrganizationMember {
  user_id: string;
  email: string;
  name?: string;
  role: OrgUserRole;
  joined_at: string;
  last_active?: string;
}

/**
 * Mock dane organizacji (dla development)
 */
export const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-001',
    name: 'Pizzeria Calzone',
    slug: 'pizzeria-calzone',
    plan: 'business',
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    settings: {
      logo_url: '/images/pizzeria-logo.png',
      primary_color: '#FF6B35',
      timezone: 'Europe/Warsaw',
      currency: 'PLN'
    },
    metadata: {
      industry: 'restaurant',
      size: 'small',
      country: 'PL'
    }
  },
  {
    id: 'org-002',
    name: 'Taxi Express',
    slug: 'taxi-express',
    plan: 'starter',
    status: 'active',
    created_at: '2024-02-01T10:00:00Z',
    updated_at: '2024-02-01T10:00:00Z',
    settings: {
      logo_url: '/images/taxi-logo.png',
      primary_color: '#FFD700',
      timezone: 'Europe/Warsaw',
      currency: 'PLN'
    },
    metadata: {
      industry: 'transportation',
      size: 'medium',
      country: 'PL'
    }
  },
  {
    id: 'org-003',
    name: 'Hotel Paradise',
    slug: 'hotel-paradise',
    plan: 'enterprise',
    status: 'active',
    created_at: '2024-03-10T10:00:00Z',
    updated_at: '2024-03-10T10:00:00Z',
    settings: {
      logo_url: '/images/hotel-logo.png',
      primary_color: '#4A90E2',
      timezone: 'Europe/Warsaw',
      currency: 'PLN'
    },
    metadata: {
      industry: 'hospitality',
      size: 'large',
      country: 'PL'
    }
  }
];

/**
 * Mock dane powiązań użytkownik-organizacja
 */
export const MOCK_USER_ORGANIZATIONS: UserOrganization[] = [
  {
    user_id: 'user-001',
    org_id: 'org-001',
    role: 'owner',
    joined_at: '2024-01-15T10:00:00Z',
    permissions: ['*']
  },
  {
    user_id: 'user-001',
    org_id: 'org-002',
    role: 'admin',
    joined_at: '2024-02-01T10:00:00Z',
    permissions: ['manage_orders', 'view_analytics']
  }
];

/**
 * Pobierz organizacje użytkownika
 */
export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  // TODO: Implementacja z Supabase
  // const { data, error } = await supabase
  //   .from('user_organizations')
  //   .select('*, organizations(*)')
  //   .eq('user_id', userId);
  
  // Na razie zwracamy mock
  const userOrgs = MOCK_USER_ORGANIZATIONS.filter(uo => uo.user_id === userId);
  return MOCK_ORGANIZATIONS.filter(org => 
    userOrgs.some(uo => uo.org_id === org.id)
  );
}

/**
 * Pobierz organizację po slug
 */
export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  // TODO: Implementacja z Supabase
  // const { data, error } = await supabase
  //   .from('organizations')
  //   .select('*')
  //   .eq('slug', slug)
  //   .single();
  
  return MOCK_ORGANIZATIONS.find(org => org.slug === slug) || null;
}

/**
 * Pobierz organizację po ID
 */
export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  // TODO: Implementacja z Supabase
  return MOCK_ORGANIZATIONS.find(org => org.id === orgId) || null;
}

/**
 * Pobierz rolę użytkownika w organizacji
 */
export async function getUserRoleInOrg(userId: string, orgId: string): Promise<OrgUserRole | null> {
  // TODO: Implementacja z Supabase
  const userOrg = MOCK_USER_ORGANIZATIONS.find(
    uo => uo.user_id === userId && uo.org_id === orgId
  );
  return userOrg?.role || null;
}

/**
 * Sprawdź czy użytkownik ma dostęp do organizacji
 */
export async function hasAccessToOrg(userId: string, orgId: string): Promise<boolean> {
  const role = await getUserRoleInOrg(userId, orgId);
  return role !== null;
}

/**
 * Pobierz członków organizacji
 */
export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  // TODO: Implementacja z Supabase
  // Mock data
  return [
    {
      user_id: 'user-001',
      email: 'owner@pizzeria.com',
      name: 'Jan Kowalski',
      role: 'owner',
      joined_at: '2024-01-15T10:00:00Z',
      last_active: '2024-01-20T15:30:00Z'
    },
    {
      user_id: 'user-002',
      email: 'manager@pizzeria.com',
      name: 'Anna Nowak',
      role: 'admin',
      joined_at: '2024-01-16T10:00:00Z',
      last_active: '2024-01-20T14:00:00Z'
    }
  ];
}

/**
 * Generuj subdomenę z nazwy organizacji
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Waliduj slug organizacji
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 3 && slug.length <= 50;
}

/**
 * Pobierz URL organizacji (subdomena)
 */
export function getOrganizationUrl(slug: string, env: 'development' | 'production' = 'production'): string {
  if (env === 'development') {
    return `http://${slug}.localhost:5173`;
  }
  return `https://${slug}.freeflow.app`;
}

/**
 * Pobierz plan organizacji z opisem
 */
export function getPlanDetails(plan: OrganizationPlan) {
  const plans = {
    free: {
      name: 'Free',
      price: 0,
      features: ['Do 10 zamówień/miesiąc', 'Podstawowe statystyki', 'Email support'],
      color: 'gray'
    },
    starter: {
      name: 'Starter',
      price: 99,
      features: ['Do 100 zamówień/miesiąc', 'Zaawansowane statystyki', 'Priority support'],
      color: 'blue'
    },
    business: {
      name: 'Business',
      price: 299,
      features: ['Nielimitowane zamówienia', 'API access', 'Dedykowany manager', 'Custom branding'],
      color: 'purple'
    },
    enterprise: {
      name: 'Enterprise',
      price: null, // Custom pricing
      features: ['Wszystko z Business', 'SLA 99.9%', 'On-premise deployment', 'Custom integrations'],
      color: 'orange'
    }
  };
  return plans[plan];
}

