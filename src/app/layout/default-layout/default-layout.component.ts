import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DefaultHeaderComponent } from './default-header/default-header.component';
import { DefaultFooterComponent } from './default-footer/default-footer.component';

@Component({
  selector: 'app-default-layout',
  standalone: true,
  imports: [CommonModule, DefaultHeaderComponent, DefaultFooterComponent],
  templateUrl: './default-layout.component.html',
  styleUrl: './default-layout.component.scss'
})
export class DefaultLayoutComponent {

  constructor() { }

}
