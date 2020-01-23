import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PrinterSummary } from '../services/printer.service';

@Component({
  selector: 'app-printer-list',
  templateUrl: './printer-list.component.html',
  styleUrls: ['./printer-list.component.scss'],
})
export class PrinterListComponent implements OnInit {
  public printers: PrinterSummary[] = [];

  public displayedColumns: string[] = ['id', 'make', 'model'];

  constructor(private activatedRoute: ActivatedRoute) {}

  ngOnInit() {
    this.activatedRoute.data.subscribe(data => {
      this.printers = data.printerList;
    });
  }
}
