/**
 * Gemini Live function declarations — frontend mirror of
 * backend/api/voice/live/ToolSchemas.js :: toGeminiFunctionDeclarations()
 *
 * Must stay in sync with the backend. Any tool added there should be added here.
 */

import { Type, type FunctionDeclaration } from '@google/genai';

const O = Type.OBJECT;
const S = Type.STRING;
const N = Type.NUMBER;
const A = Type.ARRAY;

export const LIVE_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'find_nearby',
    description: 'Find nearby restaurants using optional location and cuisine filters.',
    parameters: {
      type: O,
      properties: {
        location: { type: S },
        cuisine: { type: S },
        lat: { type: N },
        lng: { type: N },
      },
    },
  },
  {
    name: 'select_restaurant',
    description: 'Select restaurant from list or direct id.',
    parameters: {
      type: O,
      properties: {
        restaurant_id: { type: S },
        restaurant_name: { type: S },
        selection_text: { type: S },
      },
    },
  },
  {
    name: 'show_menu',
    description: 'Show menu for selected restaurant.',
    parameters: {
      type: O,
      properties: {
        restaurant_id: { type: S },
        restaurant_name: { type: S },
      },
    },
  },
  {
    name: 'show_more_options',
    description: 'Paginate or show more options from current restaurant list.',
    parameters: { type: O, properties: {} },
  },
  {
    name: 'add_item_to_cart',
    description: 'Add one item to cart by dish name and quantity.',
    parameters: {
      type: O,
      properties: {
        dish: { type: S },
        quantity: { type: N },
        restaurant_id: { type: S },
        restaurant_name: { type: S },
      },
      required: ['dish'],
    },
  },
  {
    name: 'add_items_to_cart',
    description: 'Add multiple items to cart in one transaction.',
    parameters: {
      type: O,
      properties: {
        items: {
          type: A,
          items: {
            type: O,
            properties: {
              dish: { type: S },
              quantity: { type: N },
            },
            required: ['dish'],
          },
        },
        restaurant_id: { type: S },
        restaurant_name: { type: S },
      },
      required: ['items'],
    },
  },
  {
    name: 'confirm_add_to_cart',
    description: 'Confirm pending add-to-cart operation.',
    parameters: { type: O, properties: {} },
  },
  {
    name: 'open_checkout',
    description: 'Open checkout flow for current cart.',
    parameters: { type: O, properties: {} },
  },
  {
    name: 'confirm_order',
    description: 'Confirm and finalize current order flow.',
    parameters: { type: O, properties: {} },
  },
  {
    name: 'cancel_order',
    description: 'Cancel current order flow and reset ordering state.',
    parameters: { type: O, properties: {} },
  },
  {
    name: 'get_cart_state',
    description: 'Read current server-side cart/session state.',
    parameters: { type: O, properties: {} },
  },
];
