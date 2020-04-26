import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PrintService } from '../services/print.service';

@Component({
  selector: 'app-print-image',
  templateUrl: './print-image.component.html',
  styleUrls: ['./print-image.component.scss'],
})
export class PrintImageComponent implements OnInit {
  @Input() printId: number;
  @Input() imageId: number;
  @Input() imageData: string = null;
  @Input() showDeleteOnHover = false;

  @Output() imageDataChange = new EventEmitter<string>();
  @Output() delete = new EventEmitter();

  public imageHovered = false;

  constructor(private printService: PrintService) {}

  ngOnInit() {
    if (this.imageData === null && this.printId > 0 && this.imageId > 0) {
      this.printService
        .getPrintImage(this.printId, this.imageId)
        .subscribe((data) => {
          this.imageData = data;
          this.imageDataChange.emit(data);
        });
    }
  }

  handleDeleteClick(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    this.delete.emit();
  }
}
