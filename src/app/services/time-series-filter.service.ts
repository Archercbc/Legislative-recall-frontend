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
    console.log('🔍 filterData: 開始篩選數據');
    console.log('🔍 filterData: timeSeriesStats:', timeSeriesStats);
    console.log('🔍 filterData: startDate:', startDate);
    console.log('🔍 filterData: endDate:', endDate);
    console.log('🔍 filterData: dataType:', dataType);
    
    if (!timeSeriesStats || !startDate || !endDate) {
      console.warn('⚠️ filterData: 參數不完整');
      return null;
    }

    const interval = this.getOptimalTimeInterval(startDate, endDate);
    console.log('🔍 filterData: 選擇的時間間隔:', interval);
    
    const dailyKey = `recent_${interval}_days_daily`;
    const cumulativeKey = `recent_${interval}_days_cumulative`;
    
    console.log('🔍 filterData: 查找的鍵:', { dailyKey, cumulativeKey });
    console.log('🔍 filterData: 數據存在檢查:', {
      hasDaily: !!timeSeriesStats[dailyKey],
      hasCumulative: !!timeSeriesStats[cumulativeKey],
      dailyData: timeSeriesStats[dailyKey],
      cumulativeData: timeSeriesStats[cumulativeKey]
    });
    
    // 檢查數據是否存在
    if (!timeSeriesStats[dailyKey] && !timeSeriesStats[cumulativeKey]) {
      console.warn(`⚠️ 找不到時間間隔 ${interval} 的數據`);
      console.warn(`⚠️ 可用的鍵:`, Object.keys(timeSeriesStats));
      return null;
    }
    
    const result: FilteredTimeSeriesData = {
      daily: [],
      cumulative: [],
      interval: interval
    };
    
    if (dataType === 'daily' || dataType === 'both') {
      result.daily = this.filterDailyData(timeSeriesStats[dailyKey], startDate, endDate);
      console.log('🔍 每日數據篩選結果:', result.daily);
    }
    
    if (dataType === 'cumulative' || dataType === 'both') {
      result.cumulative = this.filterCumulativeData(timeSeriesStats[cumulativeKey], startDate, endDate);
      console.log('🔍 累計數據篩選結果:', result.cumulative);
    }
    
    console.log('✅ filterData: 篩選結果:', result);
    return result;
  }
  
  /**
   * 篩選每日數據
   */
  private filterDailyData(dailyStats: any, startDate: string, endDate: string): any[] {
    if (!dailyStats || typeof dailyStats !== 'object') {
      console.log('⚠️ filterDailyData: dailyStats 不是對象或為空');
      return [];
    }

    console.log('🔍 filterDailyData: 輸入參數:', { dailyStats, startDate, endDate });
    console.log('🔍 filterDailyData: dailyStats 類型:', typeof dailyStats);
    console.log('🔍 filterDailyData: dailyStats 鍵:', Object.keys(dailyStats));

         // 檢查是否有 stats_points 數組
     if (dailyStats.stats_points && Array.isArray(dailyStats.stats_points)) {
       console.log('🔍 filterDailyData: 使用 stats_points 數組格式');
       return dailyStats.stats_points
         .filter((item: any) => {
           if (!item.date) {
             console.log('⚠️ 項目缺少 date 字段:', item);
             return false;
           }
           const inRange = item.date >= startDate && item.date <= endDate;
           console.log(`🔍 日期 ${item.date}: ${inRange ? '在範圍內' : '超出範圍'} (${startDate} - ${endDate})`);
           return inRange;
         })
         .sort((a: any, b: any) => a.date.localeCompare(b.date));
     }

    // 舊格式：以日期為鍵的對象
    console.log('🔍 filterDailyData: 使用舊格式（日期鍵）');
    const filtered = Object.keys(dailyStats)
      .filter(key => {
        // 跳過非日期字段
        if (['description', 'stats_points', 'total_comments', 'total_points'].includes(key)) {
          return false;
        }
        const inRange = key >= startDate && key <= endDate;
        console.log(`🔍 日期 ${key}: ${inRange ? '在範圍內' : '超出範圍'} (${startDate} - ${endDate})`);
        return inRange;
      })
      .map(date => ({
        date,
        ...dailyStats[date]
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log('🔍 filterDailyData: 篩選結果:', filtered);
    return filtered;
  }
  
  /**
   * 篩選累計數據
   */
  private filterCumulativeData(cumulativeStats: any, startDate: string, endDate: string): any[] {
    console.log('🔍 filterCumulativeData: 輸入參數:', { cumulativeStats, startDate, endDate });
    console.log('🔍 filterCumulativeData: cumulativeStats 類型:', typeof cumulativeStats);

    // 檢查是否有 stats_points 數組
    if (cumulativeStats.stats_points && Array.isArray(cumulativeStats.stats_points)) {
      console.log('🔍 filterCumulativeData: 使用 stats_points 數組格式');
      console.log('🔍 filterCumulativeData: stats_points 長度:', cumulativeStats.stats_points.length);
      console.log('🔍 filterCumulativeData: 前幾個項目:', cumulativeStats.stats_points.slice(0, 3));

      return cumulativeStats.stats_points
        .filter((item: any) => {
          if (!item.date) {
            console.log('⚠️ 累計項目缺少 date 字段:', item);
            return false;
          }
          const inRange = item.date >= startDate && item.date <= endDate;
          console.log(`🔍 累計項目 ${item.date}: ${inRange ? '在範圍內' : '超出範圍'} (${startDate} - ${endDate})`);
          return inRange;
        })
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
    }

    // 舊格式：直接是數組
    if (Array.isArray(cumulativeStats)) {
      console.log('🔍 filterCumulativeData: 使用舊格式（直接數組）');
      console.log('🔍 filterCumulativeData: cumulativeStats 長度:', cumulativeStats.length);
      console.log('🔍 filterCumulativeData: 前幾個項目:', cumulativeStats.slice(0, 3));

      return cumulativeStats
        .filter((item: any) => {
          const inRange = item.date >= startDate && item.date <= endDate;
          console.log(`🔍 累計項目 ${item.date}: ${inRange ? '在範圍內' : '超出範圍'} (${startDate} - ${endDate})`);
          return inRange;
        })
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
    }

    console.log('⚠️ filterCumulativeData: 無法識別的數據格式');
    return [];
  }
  
  /**
   * 獲取最優時間間隔
   */
  private getOptimalTimeInterval(startDate: string, endDate: string): string {
    const daysDiff = this.calculateDaysDifference(startDate, endDate);
    
    if (daysDiff <= 7) return '7';
    if (daysDiff <= 14) return '14';
    if (daysDiff <= 30) return '30';
    if (daysDiff <= 90) return '90';
    if (daysDiff <= 180) return '180';
    return '365';
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
      console.warn('⚠️ getAvailableIntervals: timeSeriesStats 為空');
      return [];
    }

    console.log('📊 getAvailableIntervals: 檢查數據結構:', timeSeriesStats);
    console.log('📊 getAvailableIntervals: 數據類型:', typeof timeSeriesStats);
    console.log('📊 getAvailableIntervals: 數據鍵:', Object.keys(timeSeriesStats));

    const intervals = ['7_days', '14_days', '30_days', '90_days', '180_days', '365_days'];
    const availableIntervals = intervals.filter(interval => {
      const dailyKey = `recent_${interval}_days_daily`;
      const cumulativeKey = `recent_${interval}_days_cumulative`;
      
      const hasDaily = timeSeriesStats[dailyKey];
      const hasCumulative = timeSeriesStats[cumulativeKey];
      
      // 檢查數據是否有效（有 stats_points 或直接是數組）
      const hasValidDaily = hasDaily && (
        (hasDaily.stats_points && Array.isArray(hasDaily.stats_points) && hasDaily.stats_points.length > 0) ||
        (Array.isArray(hasDaily) && hasDaily.length > 0)
      );
      
      const hasValidCumulative = hasCumulative && (
        (hasCumulative.stats_points && Array.isArray(hasCumulative.stats_points) && hasCumulative.stats_points.length > 0) ||
        (Array.isArray(hasCumulative) && hasCumulative.length > 0)
      );
      
      console.log(`🔍 檢查間隔 ${interval}:`, {
        dailyKey,
        cumulativeKey,
        hasDaily: !!hasDaily,
        hasCumulative: !!hasCumulative,
        hasValidDaily,
        hasValidCumulative,
        dailyData: hasDaily,
        cumulativeData: hasCumulative
      });
      
      return hasValidDaily || hasValidCumulative;
    });

    console.log('✅ getAvailableIntervals: 可用的間隔:', availableIntervals);
    return availableIntervals;
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

  /**
   * 從時間序列數據獲取實際的日期範圍
   */
  getActualTimeRange(timeSeriesStats: any, interval: string): { startDate: string; endDate: string } | null {
    if (!timeSeriesStats) {
      return null;
    }

    const dailyKey = `recent_${interval}_days_daily`;
    const cumulativeKey = `recent_${interval}_days_cumulative`;
    
    // 優先使用累計數據
    const data = timeSeriesStats[cumulativeKey] || timeSeriesStats[dailyKey];
    
    if (!data) {
      return null;
    }

    // 檢查是否有 stats_points 數組
    if (data.stats_points && Array.isArray(data.stats_points) && data.stats_points.length > 0) {
      console.log('🔍 getActualTimeRange: 使用 stats_points 數組格式');
      const dates = data.stats_points.map((item: any) => item.date).sort();
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      return { startDate, endDate };
    }

    // 舊格式：直接是數組
    if (Array.isArray(data) && data.length > 0) {
      console.log('🔍 getActualTimeRange: 使用舊格式（直接數組）');
      const dates = data.map((item: any) => item.date).sort();
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      return { startDate, endDate };
    }

    console.log('⚠️ getActualTimeRange: 無法識別的數據格式');
    return null;
  }
}
