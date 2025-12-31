
export interface User {
    id: string;
    email?: string | null;
    role?: string;
    [key: string]: any;
}

/**
 * Helper function to determine user role.
 * Currently infers role from email or checks for a 'role' property.
 */
export function getUserRole(user: User | null): string {
    if (!user) return 'guest';

    // If user object has a role property, use it
    if (user.role) return user.role;

    // Fallback logic based on email for development/testing
    const email = (user.email || '').toLowerCase();

    if (email.includes('admin')) return 'admin';
    if (email.includes('vendor') || email.includes('business')) return 'vendor';
    if (email.includes('taxi')) return 'taxi';

    return 'user';
}
