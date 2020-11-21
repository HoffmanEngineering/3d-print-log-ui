import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-graph-panel',
  templateUrl: './graph-panel.component.html',
  styleUrls: ['./graph-panel.component.scss'],
})
export class GraphPanelComponent implements OnInit {
  @Input() title: string;
  @Input() data;

  constructor() {}

  ngOnInit() {}
}
