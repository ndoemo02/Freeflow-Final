import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({ getAccessToken: async () => 'test-token' }));
vi.mock('../lib/config', () => ({ getApiUrl: path => `https://backend.test/${path}` }));
vi.mock('../hooks/useOwnerRestaurant', () => ({ useOwnerRestaurant: () => ({ selectedId: 'restaurant-test' }) }));
vi.mock('../components/OwnerRestaurantSelector', () => ({ OwnerRestaurantSelector: () => null }));
import BusinessPanelNew from './BusinessPanelNew';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each([
  ['confirmed', 'NOWE', 'PRZYJMIJ'],
  ['pending', 'NOWE', 'PRZYJMIJ'],
  ['new', 'NOWE', 'PRZYJMIJ'],
  ['preparing', 'W PRZYGOTOWANIU', 'PRZYGOTOWANE'],
  ['completed', 'GOTOWE', 'WYŚLIJ / ZAKOŃCZ'],
])('%s reaches its queue and correct card action through the real adapter and polling hook', async (status, queue, action) => {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ data: [{
    id: '093b278c-ac95-4c10-955d-75d5e3dc5cc5', status,
    items: [{ name: 'Pizza regression fixture', quantity: 1 }],
    total_price: 35, created_at: '2026-09-12T10:00:00Z', restaurant_id: 'restaurant-test',
  }] }) }));
  vi.stubGlobal('fetch', fetchMock);
  render(<MemoryRouter><BusinessPanelNew /></MemoryRouter>);
  const column = (await screen.findByRole('heading', { name: `${queue} (1)` })).parentElement.parentElement;
  expect(within(column).getByText('Pizza regression fixture')).toBeTruthy();
  expect(within(column).getByRole('button', { name: action })).toBeTruthy();
  expect(screen.getAllByText('Pizza regression fixture')).toHaveLength(1);
  if (status === 'confirmed') {
    expect(screen.getByRole('heading', { name: 'W PRZYGOTOWANIU (0)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Wszystkie.*1/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /kuchnia.*1/i }));
    expect(screen.getByRole('heading', { name: 'NOWE (1)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'PRZYJMIJ' })).toBeTruthy();
    expect(screen.getAllByText('Pizza regression fixture')).toHaveLength(1);
  }
  for (const [url, options] of fetchMock.mock.calls) {
    expect(url).toContain('api/owner/orders?limit=100&restaurant_id=restaurant-test');
    expect(options?.method ?? 'GET').toBe('GET');
  }
});
