import { StubShippingProvider } from './stub-shipping.provider.js';

const pkg = { weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10, quantity: 1 };

describe('StubShippingProvider', () => {
  const provider = new StubShippingProvider();

  it('é determinístico e SEDEX é mais caro e mais rápido que PAC', async () => {
    const request = { originZipCode: '01001000', destinationZipCode: '20040002', packages: [pkg] };
    const first = await provider.quote(request);
    expect(await provider.quote(request)).toEqual(first);

    const pac = first.find((o) => o.service === 'PAC')!;
    const sedex = first.find((o) => o.service === 'SEDEX')!;
    expect(sedex.priceCents).toBeGreaterThan(pac.priceCents);
    expect(sedex.deliveryDays).toBeLessThan(pac.deliveryDays);
  });

  it('usa peso cúbico quando maior que o real', async () => {
    const light = { ...pkg, weightGrams: 100 };
    const bulky = { ...light, lengthCm: 60, widthCm: 50, heightCm: 40 }; // 20 kg cúbicos
    const base = { originZipCode: '01001000', destinationZipCode: '01310100' };
    const [lightPac] = await provider.quote({ ...base, packages: [light] });
    const [bulkyPac] = await provider.quote({ ...base, packages: [bulky] });
    expect(bulkyPac.priceCents).toBeGreaterThan(lightPac.priceCents);
  });

  it('fica mais caro para regiões mais distantes', async () => {
    const [near] = await provider.quote({ originZipCode: '01001000', destinationZipCode: '04001000', packages: [pkg] });
    const [far] = await provider.quote({ originZipCode: '01001000', destinationZipCode: '90001000', packages: [pkg] });
    expect(far.priceCents).toBeGreaterThan(near.priceCents);
  });
});
