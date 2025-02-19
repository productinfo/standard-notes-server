import { SubscriptionBillingFrequency, SubscriptionName } from '@standardnotes/common'
import { inject, injectable } from 'inversify'
import { Result } from '@standardnotes/domain-core'

import TYPES from '../../../Bootstrap/Types'
import { MonthlyRevenue } from '../../Revenue/MonthlyRevenue'
import { RevenueModificationRepositoryInterface } from '../../Revenue/RevenueModificationRepositoryInterface'
import { StatisticsMeasure } from '../../Statistics/StatisticsMeasure'
import { StatisticsStoreInterface } from '../../Statistics/StatisticsStoreInterface'
import { Period } from '../../Time/Period'
import { DomainUseCaseInterface } from '../DomainUseCaseInterface'
import { CalculateMonthlyRecurringRevenueDTO } from './CalculateMonthlyRecurringRevenueDTO'

@injectable()
export class CalculateMonthlyRecurringRevenue implements DomainUseCaseInterface<MonthlyRevenue> {
  constructor(
    @inject(TYPES.RevenueModificationRepository)
    private revenueModificationRepository: RevenueModificationRepositoryInterface,
    @inject(TYPES.StatisticsStore) private statisticsStore: StatisticsStoreInterface,
  ) {}

  async execute(_dto: CalculateMonthlyRecurringRevenueDTO): Promise<Result<MonthlyRevenue>> {
    const mrrDiff = await this.revenueModificationRepository.sumMRRDiff({
      billingFrequencies: [SubscriptionBillingFrequency.Annual, SubscriptionBillingFrequency.Monthly],
    })

    await this.statisticsStore.setMeasure(StatisticsMeasure.MRR, mrrDiff, [
      Period.Today,
      Period.ThisMonth,
      Period.ThisYear,
    ])

    const monthlyPlansMrrDiff = await this.revenueModificationRepository.sumMRRDiff({
      billingFrequencies: [SubscriptionBillingFrequency.Monthly],
    })

    await this.statisticsStore.setMeasure(StatisticsMeasure.MonthlyPlansMRR, monthlyPlansMrrDiff, [
      Period.Today,
      Period.ThisMonth,
      Period.ThisYear,
    ])

    const annualPlansMrrDiff = await this.revenueModificationRepository.sumMRRDiff({
      billingFrequencies: [SubscriptionBillingFrequency.Annual],
    })

    await this.statisticsStore.setMeasure(StatisticsMeasure.AnnualPlansMRR, annualPlansMrrDiff, [
      Period.Today,
      Period.ThisMonth,
      Period.ThisYear,
    ])

    const fiveYearPlansMrrDiff = await this.revenueModificationRepository.sumMRRDiff({
      billingFrequencies: [SubscriptionBillingFrequency.FiveYear],
    })

    await this.statisticsStore.setMeasure(StatisticsMeasure.FiveYearPlansMRR, fiveYearPlansMrrDiff, [
      Period.Today,
      Period.ThisMonth,
      Period.ThisYear,
    ])

    const proPlansMrrDiff = await this.revenueModificationRepository.sumMRRDiff({
      planNames: [SubscriptionName.ProPlan],
      billingFrequencies: [SubscriptionBillingFrequency.Annual, SubscriptionBillingFrequency.Monthly],
    })

    await this.statisticsStore.setMeasure(StatisticsMeasure.ProPlansMRR, proPlansMrrDiff, [
      Period.Today,
      Period.ThisMonth,
      Period.ThisYear,
    ])

    const plusPlansMrrDiff = await this.revenueModificationRepository.sumMRRDiff({
      planNames: [SubscriptionName.PlusPlan],
      billingFrequencies: [SubscriptionBillingFrequency.Annual, SubscriptionBillingFrequency.Monthly],
    })

    await this.statisticsStore.setMeasure(StatisticsMeasure.PlusPlansMRR, plusPlansMrrDiff, [
      Period.Today,
      Period.ThisMonth,
      Period.ThisYear,
    ])

    return MonthlyRevenue.create(mrrDiff)
  }
}
