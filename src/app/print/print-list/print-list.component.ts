import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

  constructor(private activatedRoute: ActivatedRoute) {}

  ngOnInit() {
    this.activatedRoute.data.subscribe(data => {
      this.prints = data.printList;
    });
  }
}
