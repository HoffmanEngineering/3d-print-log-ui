import { TestBed } from '@angular/core/testing';
import { Currencies, currenciesResolver } from './currencies.resolver';
import { resolveValue } from './testing/run-resolver';

describe('currenciesResolver', () => {
  it('resolves the currency table keyed by ISO code', async () => {
    TestBed.configureTestingModule({});

    const currencies: Currencies = await resolveValue(currenciesResolver);

    expect(currencies['USD'].symbol).toBe('$');
    expect(currencies['EUR'].name).toBe('Euro');
  });
});
