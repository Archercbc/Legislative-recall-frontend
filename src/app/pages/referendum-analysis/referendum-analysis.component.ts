import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-referendum-analysis',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './referendum-analysis.component.html',
  styleUrl: './referendum-analysis.component.scss'
})
export class ReferendumAnalysisComponent {

  constructor() { }

}
