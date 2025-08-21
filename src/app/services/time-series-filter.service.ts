import { Injectable } from '@angular/core';

export interface TimeRangeFilter {
  startDate: string;
  endDate: string;
  interval: '7_days' | '14_days' | '30_days' | '90_days' | '180_days' | '365_days';
}

export interface FilteredTimeSeriesData {
  daily: any[];
  cumulative: any[];
  interval: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimeSeriesFilterService {
  
  /**
   * 主要篩選方法
   * @param timeSeriesStats 時間序列統計數據
   * @param startDate 開始日期
   * @param endDate 結束日期
   * @param dataType 數據類型
   * @returns 篩選後的數據
   */
  filterData(
    timeSeriesStats: any,
    startDate: string,
    endDate: string,
    dataType: 'daily' | 'cumulative' | 'both' = 'both'
  ): FilteredTimeSeriesData | null {
    if (!timeSeriesStats || !startDate || !endDate) {
      return null;
    }

    const interval = this.getOptimalTimeInterval(startDate, endDate);
    
    const dailyKey = `recent_${interval}_days_daily`;
    const cumulativeKey = `recent_${interval}_days_cumulative`;
    
    // 檢查數據是否存在
    if (!timeSeriesStats[dailyKey] && !timeSeriesStats[cumulativeKey]) {
      console.warn(`⚠️ 找不到時間間隔 ${interval} 的數據`);
      return null;
    }
    
    const result: FilteredTimeSeriesData = {
      daily: [],
      cumulative: [],
      interval: interval
    };
    
    if (dataType === 'daily' || dataType === 'both') {
      result.daily = this.filterDailyData(timeSeriesStats[dailyKey], startDate, endDate);
    }
    
    if (dataType === 'cumulative' || dataType === 'both') {
      result.cumulative = this.filterCumulativeData(timeSeriesStats[cumulativeKey], startDate, endDate);
    }
    
    return result;
  }
  
  /**
   * 篩選每日數據
   */
  private filterDailyData(dailyStats: any, startDate: string, endDate: string): any[] {
    if (!dailyStats || typeof dailyStats !== 'object') {
      return [];
    }

    return Object.keys(dailyStats)
      .filter(date => date >= startDate && date <= endDate)
      .map(date => ({
        date,
        ...dailyStats[date]
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  
  /**
   * 篩選累計數據
   */
  private filterCumulativeData(cumulativeStats: any[], startDate: string, endDate: string): any[] {
    if (!Array.isArray(cumulativeStats)) {
      return [];
    }

    return cumulativeStats
      .filter(item => item.date >= startDate && item.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  
  /**
   * 獲取最優時間間隔
   */
  private getOptimalTimeInterval(startDate: string, endDate: string): string {
    const daysDiff = this.calculateDaysDifference(startDate, endDate);
    
    if (daysDiff <= 7) return '7_days';
    if (daysDiff <= 14) return '14_days';
    if (daysDiff <= 30) return '30_days';
    if (daysDiff <= 90) return '90_days';
    if (daysDiff <= 180) return '180_days';
    return '365_days';
  }
  
  /**
   * 計算日期差異
   */
  private calculateDaysDifference(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  /**
   * 將新的 Array 格式轉換為舊的 Object 格式（如果需要）
   */
  convertCumulativeToObject(cumulativeStats: any[]): any {
    if (!Array.isArray(cumulativeStats)) {
      return {};
    }

    const result: any = {};
    cumulativeStats.forEach(item => {
      result[item.date] = {
        positive: item.sentiment_counts?.support || 0,
        negative: item.sentiment_counts?.oppose || 0,
        total_comments: item.cumulative_count || 0,
        daily_count: item.daily_count || 0
      };
    });
    return result;
  }
  
  /**
   * 獲取特定日期的累計數據
   */
  getCumulativeDataByDate(cumulativeStats: any[], targetDate: string): any | null {
    if (!Array.isArray(cumulativeStats)) {
      return null;
    }
    return cumulativeStats.find(item => item.date === targetDate) || null;
  }
  
  /**
   * 獲取可用的時間間隔
   */
  getAvailableIntervals(timeSeriesStats: any): string[] {
    if (!timeSeriesStats) {
      return [];
    }

    const intervals = ['7_days', '14_days', '30_days', '90_days', '180_days', '365_days'];
    return intervals.filter(interval => {
      const dailyKey = `recent_${interval}_days_daily`;
      const cumulativeKey = `recent_${interval}_days_cumulative`;
      return timeSeriesStats[dailyKey] || timeSeriesStats[cumulativeKey];
    });
  }
  
  /**
   * 檢查數據是否為新格式
   */
  isNewFormat(timeSeriesStats: any): boolean {
    if (!timeSeriesStats) {
      return false;
    }

    // 檢查是否有新的累計數據格式（Array）
    const hasNewFormat = Object.keys(timeSeriesStats).some(key => {
      if (key.includes('cumulative')) {
        const data = timeSeriesStats[key];
        return Array.isArray(data) && data.length > 0 && data[0].hasOwnProperty('date');
      }
      return false;
    });

    return hasNewFormat;
  }
  
  /**
   * 獲取時間範圍建議
   */
  getTimeRangeSuggestions(interval: string): { startDate: string; endDate: string } {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (interval) {
      case '7_days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '14_days':
        startDate.setDate(endDate.getDate() - 14);
        break;
      case '30_days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90_days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '180_days':
        startDate.setDate(endDate.getDate() - 180);
        break;
      case '365_days':
        startDate.setDate(endDate.getDate() - 365);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }
}
