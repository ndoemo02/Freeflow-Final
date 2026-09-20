const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function transcriptMatches(expected, actual) {
  const expectedTokens = [...new Set(normalize(expected).split(' ').filter(token => token.length > 2))];
  const actualText = ` ${normalize(actual)} `;
  if (!expectedTokens.length) return false;
  const found = expectedTokens.filter(token => actualText.includes(` ${token} `)).length;
  return found >= Math.ceil(expectedTokens.length * 0.6);
}

export function cartMatchesExpected(cart, expectedItems) {
  const actual = Array.isArray(cart?.items) ? cart.items : [];
  return expectedItems.every(expected => actual.some(item => {
    const name = normalize(item?.name);
    const expectedName = normalize(expected.name);
    const qty = Number(item?.qty ?? item?.quantity);
    const descriptor = normalize(`${item?.name || ''} ${item?.variant || item?.size_or_variant || ''}`);
    return name.includes(expectedName) && qty === Number(expected.qty)
      && (!expected.variant || descriptor.includes(normalize(expected.variant)));
  }));
}
