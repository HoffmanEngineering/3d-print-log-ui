import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  convertToParamMap,
  Params,
  ResolveFn,
  RouterStateSnapshot,
} from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';

/** A route snapshot carrying only the params a resolver reads. */
export function routeSnapshot({
  params = {},
  queryParams = {},
}: { params?: Params; queryParams?: Params } = {}): ActivatedRouteSnapshot {
  return {
    params,
    queryParams,
    paramMap: convertToParamMap(params),
    queryParamMap: convertToParamMap(queryParams),
  } as ActivatedRouteSnapshot;
}

/** Calls a functional resolver inside the TestBed injector, as the router would. */
export function runResolver<T>(
  resolver: ResolveFn<T>,
  route: ActivatedRouteSnapshot = routeSnapshot()
): ReturnType<ResolveFn<T>> {
  return TestBed.runInInjectionContext(() =>
    resolver(route, {} as RouterStateSnapshot)
  );
}

/** The value a resolver settles to, whether it returns a value, a promise or an observable. */
export async function resolveValue<T>(
  resolver: ResolveFn<T>,
  route: ActivatedRouteSnapshot = routeSnapshot()
): Promise<T> {
  const result = runResolver(resolver, route);
  return (isObservable(result) ? firstValueFrom(result) : await result) as T;
}
