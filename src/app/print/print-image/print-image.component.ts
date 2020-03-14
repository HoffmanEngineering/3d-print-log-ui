import { Component, Input, OnInit } from '@angular/core';
import { PrintService } from '../services/print.service';

@Component({
  selector: 'app-print-image',
  templateUrl: './print-image.component.html',
  styleUrls: ['./print-image.component.scss'],
})
export class PrintImageComponent implements OnInit {
  @Input() printId: number;
  @Input() imageId: number;

  public imageData: string;
  constructor(private printService: PrintService) {}

  ngOnInit() {
    if (this.printId > 0 && this.imageId > 0) {
      this.printService
        .getPrintImage(this.printId, this.imageId)
        .subscribe(data => {
          this.imageData = data;
        });
    }
  }
}
