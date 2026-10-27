import { environment } from 'src/environments/environment';
import { apiUrl } from './api-url';

describe('apiUrl', () => {
  it('prefixes an API-relative path with the API base URL', () => {
    expect(apiUrl('/api/Prints/1/image/2/thumbnail')).toBe(
      `${environment.printLogApiUrl}/api/Prints/1/image/2/thumbnail`
    );
  });

  // Older APIs leave the thumbnail fields out; prints without an image send null.
  it('is undefined for a missing or empty path', () => {
    expect(apiUrl(undefined)).toBeUndefined();
    expect(apiUrl(null)).toBeUndefined();
    expect(apiUrl('')).toBeUndefined();
  });

  it('leaves an absolute URL alone', () => {
    expect(apiUrl('https://cdn.example/x.webp')).toBe(
      'https://cdn.example/x.webp'
    );
  });
});
