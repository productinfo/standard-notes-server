import 'reflect-metadata'

import 'newrelic'

import { Logger } from 'winston'

import { EmailLevel } from '@standardnotes/domain-core'
import { DomainEventPublisherInterface } from '@standardnotes/domain-events'
import { AnalyticsActivity } from '../src/Domain/Analytics/AnalyticsActivity'
import { Period } from '../src/Domain/Time/Period'
import { StatisticsMeasure } from '../src/Domain/Statistics/StatisticsMeasure'
import { AnalyticsStoreInterface } from '../src/Domain/Analytics/AnalyticsStoreInterface'
import { StatisticsStoreInterface } from '../src/Domain/Statistics/StatisticsStoreInterface'
import { PeriodKeyGeneratorInterface } from '../src/Domain/Time/PeriodKeyGeneratorInterface'
import { ContainerConfigLoader } from '../src/Bootstrap/Container'
import TYPES from '../src/Bootstrap/Types'
import { Env } from '../src/Bootstrap/Env'
import { DomainEventFactoryInterface } from '../src/Domain/Event/DomainEventFactoryInterface'
import { CalculateMonthlyRecurringRevenue } from '../src/Domain/UseCase/CalculateMonthlyRecurringRevenue/CalculateMonthlyRecurringRevenue'
import { getBody, getSubject } from '../src/Domain/Email/DailyAnalyticsReport'
import { TimerInterface } from '@standardnotes/time'

