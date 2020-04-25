import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { PrintStatistic } from '../services/print-statistics.service';

@Component({
  selector: 'app-prints-by-status',
  templateUrl: './prints-by-status.component.html',
  styleUrls: ['./prints-by-status.component.scss'],
})
export class PrintsByStatusComponent implements OnChanges {
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
