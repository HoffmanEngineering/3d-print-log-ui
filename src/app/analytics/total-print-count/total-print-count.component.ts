import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { PrintStatistic } from '../services/print-statistics.service';

@Component({
  selector: 'app-total-print-count',
  templateUrl: './total-print-count.component.html',
  styleUrls: ['./total-print-count.component.scss'],
})
export class TotalPrintCountComponent implements OnChanges {
  @Input() prints: PrintStatistic[] = [];

  public printCount: number;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.prints) {
      this.calculatePrintCount();
    }
  }

  calculatePrintCount() {
    this.printCount = this.prints.length;
  }
}
