import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { policy_config_list, getPolicyTypeText, getPolicyStatusClass } from '../policy-config';
import { IconModule } from '@coreui/icons-angular';

@Component({
  selector: 'app-policy-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IconModule],
  templateUrl: './policy-list.component.html',
  styleUrl: './policy-list.component.scss'
})
export class PolicyListComponent implements OnInit {
  policies: any[] = [];
  isLoading = false;
  selectedType: string = 'all';
  selectedStatus: string = 'all';

  policyTypes = [
    { value: 'all', label: '全部類型' },
    { value: 'economy', label: '經濟政策' },
    { value: 'social', label: '社會福利' },
    { value: 'education', label: '教育政策' },
    { value: 'healthcare', label: '醫療衛生' },
    { value: 'environment', label: '環境保護' },
    { value: 'infrastructure', label: '基礎建設' },
    { value: 'technology', label: '科技政策' },
    { value: 'other', label: '其他' }
  ];

  policyStatuses = [
    { value: 'all', label: '全部狀態' },
    { value: 'planning', label: '規劃中' },
    { value: 'in_process', label: '執行中' },
    { value: 'completed', label: '已完成' },
    { value: 'suspended', label: '暫停' },
    { value: 'canceled', label: '取消' }
  ];

  constructor(
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadPolicies();
  }

  loadPolicies(): void {
    this.isLoading = true;
    
    this.policies = policy_config_list;
    this.isLoading = false;
  }

  get filteredPolicies(): any[] {
    let filtered = this.policies;

    if (this.selectedType !== 'all') {
      filtered = filtered.filter(policy => policy.type === this.selectedType);
    }

    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(policy => policy.status === this.selectedStatus);
    }

    return filtered;
  }

  onTypeChange(): void {
  }

  onStatusChange(): void {
  }

  viewPolicyDetails(policyId: string): void {
    this.router.navigate(['/policy-tracking', policyId]);
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'planning':
        return '規劃中';
      case 'in_process':
        return '執行中';
      case 'completed':
        return '已完成';
      case 'suspended':
        return '暫停';
      case 'canceled':
        return '取消';
      default:
        return '未知';
    }
  }

  getTypeText(type: string): string {
    return getPolicyTypeText(type);
  }

  getStatusClass(status: string): string {
    return getPolicyStatusClass(status);
  }

  getDateRange(policy: any): string {
    if (!policy.start_date || !policy.end_date) return '';
    const startDate = new Date(policy.start_date).toLocaleDateString('zh-TW');
    const endDate = new Date(policy.end_date).toLocaleDateString('zh-TW');
    return `${startDate} - ${endDate}`;
  }
}

