import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { Material } from 'src/app/core/services/material.service';

@Pipe({
  name: 'materialName',
  standalone: false,
})
export class MaterialNamePipe implements PipeTransform {
  transform(value: Material | null, ...args: unknown[]): string {
    if (!value) {
      return '';
    }

    if (
      value.acronym &&
      value.acronym !== '' &&
      value.name &&
      value.name !== ''
    ) {
      return `${value.acronym} (${value.name})`;
    } else if (value.acronym === null && value.name && value.name !== '') {
      return `${value.name}`;
    } else if (value.name === null && value.acronym && value.acronym !== '') {
      return `${value.acronym}`;
    } else {
      return '';
    }
  }
}
