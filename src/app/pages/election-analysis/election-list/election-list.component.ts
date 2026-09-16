import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { election_config_list, getElectionTypeText, getStatusClass } from '../election-config';
import { IconModule } from '@coreui/icons-angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-election-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IconModule, RouterLink],
  templateUrl: './election-list.component.html',
  styleUrl: './election-list.component.scss'
})
export class ElectionListComponent implements OnInit {
  elections: any[] = [];
  isLoading = false;
  selectedType: string = 'all';
  selectedStatus: string = 'all';

  electionTypes: { value: string; label: string }[] = [];

  electionStatuses = [
    { value: 'all', label: '全部狀態' },
    { value: 'upcoming', label: '即將舉行' },
    { value: 'ongoing', label: '進行中' },
    { value: 'completed', label: '已完成' }
  ];

  constructor(
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadElections();
  }

  loadElections(): void {
    this.isLoading = true;
    
    // 直接使用前端配置數據，不需要串接後端
    this.elections = election_config_list;
    
      // 固定包含政黨選舉和地方選舉（即使地方選舉還在開發中）
    this.electionTypes = [
      { value: 'all', label: '全部選舉' },
      { value: 'party_leadership', label: '政黨選舉' },
      { value: 'local', label: '地方選舉' }
    ];
    
    this.isLoading = false;
  }

  get filteredElections(): any[] {
    let filtered = this.elections;

    if (this.selectedType !== 'all') {
      filtered = filtered.filter(election => election.type === this.selectedType);
    }

    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(election => election.status === this.selectedStatus);
    }

    return filtered;
  }

  get allElections(): any[] {
    return this.elections;
  }

  onTypeChange(): void {
    // 類型改變時重新過濾
  }

  onStatusChange(): void {
    // 狀態改變時重新過濾
  }

  viewElectionDetails(electionId: string): void {
    this.router.navigate(['/election-analysis', electionId]);
  }


  getStatusText(status: string): string {
    switch (status) {
      case 'upcoming':
        return '即將舉行';
      case 'ongoing':
      case 'in_process':
        return '進行中';
      case 'completed':
        return '已完成';
      default:
        return '未知';
    }
  }

  getTypeText(type: string): string {
    return getElectionTypeText(type);
  }

  getStatusClass(status: string): string {
    return getStatusClass(status);
  }

  getCandidateCount(election: any): number {
    return election.candidates?.length || 0;
  }

  getDateRange(election: any): string {
    const startDate = new Date(election.start_date).toLocaleDateString('zh-TW');
    const endDate = new Date(election.end_date).toLocaleDateString('zh-TW');
    return `${startDate} - ${endDate}`;
  }
}
