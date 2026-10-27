export interface PrintImageValue {
  id?: number;
  url?: string;
  /** Absolute URL of the small derivative, when the API reports one. */
  thumbnailUrl?: string;
  /** Widened to allow null: the detail page assigns null for stored images. */
  file?: File | null;
  isDefault: boolean;
  displayOrder: number;
}
