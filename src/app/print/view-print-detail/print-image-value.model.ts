export interface PrintImageValue {
  id?: number;
  url?: string;
  /** Widened to allow null: the detail page assigns null for stored images. */
  file?: File | null;
  isDefault: boolean;
  displayOrder: number;
}
