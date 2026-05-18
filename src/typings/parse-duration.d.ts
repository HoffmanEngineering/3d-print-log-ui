// Type shim for parse-duration@1.1.2 to fix compatibility with moduleResolution: "bundler".
// The package's index.d.mts uses `export * from './index.js'` where index.js has `export =`
// which TypeScript rejects. This shim exposes the correct types via tsconfig paths mapping.
type Units =
  | 'nanosecond'
  | 'ns'
  | 'µs'
  | 'μs'
  | 'us'
  | 'microsecond'
  | 'millisecond'
  | 'ms'
  | 'second'
  | 'sec'
  | 's'
  | 'minute'
  | 'min'
  | 'm'
  | 'hour'
  | 'hr'
  | 'h'
  | 'day'
  | 'd'
  | 'week'
  | 'wk'
  | 'w'
  | 'month'
  | 'b'
  | 'year'
  | 'yr'
  | 'y';

type Parse = {
  (input: string, format?: Units): number | null;
  [key: string]: number;
} & {
  default: Parse;
};

declare const parse: Parse;
export = parse;
