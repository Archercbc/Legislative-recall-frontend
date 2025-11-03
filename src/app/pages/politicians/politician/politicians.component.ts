import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconModule } from '@coreui/icons-angular';
import { politicians_config_list, getPoliticianTypeText, getPartyColor } from '../politicians-config';

@Component({
  selector: 'app-politicians',
  standalone: true,
  imports: [CommonModule, FormsModule, IconModule],
  templateUrl: './politicians.component.html',
  styleUrl: './politicians.component.scss'
})
export class PoliticiansComponent implements OnInit {
  isLoading = false;
  searchTerm = '';
  selectedType: string = 'all';
  selectedParty: string = 'all';
  politicians: any[] = [];
  filteredPoliticians: any[] = [];

  politicianTypes = [
    { value: 'all', label: '全部類型' },
    { value: 'legislator', label: '立法委員' },
    { value: 'mayor', label: '縣市長' },
    { value: 'councilor', label: '議員' },
    { value: 'minister', label: '部長' },
    { value: 'party_leader', label: '政黨領袖' },
    { value: 'other', label: '其他' }
  ];

  parties = [
    { value: 'all', label: '全部政黨' },
    { value: '國民黨', label: '國民黨' },
    { value: '民進黨', label: '民進黨' },
    { value: '民眾黨', label: '民眾黨' },
    { value: '時代力量', label: '時代力量' },
    { value: '無黨籍', label: '無黨籍' }
  ];

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPoliticians();
  }

  loadPoliticians(): void {
    this.isLoading = true;
    
    this.politicians = politicians_config_list;
    this.filterPoliticians();
    this.isLoading = false;
  }

  onSearchChange(): void {
    this.filterPoliticians();
  }

  setTypeFilter(type: string): void {
    this.selectedType = type;
    this.filterPoliticians();
  }

  setPartyFilter(party: string): void {
    this.selectedParty = party;
    this.filterPoliticians();
  }

  filterPoliticians(): void {
    let filtered = this.politicians;
    
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(p => p.target_type === this.selectedType);
    }
    
    if (this.selectedParty !== 'all') {
      filtered = filtered.filter(p => p.party === this.selectedParty);
    }
    
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower)
      );
    }
    
    this.filteredPoliticians = filtered;
  }

  getTypeLabel(targetType: string): string {
    return getPoliticianTypeText(targetType);
  }

  getPartyColor(party: string): string {
    return getPartyColor(party);
  }

  viewPoliticianDetail(politician: any, targetType: string): void {
    // 使用政治人物的名稱而不是 ID，因為後端 API 期望接收名稱
    const politicianName = politician.name || politician.politician_id;
    
    if (targetType === 'legislator') {
      // 立委路由使用 legislatorId 參數，但傳遞的是名稱（後端 API 使用名稱查詢）
      this.router.navigate(['/legislator', politicianName]);
    } else {
      // 其他政治人物路由使用 /politicians-analysis/:politicianName
      this.router.navigate(['/politicians-analysis', politicianName]);
    }
  }

  onImageError(event: any): void {
    event.target.src = '/assets/default-avatar.png';
  }
}

