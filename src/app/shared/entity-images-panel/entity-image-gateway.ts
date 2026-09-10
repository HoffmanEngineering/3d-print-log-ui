import { Observable } from 'rxjs';

/** One stored image, as every entity's image endpoints return it. */
export interface EntityImage {
  id: number;
  url: string | null;
  thumbnailUrl: string | null;
  isDefault: boolean;
  displayOrder: number;
}

/**
 * The four image mutations, generic in the ID type: material IDs are GUID strings and
 * printer IDs are numbers.
 */
export interface EntityImageGateway<TId extends string | number> {
  upload(entityId: TId, file: File): Observable<EntityImage>;
  delete(entityId: TId, imageId: number): Observable<void>;
  reorder(entityId: TId, orderedImageIds: number[]): Observable<void>;
  setDefault(entityId: TId, imageId: number): Observable<void>;
}

/**
 * An ID and the gateway that understands it, travelling together.
 *
 * Binding them as two independent component inputs would re-erase the generic: a numeric
 * printer ID could be paired with a material gateway and nothing would complain. The panel's
 * input widens to the union, but every target is built by a typed factory on the owning
 * service, so a mismatched pair is unconstructible.
 */
export interface EntityImageTarget<TId extends string | number> {
  readonly id: TId | null;
  readonly gateway: EntityImageGateway<TId>;
}

/**
 * What the panel actually binds. The panel never inspects the ID - it only hands it back to
 * the gateway it arrived with - so widening here is safe in a way that two separate inputs
 * would not be.
 */
export type AnyEntityImageTarget = EntityImageTarget<string | number>;
