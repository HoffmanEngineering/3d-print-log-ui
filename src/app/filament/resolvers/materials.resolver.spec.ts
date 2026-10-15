import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  Material,
  MaterialService,
} from 'src/app/core/services/material.service';
import { resolveValue } from 'src/app/core/resolvers/testing/run-resolver';
import { materialsResolver } from './materials.resolver';

describe('materialsResolver', () => {
  it('resolves the materials', async () => {
    const materials = [{ name: 'PLA' }] as unknown as Material[];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MaterialService,
          useValue: { getMaterials: () => of(materials) },
        },
      ],
    });

    await expectAsync(resolveValue(materialsResolver)).toBeResolvedTo(
      materials
    );
  });
});