const requestReport = async (
  analyticsStore: AnalyticsStoreInterface,
  statisticsStore: StatisticsStoreInterface,
  domainEventFactory: DomainEventFactoryInterface,
  domainEventPublisher: DomainEventPublisherInterface,
  periodKeyGenerator: PeriodKeyGeneratorInterface,
  calculateMonthlyRecurringRevenue: CalculateMonthlyRecurringRevenue,
  timer: TimerInterface,
  adminEmails: string[],
): Promise<void> => {
  await calculateMonthlyRecurringRevenue.execute({})

  const analyticsOverTime: Array<{
    name: string
    period: number
    counts: Array<{
      periodKey: string
      totalCount: number
    }>
    totalCount: number
  }> = []

  const thirtyDaysAnalyticsNames = [
    AnalyticsActivity.SubscriptionPurchased,
    AnalyticsActivity.Register,
    AnalyticsActivity.SubscriptionRenewed,
    AnalyticsActivity.DeleteAccount,
    AnalyticsActivity.SubscriptionCancelled,
    AnalyticsActivity.SubscriptionRefunded,
    AnalyticsActivity.ExistingCustomersChurn,
    AnalyticsActivity.NewCustomersChurn,
    AnalyticsActivity.SubscriptionReactivated,
  ]

  for (const analyticsName of thirtyDaysAnalyticsNames) {
    analyticsOverTime.push({
      name: analyticsName,
      period: Period.Last30Days,
      counts: await analyticsStore.calculateActivityChangesTotalCount(analyticsName, Period.Last30Days),
      totalCount: await analyticsStore.calculateActivityTotalCountOverTime(analyticsName, Period.Last30Days),
    })
  }

  const quarterlyAnalyticsNames = [
    AnalyticsActivity.Register,
    AnalyticsActivity.SubscriptionPurchased,
    AnalyticsActivity.SubscriptionRenewed,
  ]

  for (const analyticsName of quarterlyAnalyticsNames) {
    for (const period of [Period.Q1ThisYear, Period.Q2ThisYear, Period.Q3ThisYear, Period.Q4ThisYear]) {
      analyticsOverTime.push({
        name: analyticsName,
        period: period,
        counts: await analyticsStore.calculateActivityChangesTotalCount(analyticsName, period),
        totalCount: await analyticsStore.calculateActivityTotalCountOverTime(analyticsName, period),
      })
    }
  }

  const yesterdayActivityStatistics: Array<{
    name: string
    retention: number
    totalCount: number
  }> = []
  const yesterdayActivityNames = [
    AnalyticsActivity.LimitedDiscountOfferPurchased,
    AnalyticsActivity.PaymentFailed,
    AnalyticsActivity.PaymentSuccess,
    AnalyticsActivity.NewCustomersChurn,
    AnalyticsActivity.ExistingCustomersChurn,
  ]

  for (const activityName of yesterdayActivityNames) {
    yesterdayActivityStatistics.push({
      name: activityName,
      retention: await analyticsStore.calculateActivityRetention(
        activityName,
        Period.DayBeforeYesterday,
        Period.Yesterday,
      ),
      totalCount: await analyticsStore.calculateActivityTotalCount(activityName, Period.Yesterday),
    })
  }

  const statisticsOverTime: Array<{
    name: string
    period: number
    counts: Array<{
      periodKey: string
      totalCount: number
    }>
  }> = []

  const thirtyDaysStatisticsNames = [
    StatisticsMeasure.MRR,
    StatisticsMeasure.AnnualPlansMRR,
    StatisticsMeasure.MonthlyPlansMRR,
    StatisticsMeasure.FiveYearPlansMRR,
    StatisticsMeasure.PlusPlansMRR,
    StatisticsMeasure.ProPlansMRR,
  ]
  for (const statisticName of thirtyDaysStatisticsNames) {
    statisticsOverTime.push({
      name: statisticName,
      period: Period.Last30DaysIncludingToday,
      counts: await statisticsStore.calculateTotalCountOverPeriod(statisticName, Period.Last30DaysIncludingToday),
    })
  }

  const monthlyStatisticsNames = [StatisticsMeasure.MRR]
  for (const statisticName of monthlyStatisticsNames) {
    statisticsOverTime.push({
      name: statisticName,
      period: Period.ThisYear,
      counts: await statisticsStore.calculateTotalCountOverPeriod(statisticName, Period.ThisYear),
    })
  }

  const statisticMeasureNames = [
    StatisticsMeasure.Income,
    StatisticsMeasure.PlusSubscriptionInitialAnnualPaymentsIncome,
    StatisticsMeasure.PlusSubscriptionInitialMonthlyPaymentsIncome,
    StatisticsMeasure.PlusSubscriptionRenewingAnnualPaymentsIncome,
    StatisticsMeasure.PlusSubscriptionRenewingMonthlyPaymentsIncome,
    StatisticsMeasure.ProSubscriptionInitialAnnualPaymentsIncome,
    StatisticsMeasure.ProSubscriptionInitialMonthlyPaymentsIncome,
    StatisticsMeasure.ProSubscriptionRenewingAnnualPaymentsIncome,
    StatisticsMeasure.ProSubscriptionRenewingMonthlyPaymentsIncome,
    StatisticsMeasure.Refunds,
    StatisticsMeasure.RegistrationLength,
    StatisticsMeasure.SubscriptionLength,
    StatisticsMeasure.RegistrationToSubscriptionTime,
    StatisticsMeasure.RemainingSubscriptionTimePercentage,
    StatisticsMeasure.NewCustomers,
    StatisticsMeasure.TotalCustomers,
  ]
  const statisticMeasures: Array<{
    name: string
    totalValue: number
    average: number
    increments: number
    period: number
  }> = []
  for (const statisticMeasureName of statisticMeasureNames) {
    for (const period of [Period.Yesterday, Period.ThisMonth]) {
      statisticMeasures.push({
        name: statisticMeasureName,
        period,
        totalValue: await statisticsStore.getMeasureTotal(statisticMeasureName, period),
        average: await statisticsStore.getMeasureAverage(statisticMeasureName, period),
        increments: await statisticsStore.getMeasureIncrementCounts(statisticMeasureName, period),
      })
    }
  }

  const monthlyPeriodKeys = periodKeyGenerator.getDiscretePeriodKeys(Period.ThisYear)
  const churnRates: Array<{
    rate: number
    periodKey: string
    averageCustomersCount: number
    existingCustomersChurn: number
    newCustomersChurn: number
  }> = []
  for (const monthPeriodKey of monthlyPeriodKeys) {
    const monthPeriod = periodKeyGenerator.convertPeriodKeyToPeriod(monthPeriodKey)
    const dailyPeriodKeys = periodKeyGenerator.getDiscretePeriodKeys(monthPeriod)

    const totalCustomerCounts: Array<number> = []
    for (const dailyPeriodKey of dailyPeriodKeys) {
      const customersCount = await statisticsStore.getMeasureTotal(StatisticsMeasure.TotalCustomers, dailyPeriodKey)
      totalCustomerCounts.push(customersCount)
    }
    const filteredTotalCustomerCounts = totalCustomerCounts.filter((count) => !!count)
    const averageCustomersCount = filteredTotalCustomerCounts.length
      ? filteredTotalCustomerCounts.reduce((total, current) => total + current, 0) / filteredTotalCustomerCounts.length
      : 0

    const existingCustomersChurn = await analyticsStore.calculateActivityTotalCount(
      AnalyticsActivity.ExistingCustomersChurn,
      monthPeriodKey,
    )
    const newCustomersChurn = await analyticsStore.calculateActivityTotalCount(
      AnalyticsActivity.NewCustomersChurn,
      monthPeriodKey,
    )

    const totalChurn = existingCustomersChurn + newCustomersChurn

    churnRates.push({
      periodKey: monthPeriodKey,
      rate: averageCustomersCount ? (totalChurn / averageCustomersCount) * 100 : 0,
      averageCustomersCount,
      existingCustomersChurn,
      newCustomersChurn,
    })
  }

  for (const adminEmail of adminEmails) {
    const event = domainEventFactory.createEmailRequestedEvent({
      messageIdentifier: 'VERSION_ADOPTION_REPORT',
      subject: getSubject(),
      body: getBody(
        {
          activityStatistics: yesterdayActivityStatistics,
          activityStatisticsOverTime: analyticsOverTime,
          statisticsOverTime,
          statisticMeasures,
          churn: {
            periodKeys: monthlyPeriodKeys,
            values: churnRates,
          },
        },
        timer,
      ),
      level: EmailLevel.LEVELS.System,
      userEmail: adminEmail,
    })
    await domainEventPublisher.publish(event)
  }
}

