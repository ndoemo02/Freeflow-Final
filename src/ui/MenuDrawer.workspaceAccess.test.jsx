import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ access: { allowed: false, isLoading: true }, ui: { drawerOpen: true } }));
vi.mock('../hooks/useWorkspaceAccess', () => ({ useWorkspaceAccess: () => mock.access }));
vi.mock('../state/auth', () => ({ useAuth: () => ({ user: { id: 'member' }, signOut: vi.fn() }) }));
vi.mock('../state/ui', () => ({ useUI: selector => selector ? selector(mock.ui) : mock.ui }));
vi.mock('../state/CartContext', () => ({ useCart: () => ({ setIsOpen: vi.fn(), itemCount: 0 }) }));
vi.mock('../store/useConversationStore', () => ({ useConversationStore: selector => selector({ clearHomeContext: vi.fn() }) }));
import MenuDrawer from './MenuDrawer';
afterEach(cleanup);

it('opens workspace links after authorization resolves and hides them after denial', async () => {
  mock.access = { allowed: false, isLoading: true };
  const view = render(<MemoryRouter><MenuDrawer /></MemoryRouter>);
  fireEvent.click(screen.getByText('Przestrzeń pracy'));
  expect(screen.queryByText('Kitchen Display')).toBeNull();
  mock.access = { allowed: true, isLoading: false };
  view.rerender(<MemoryRouter><MenuDrawer /></MemoryRouter>);
  expect(await screen.findByText('Kitchen Display')).toBeTruthy();
  expect(screen.getByText('Panel Właściciela')).toBeTruthy();
  mock.access = { allowed: false, isLoading: false };
  view.rerender(<MemoryRouter><MenuDrawer /></MemoryRouter>);
  await waitFor(() => expect(screen.queryByText('Kitchen Display')).toBeNull());
  fireEvent.click(screen.getByText('Przestrzeń pracy'));
  expect(screen.queryByText('Panel Właściciela')).toBeNull();
});
