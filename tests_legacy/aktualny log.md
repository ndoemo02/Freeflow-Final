✅ Google access token obtained successfully
🔊 Using Vertex: pl-PL-Wavenet-A
✅ TTS audio generated successfully
tts_total: 614.765ms
[PIPELINE] Ä‘Ĺşâ€ťĹ  TTS Generated: "Jasne, rozumiem! Oto..." (615ms)
Ă˘ĹąÄ…ÄŹÂ¸Ĺą  [Pipeline] DONE  sess_177-mn9pd20o | intent=clarify_order | source=classic | 2431ms
[BrainV2] Request: sess_1774634435619_zfu0lv -> "Chciałbym podejrzeć koszyk" (Channel: web)
Ă˘â€“Â¶ÄŹÂ¸Ĺą  [Pipeline] START sess_177-mn9pdccn | session=sess_1774634435619_zfu0lv | text="Chciałbym podejrzeć koszyk" | mode=dev
[DishMatch] [
  { name: 'Coca-Cola', score: 0.05 },
  { name: 'Coca-Cola', score: 0.05 },
  { name: 'Nuggets box', score: 0.05 }
]
[NLU] Detecting intent for: Chciałbym podejrzeć koszyk
🔍 findRestaurantInText: normalized input="chcialbym podejrzec koszyk"
[DishMatch] [
  { name: 'Coca-Cola', score: 0.05 },
  { name: 'Coca-Cola', score: 0.05 },
  { name: 'Nuggets box', score: 0.05 }
]
[DishMatch] [
  { name: 'Coca-Cola', score: 0.05 },
  { name: 'Coca-Cola', score: 0.05 },
  { name: 'Nuggets box', score: 0.05 }
]
[intent-router] ?? detectIntent called with: {
  text: 'Chciałbym podejrzeć koszyk',
  sessionId: 'sess_1774634435619_zfu0lv'
}
[intent-router] ?? Starting early dish detection for text: Chciałbym podejrzeć koszyk
[intent-router] ?? Normalized text: chciałbym podejrzeć koszyk
[intent-router] ?? Session restaurant: Tasty King Kebab
[intent-router] ?? Restaurant indicators in text: false
[intent-router] ?? Skipping restaurant search - using session restaurant: Tasty King Kebab
[loadMenuCatalog] ?? Session: {
  status: 'active',
  closedReason: null,
  closedAt: null,
  conversationPhase: 'checkout',
  expectedContext: 'confirm_order',
  lastIntent: 'clarify_order',
  lastRestaurant: {
    id: 'fc844513-2869-4f42-b04f-c21e1e4cceb7',
    name: 'Tasty King Kebab',
    city: null
  },
  lastRestaurantsList: [],
  lastRestaurants: [
    {
      id: 'fc844513-2869-4f42-b04f-c21e1e4cceb7',
      name: 'Tasty King Kebab',
      index: 1,
      city: 'Piekary Śląskie'
    }
  ],
  lastRestaurantsTimestamp: null,
  lastMenu: [],
  locationOverride: null,
  history: [],
  pendingDish: null,
  awaiting: null,
  coords: { lat: 50.39508513879887, lng: 18.958552609888493 },
  turnBuffer: [
    {
      role: 'assistant',
      text: 'Jasne, już się robi! Oto',
      surfaceKey: null,
      entities: [Object],
      timestamp: 1774664374414
    },
    {
      role: 'user',
      text: 'Pokaż koszyk',
      entities: [Object],
      timestamp: 1774664388985
    },
    {
      role: 'assistant',
      text: 'Jasne, już się robi',
      surfaceKey: null,
      entities: [Object],
      timestamp: 1774664391332
    },
    {
      role: 'user',
      text: 'Chciałbym zobaczyć koszyk',
      entities: [Object],
      timestamp: 1774664399320
    },
    {
      role: 'assistant',
      text: 'Jasne, rozumiem! Oto',
      surfaceKey: null,
      entities: [Object],
      timestamp: 1774664401399
    }
  ],
  entityCache: {
    restaurants: [ [Object] ],
    items: [ [Object], [Object], [Object], [Object], [Object], [Object] ],
    lastListType: 'items'
  },
  currentRestaurant: {
    id: 'fc844513-2869-4f42-b04f-c21e1e4cceb7',
    name: 'Tasty King Kebab',
    city: null
  },
  lockedRestaurantId: 'fc844513-2869-4f42-b04f-c21e1e4cceb7',
  lastUpdated: 1774664399320,
  last_location: null,
  last_restaurants_list: [],
  orderMode: 'checkout_form',
  context: 'IN_RESTAURANT',
  last_menu: [
    {
      id: '1f69ec3e-73b4-4dc0-bb77-822eaf018e07',
      name: 'Coca-Cola 0,5l',
      base_name: 'Coca-Cola',
      size_or_variant: '0,5l',
      price_pln: 6,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '6fe4e0f4-7b8a-4bfc-9bcc-9475b7f56fb1',
      name: 'Coca-Cola 0,3l',
      base_name: 'Coca-Cola',
      size_or_variant: '0,3l',
      price_pln: 5,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: 'df133e95-e52d-4bbc-971d-b8fc5fade7a2',
      name: 'Nuggets box',
      base_name: 'Nuggets box',
      size_or_variant: null,
      price_pln: 15,
      description: null,
      category: 'Kebab',
      available: true
    },
    {
      id: '2ef99ff8-e3a7-48fc-9d4a-7a387163f7ff',
      name: 'Pita Rollo',
      base_name: 'Pita Rollo',
      size_or_variant: 'średni',
      price_pln: 18,
      description: 'Pita rollo, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: '051b230b-91ab-4a30-a980-f00b11a8429a',
      name: 'Pita Rollo',
      base_name: 'Pita Rollo',
      size_or_variant: 'duży',
      price_pln: 23,
      description: 'Pita rollo, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: '6a1b8e19-96b9-4638-9165-5b20fc846f06',
      name: 'Pita Rollo',
      base_name: 'Pita Rollo',
      size_or_variant: 'mega',
      price_pln: 28,
      description: 'Pita rollo, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: 'f410c8de-3ed6-40e8-8e05-2b61a01e1a25',
      name: 'Pita Rollo z serem',
      base_name: 'Pita Rollo z serem',
      size_or_variant: 'mały',
      price_pln: 16,
      description: 'Pita rollo z serem, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: '5fcb0b3c-6f27-40bf-941d-dd38ef47dcad',
      name: 'Pita Rollo z serem',
      base_name: 'Pita Rollo z serem',
      size_or_variant: 'średni',
      price_pln: 20,
      description: 'Pita rollo z serem, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: '42d19a51-8998-49a1-aa59-b45a69165284',
      name: 'Pita Rollo z serem',
      base_name: 'Pita Rollo z serem',
      size_or_variant: 'duży',
      price_pln: 25,
      description: 'Pita rollo z serem, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: 'e2c24a39-39cc-4939-abcd-6064d845b804',
      name: 'Pita Rollo z serem',
      base_name: 'Pita Rollo z serem',
      size_or_variant: 'mega',
      price_pln: 30,
      description: 'Pita rollo z serem, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: 'ed0502fa-eb68-453c-b6e0-e6fdff88f7df',
      name: 'Frytki z Indii masala',
      base_name: 'Frytki z Indii masala',
      size_or_variant: null,
      price_pln: 7,
      description: null,
      category: 'Przekąski',
      available: true
    },
    {
      id: '449bf26f-a549-47d2-8bc7-27453230fb80',
      name: 'Sałatka grecka',
      base_name: 'Sałatka grecka',
      size_or_variant: null,
      price_pln: 15,
      description: null,
      category: 'Przekąski',
      available: true
    },
    {
      id: 'e531c793-007a-4ed6-858f-64339048a6af',
      name: 'Sok Cappy',
      base_name: 'Sok Cappy',
      size_or_variant: null,
      price_pln: 5,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '3b842a08-7769-4c33-9f48-ca6f31cfaa6c',
      name: 'Kebab amerykański',
      base_name: 'Kebab amerykański',
      size_or_variant: null,
      price_pln: 20,
      description: null,
      category: 'Kebab',
      available: true
    },
    {
      id: 'f3eb7fe1-6e7d-47db-a98a-8cbf36b8e506',
      name: 'Coca-Cola 0,85l',
      base_name: 'Coca-Cola',
      size_or_variant: '0,85l',
      price_pln: 8,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '1aeca8d5-1efb-4bf8-b3f7-2d18c41f402c',
      name: 'Sos',
      base_name: 'Sos',
      size_or_variant: null,
      price_pln: 3,
      description: null,
      category: 'Przekąski',
      available: true
    },
    {
      id: '832e3395-cd6f-4119-acc0-68290e6ba693',
      name: 'Baklava',
      base_name: 'Baklava',
      size_or_variant: null,
      price_pln: 6,
      description: null,
      category: 'Przekąski',
      available: true
    },
    {
      id: '56f5ee57-9939-41f5-93db-4d8116ac4f44',
      name: 'Falafel',
      base_name: 'Falafel',
      size_or_variant: null,
      price_pln: 13,
      description: null,
      category: 'Kebab',
      available: true
    },
    {
      id: '7de49898-5dea-46c6-9228-8f9c0f936689',
      name: 'Ayran Turecki',
      base_name: 'Ayran Turecki',
      size_or_variant: null,
      price_pln: 5,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '07c9429b-61c4-408e-8e30-e780b94bd740',
      name: 'Pepsi / Mirinda / 7up',
      base_name: 'Pepsi / Mirinda / 7up',
      size_or_variant: null,
      price_pln: 6,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '6edfdf0f-71e3-478c-bceb-0a9c58d75100',
      name: 'Frytki z serem',
      base_name: 'Frytki z serem',
      size_or_variant: null,
      price_pln: 9,
      description: null,
      category: 'Przekąski',
      available: true
    },
    {
      id: '437068d1-c013-4cdb-8f94-428af77b3252',
      name: 'Monster Energy Drink',
      base_name: 'Monster Energy Drink',
      size_or_variant: null,
      price_pln: 9,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '89a2f6a5-3bfd-43f0-8822-423ab2650c38',
      name: 'Mango Sok',
      base_name: 'Mango Sok',
      size_or_variant: null,
      price_pln: 6,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '68377d29-08e8-4cbe-a2d5-f718fb9a0879',
      name: 'Oshee',
      base_name: 'Oshee',
      size_or_variant: null,
      price_pln: 6,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: 'ee20a783-4875-436b-9f6c-4a91e99629f5',
      name: 'Burn',
      base_name: 'Burn',
      size_or_variant: null,
      price_pln: 7,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: 'cd4dae3e-e80b-4b36-9319-54a79db2ddb4',
      name: 'Pita Rollo',
      base_name: 'Pita Rollo',
      size_or_variant: 'mały',
      price_pln: 14,
      description: 'Pita rollo, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    }
  ],
  last_menu_restaurant_id: 'fc844513-2869-4f42-b04f-c21e1e4cceb7',
  cart: {
    items: [ [Object] ],
    total: 15,
    restaurantId: 'fc844513-2869-4f42-b04f-c21e1e4cceb7'
  },
  lastOrder: {
    restaurant_id: 'fc844513-2869-4f42-b04f-c21e1e4cceb7',
    restaurant: 'Tasty King Kebab',
    items: [ [Object] ],
    total: '15.00',
    createdAt: 1774664371502
  },
  lastMenuItems: [
    {
      id: '1f69ec3e-73b4-4dc0-bb77-822eaf018e07',
      name: 'Coca-Cola 0,5l',
      base_name: 'Coca-Cola',
      size_or_variant: '0,5l',
      price_pln: 6,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '6fe4e0f4-7b8a-4bfc-9bcc-9475b7f56fb1',
      name: 'Coca-Cola 0,3l',
      base_name: 'Coca-Cola',
      size_or_variant: '0,3l',
      price_pln: 5,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: 'df133e95-e52d-4bbc-971d-b8fc5fade7a2',
      name: 'Nuggets box',
      base_name: 'Nuggets box',
      size_or_variant: null,
      price_pln: 15,
      description: null,
      category: 'Kebab',
      available: true
    },
    {
      id: '2ef99ff8-e3a7-48fc-9d4a-7a387163f7ff',
      name: 'Pita Rollo',
      base_name: 'Pita Rollo',
      size_or_variant: 'średni',
      price_pln: 18,
      description: 'Pita rollo, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: '051b230b-91ab-4a30-a980-f00b11a8429a',
      name: 'Pita Rollo',
      base_name: 'Pita Rollo',
      size_or_variant: 'duży',
      price_pln: 23,
      description: 'Pita rollo, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: '6a1b8e19-96b9-4638-9165-5b20fc846f06',
      name: 'Pita Rollo',
      base_name: 'Pita Rollo',
      size_or_variant: 'mega',
      price_pln: 28,
      description: 'Pita rollo, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: 'f410c8de-3ed6-40e8-8e05-2b61a01e1a25',
      name: 'Pita Rollo z serem',
      base_name: 'Pita Rollo z serem',
      size_or_variant: 'mały',
      price_pln: 16,
      description: 'Pita rollo z serem, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: '5fcb0b3c-6f27-40bf-941d-dd38ef47dcad',
      name: 'Pita Rollo z serem',
      base_name: 'Pita Rollo z serem',
      size_or_variant: 'średni',
      price_pln: 20,
      description: 'Pita rollo z serem, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: '42d19a51-8998-49a1-aa59-b45a69165284',
      name: 'Pita Rollo z serem',
      base_name: 'Pita Rollo z serem',
      size_or_variant: 'duży',
      price_pln: 25,
      description: 'Pita rollo z serem, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: 'e2c24a39-39cc-4939-abcd-6064d845b804',
      name: 'Pita Rollo z serem',
      base_name: 'Pita Rollo z serem',
      size_or_variant: 'mega',
      price_pln: 30,
      description: 'Pita rollo z serem, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    },
    {
      id: 'ed0502fa-eb68-453c-b6e0-e6fdff88f7df',
      name: 'Frytki z Indii masala',
      base_name: 'Frytki z Indii masala',
      size_or_variant: null,
      price_pln: 7,
      description: null,
      category: 'Przekąski',
      available: true
    },
    {
      id: '449bf26f-a549-47d2-8bc7-27453230fb80',
      name: 'Sałatka grecka',
      base_name: 'Sałatka grecka',
      size_or_variant: null,
      price_pln: 15,
      description: null,
      category: 'Przekąski',
      available: true
    },
    {
      id: 'e531c793-007a-4ed6-858f-64339048a6af',
      name: 'Sok Cappy',
      base_name: 'Sok Cappy',
      size_or_variant: null,
      price_pln: 5,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '3b842a08-7769-4c33-9f48-ca6f31cfaa6c',
      name: 'Kebab amerykański',
      base_name: 'Kebab amerykański',
      size_or_variant: null,
      price_pln: 20,
      description: null,
      category: 'Kebab',
      available: true
    },
    {
      id: 'f3eb7fe1-6e7d-47db-a98a-8cbf36b8e506',
      name: 'Coca-Cola 0,85l',
      base_name: 'Coca-Cola',
      size_or_variant: '0,85l',
      price_pln: 8,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '1aeca8d5-1efb-4bf8-b3f7-2d18c41f402c',
      name: 'Sos',
      base_name: 'Sos',
      size_or_variant: null,
      price_pln: 3,
      description: null,
      category: 'Przekąski',
      available: true
    },
    {
      id: '832e3395-cd6f-4119-acc0-68290e6ba693',
      name: 'Baklava',
      base_name: 'Baklava',
      size_or_variant: null,
      price_pln: 6,
      description: null,
      category: 'Przekąski',
      available: true
    },
    {
      id: '56f5ee57-9939-41f5-93db-4d8116ac4f44',
      name: 'Falafel',
      base_name: 'Falafel',
      size_or_variant: null,
      price_pln: 13,
      description: null,
      category: 'Kebab',
      available: true
    },
    {
      id: '7de49898-5dea-46c6-9228-8f9c0f936689',
      name: 'Ayran Turecki',
      base_name: 'Ayran Turecki',
      size_or_variant: null,
      price_pln: 5,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '07c9429b-61c4-408e-8e30-e780b94bd740',
      name: 'Pepsi / Mirinda / 7up',
      base_name: 'Pepsi / Mirinda / 7up',
      size_or_variant: null,
      price_pln: 6,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '6edfdf0f-71e3-478c-bceb-0a9c58d75100',
      name: 'Frytki z serem',
      base_name: 'Frytki z serem',
      size_or_variant: null,
      price_pln: 9,
      description: null,
      category: 'Przekąski',
      available: true
    },
    {
      id: '437068d1-c013-4cdb-8f94-428af77b3252',
      name: 'Monster Energy Drink',
      base_name: 'Monster Energy Drink',
      size_or_variant: null,
      price_pln: 9,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '89a2f6a5-3bfd-43f0-8822-423ab2650c38',
      name: 'Mango Sok',
      base_name: 'Mango Sok',
      size_or_variant: null,
      price_pln: 6,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: '68377d29-08e8-4cbe-a2d5-f718fb9a0879',
      name: 'Oshee',
      base_name: 'Oshee',
      size_or_variant: null,
      price_pln: 6,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: 'ee20a783-4875-436b-9f6c-4a91e99629f5',
      name: 'Burn',
      base_name: 'Burn',
      size_or_variant: null,
      price_pln: 7,
      description: null,
      category: 'Napoje',
      available: true
    },
    {
      id: 'cd4dae3e-e80b-4b36-9319-54a79db2ddb4',
      name: 'Pita Rollo',
      base_name: 'Pita Rollo',
      size_or_variant: 'mały',
      price_pln: 14,
      description: 'Pita rollo, sos, surówka, mięso',
      category: 'Kebab',
      available: true
    }
  ],
  pendingOrder: null,
  cartVersion: 1,
  id: 'sess_1774634435619_zfu0lv'
}
[loadMenuCatalog] ?? lastRestaurant: {
  id: 'fc844513-2869-4f42-b04f-c21e1e4cceb7',
  name: 'Tasty King Kebab',
  city: null
}
[loadMenuCatalog] ?? lastId: fc844513-2869-4f42-b04f-c21e1e4cceb7
[loadMenuCatalog] ? Loading menu for restaurant: fc844513-2869-4f42-b04f-c21e1e4cceb7 (Tasty King Kebab)
[loadMenuCatalog] ? Loaded 26 menu items from 1 restaurants
[loadMenuCatalog] ? Sample items: Coca-Cola 0,5l, Coca-Cola 0,3l, Nuggets box
[intent-router] Catalog loaded: 26 items
[intent-router] ?? Calling parseOrderItems...
[intent-router] ?? Catalog items: Coca-Cola 0,5l, Coca-Cola 0,3l, Nuggets box, Pita Rollo, Pita Rollo, Pita Rollo, Pita Rollo z serem, Pita Rollo z serem, Pita Rollo z serem, Pita Rollo z serem, Frytki z Indii masala, Sałatka grecka, Sok Cappy, Kebab amerykański, Coca-Cola 0,85l, Sos, Baklava, Falafel, Ayran Turecki, Pepsi / Mirinda / 7up, Frytki z serem, Monster Energy Drink, Mango Sok, Oshee, Burn, Pita Rollo
[parseOrderItems] ?? Summary:
  - requestedNames: []
  - availableNames: []
  - unavailableNames: []
  - matched.length: 0
  - clarifications.length: 0
[intent-router] ? Parsed result: {
  "any": false,
  "groups": [],
  "clarify": [],
  "available": [],
  "unavailable": [
    "chciałbym podejrzeć koszyk"
  ],
  "needsClarification": true,
  "unknownItems": [
    {
      "name": "chciałbym podejrzeć koszyk",
      "reason": "no_alias_match"
    }
  ]
}
[intent-router] ?? parsed.any = false
[intent-router] ?? parsed.groups.length = 0
?? Unavailable items detected: chciałbym podejrzeć koszyk in Tasty King Kebab
?? No cached restaurants list - skipping restaurant name check
🔍 Debug session updated: {
  intent: 'clarify_order',
  restaurant: 'Tasty King Kebab',
  sessionId: 'sess_1774634435619_zfu0lv',
  confidence: 0.9
}
Ä‘ĹşÂ§Â  NLURouter Result: {
  "intent": "clarify_order",
  "confidence": 0.9,
  "source": "classic",
  "entities": {
    "location": "Chciałbym",
    "cuisine": null,
    "quantity": 1,
    "restaurant": null,
    "restaurantId": null,
    "dish": null,
    "items": null
  },
  "domain": "ordering"
}
[NLU] Result: {
  intent: 'clarify_order',
  confidence: 0.9,
  source: 'classic',
  entities: {
    location: 'Chciałbym',
    cuisine: null,
    quantity: 1,
    restaurant: null,
    restaurantId: null,
    dish: null,
    items: null
  },
  domain: 'ordering'
}
Ä‘ĹşĹˇÂ« CLASSIC_ROUTE_INVARIANT_VIOLATED {
  source: 'classic',
  intent: 'clarify_order',
  sessionId: 'sess_1774634435619_zfu0lv'
}
CLASSIC ROUTE DETECTED Ă˘â‚¬â€ť classic
[KROK5-DEBUG] missing handler {"intent":"clarify_order","domain":"system","entities":{"location":"Chciałbym","cuisine":null,"quantity":1,"restaurant":null,"restaurantId":null,"dish":null,"items":null}}
Ä‘ĹşĹşĹ? PIPELINE FINAL REPLY [clarify_order]: "Nie rozumiem tego polecenia."
[TTS] Generating: Jasne, rozumiem! Oto...
✅ Google access token obtained successfully
🔊 Using Vertex: pl-PL-Wavenet-A
tts_total: 225.082ms
[PIPELINE] Ä‘Ĺşâ€ťĹ  TTS Generated: "Jasne, rozumiem! Oto..." (226ms)
Ă˘ĹąÄ…ÄŹÂ¸Ĺą  [Pipeline] DONE  sess_177-mn9pdccn | intent=clarify_order | source=classic | 629ms
[BrainV2] Request: sess_1774634435619_zfu0lv -> "Pokaż koszyk" (Channel: web)
Ă˘â€“Â¶ÄŹÂ¸Ĺą  [Pipeline] START sess_177-mn9pdjj3 | session=sess_1774634435619_zfu0lv | text="Pokaż koszyk" | mode=dev
[DishMatch] [
  { name: 'Coca-Cola', score: 0.05 },
  { name: 'Coca-Cola', score: 0.05 },
  { name: 'Nuggets box', score: 0.05 }
]
[DishMatch] [
  { name: 'Coca-Cola', score: 0.05 },
  { name: 'Coca-Cola', score: 0.05 },
  { name: 'Nuggets box', score: 0.05 }
]
[NLU] Detecting intent for: Pokaż koszyk
🔍 findRestaurantInText: normalized input="pokaz koszyk"
[CHECKOUT_BRIDGE_TRACE] {"source":"explicit_checkout_bridge","text":"Pokaż koszyk","normalized":"pokaz koszyk","hasCurrentRestaurant":true}
Ä‘ĹşÂ§Â  NLURouter Result: {
  "intent": "open_checkout",
  "confidence": 0.98,
  "source": "explicit_checkout_bridge",
  "entities": {
    "location": "Poka",
    "cuisine": null,
    "quantity": 1,
    "restaurant": null,
    "restaurantId": null,
    "dish": null,
    "items": null
  },
  "domain": "ordering"
}
[NLU] Result: {
  intent: 'open_checkout',
  confidence: 0.98,
  source: 'explicit_checkout_bridge',
  entities: {
    location: 'Poka',
    cuisine: null,
    quantity: 1,
    restaurant: null,
    restaurantId: null,
    dish: null,
    items: null
  },
  domain: 'ordering'
}
Ä‘ĹşĹşĹ? PIPELINE FINAL REPLY [open_checkout]: "Otwieram checkout. Uzupelnij dane dostawy i potwierdz zamowienie."
[TTS] Generating: Jasne, już się robi...
✅ Google access token obtained successfully
🔊 Using Vertex: pl-PL-Wavenet-A
tts_total: 230.754ms
[PIPELINE] Ä‘Ĺşâ€ťĹ  TTS Generated: "Jasne, już się robi..." (231ms)
Ă˘ĹąÄ…ÄŹÂ¸Ĺą  [Pipeline] DONE  sess_177-mn9pdjj3 | intent=open_checkout | source=explicit_checkout_bridge | 350ms