const container = new ContainerConfigLoader()
void container.load().then((container) => {
  const env: Env = new Env()
  env.load()

  const logger: Logger = container.get(TYPES.Logger)

  logger.info('Starting usage report generation...')

  const analyticsStore: AnalyticsStoreInterface = container.get(TYPES.AnalyticsStore)
  const statisticsStore: StatisticsStoreInterface = container.get(TYPES.StatisticsStore)
  const domainEventFactory: DomainEventFactoryInterface = container.get(TYPES.DomainEventFactory)
  const domainEventPublisher: DomainEventPublisherInterface = container.get(TYPES.DomainEventPublisher)
  const periodKeyGenerator: PeriodKeyGeneratorInterface = container.get(TYPES.PeriodKeyGenerator)
  const timer: TimerInterface = container.get(TYPES.Timer)
  const calculateMonthlyRecurringRevenue: CalculateMonthlyRecurringRevenue = container.get(
    TYPES.CalculateMonthlyRecurringRevenue,
  )

  Promise.resolve(
    requestReport(
      analyticsStore,
      statisticsStore,
      domainEventFactory,
      domainEventPublisher,
      periodKeyGenerator,
      calculateMonthlyRecurringRevenue,
      timer,
      container.get(TYPES.ADMIN_EMAILS),
    ),
  )
    .then(() => {
      logger.info('Usage report generation complete')

      process.exit(0)
    })
    .catch((error) => {
      logger.error(`Could not finish usage report generation: ${error.message}`)

      process.exit(1)
    })
})
