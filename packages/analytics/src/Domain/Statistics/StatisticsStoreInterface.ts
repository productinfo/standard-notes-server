import { Period } from '../Time/Period'
import { StatisticsMeasure } from './StatisticsMeasure'

export interface StatisticsStoreInterface {
  incrementSNJSVersionUsage(snjsVersion: string): Promise<void>
  incrementApplicationVersionUsage(applicationVersion: string): Promise<void>
  incrementOutOfSyncIncidents(): Promise<void>
  getYesterdaySNJSUsage(): Promise<Array<{ version: string; count: number }>>
  getYesterdayApplicationUsage(): Promise<Array<{ version: string; count: number }>>
  getYesterdayOutOfSyncIncidents(): Promise<number>
  incrementMeasure(measure: StatisticsMeasure, value: number, periods: Period[]): Promise<void>
  setMeasure(measure: StatisticsMeasure, value: number, periods: Period[]): Promise<void>
  getMeasureAverage(measure: StatisticsMeasure, period: Period): Promise<number>
  getMeasureTotal(measure: StatisticsMeasure, periodOrPeriodKey: Period | string): Promise<number>
  getMeasureIncrementCounts(measure: StatisticsMeasure, period: Period): Promise<number>
  calculateTotalCountOverPeriod(
    measure: StatisticsMeasure,
    period: Period,
  ): Promise<Array<{ periodKey: string; totalCount: number }>>
}
