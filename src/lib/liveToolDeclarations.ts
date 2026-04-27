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
    name: 'compare_restaurants',
    description: 'Compare menu items across up to 3 restaurants in the same city. Read-only.',
    parameters: {
      type: O,
      properties: {
        query: { type: S },
        category: { type: S },
        city: { type: S },
        metric: { type: S },
        max_restaurants: { type: N },
        max_items_per_restaurant: { type: N },
      },
    },
  },
  {
    name: 'add_item_to_cart',
    description: 'Add one item to cart by dish name and quantity. If user mentions a restaurant, include restaurant_name (or restaurant_id) in args.',
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
    description: 'Add multiple items to cart in one transaction. If user mentions a restaurant, include restaurant_name (or restaurant_id) in args.',
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
    name: 'update_cart_item_quantity',
    description: 'Change quantity for an existing cart item by dish name.',
    parameters: {
      type: O,
      properties: {
        dish: { type: S },
        quantity: { type: N },
      },
      required: ['dish', 'quantity'],
    },
  },
  {
    name: 'remove_item_from_cart',
    description: 'Remove item from cart by dish name. Optional quantity removes only part of amount.',
    parameters: {
      type: O,
      properties: {
        dish: { type: S },
        quantity: { type: N },
      },
      required: ['dish'],
    },
  },
  {
    name: 'replace_cart_item',
    description: 'Replace one cart item with another dish in the same restaurant scope.',
    parameters: {
      type: O,
      properties: {
        from_dish: { type: S },
        to_dish: { type: S },
        quantity: { type: N },
        restaurant_id: { type: S },
        restaurant_name: { type: S },
      },
      required: ['from_dish', 'to_dish'],
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
