import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { PrintDetailDTO, PrintService } from '../services/print.service';

@Component({
  selector: 'app-print-detail',
  templateUrl: './print-detail.component.html',
  styleUrls: ['./print-detail.component.scss'],
})
export class PrintDetailComponent implements OnInit {
  print: PrintDetailDTO;

  constructor(
    private activatedRoute: ActivatedRoute,
    private printService: PrintService
  ) {}

  ngOnInit() {
    const printId = Number.parseInt(
      this.activatedRoute.snapshot.paramMap.get('id'),
      10
    );

    this.printService.getPrintDetail(printId).subscribe(details => {
      this.print = details;
    });
  }
}
