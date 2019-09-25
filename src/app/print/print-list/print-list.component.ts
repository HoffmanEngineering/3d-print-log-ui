import { Component, OnInit } from '@angular/core';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
} from '../services/print.service';

@Component({
  selector: 'app-print-list',
  templateUrl: './print-list.component.html',
  styleUrls: ['./print-list.component.scss'],
})
export class PrintListComponent implements OnInit {
  public prints: PrintSummary[] = [];

  public printStatusTypes = PrintStatus;

  constructor(private printService: PrintService) {}

  ngOnInit() {
    this.printService.getPrintSummaries().subscribe(prints => {
      this.prints = prints;
    });
  }
}
