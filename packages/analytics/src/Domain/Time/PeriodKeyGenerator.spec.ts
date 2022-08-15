import { Period } from './Period'
import { PeriodKeyGenerator } from './PeriodKeyGenerator'

describe('PeriodKeyGenerator', () => {
  const createGenerator = () => new PeriodKeyGenerator()

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(1653395155000)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should generate period keys for last 30 days', () => {
    expect(createGenerator().getDiscretePeriodKeys(Period.Last30Days)).toEqual([
      '2022-4-24',
      '2022-4-25',
      '2022-4-26',
      '2022-4-27',
      '2022-4-28',
      '2022-4-29',
      '2022-4-30',
      '2022-5-1',
      '2022-5-2',
      '2022-5-3',
      '2022-5-4',
      '2022-5-5',
      '2022-5-6',
      '2022-5-7',
      '2022-5-8',
      '2022-5-9',
      '2022-5-10',
      '2022-5-11',
      '2022-5-12',
      '2022-5-13',
      '2022-5-14',
      '2022-5-15',
      '2022-5-16',
      '2022-5-17',
      '2022-5-18',
      '2022-5-19',
      '2022-5-20',
      '2022-5-21',
      '2022-5-22',
      '2022-5-23',
    ])
  })

  it('should generate period keys for Q1', () => {
    expect(createGenerator().getDiscretePeriodKeys(Period.Q1ThisYear)).toEqual(['2022-1', '2022-2', '2022-3'])
  })

  it('should generate period keys for Q2', () => {
    expect(createGenerator().getDiscretePeriodKeys(Period.Q2ThisYear)).toEqual(['2022-4', '2022-5', '2022-6'])
  })

  it('should generate period keys for Q3', () => {
    expect(createGenerator().getDiscretePeriodKeys(Period.Q3ThisYear)).toEqual(['2022-7', '2022-8', '2022-9'])
  })

  it('should generate period keys for Q4', () => {
    expect(createGenerator().getDiscretePeriodKeys(Period.Q4ThisYear)).toEqual(['2022-10', '2022-11', '2022-12'])
  })

  it('should generate a period key for today', () => {
    expect(createGenerator().getPeriodKey(Period.Today)).toEqual('2022-5-24')
  })

  it('should generate a period key for yesterday', () => {
    expect(createGenerator().getPeriodKey(Period.Yesterday)).toEqual('2022-5-23')
  })

  it('should generate a period key for the day before yesterday', () => {
    expect(createGenerator().getPeriodKey(Period.DayBeforeYesterday)).toEqual('2022-5-22')
  })

  it('should generate a period key for this week', () => {
    expect(createGenerator().getPeriodKey(Period.ThisWeek)).toEqual('2022-week-21')
  })

  it('should generate a period key for last week', () => {
    expect(createGenerator().getPeriodKey(Period.LastWeek)).toEqual('2022-week-20')
  })

  it('should generate a period key for the week before last week', () => {
    expect(createGenerator().getPeriodKey(Period.WeekBeforeLastWeek)).toEqual('2022-week-19')
  })

  it('should generate a period key for this month', () => {
    expect(createGenerator().getPeriodKey(Period.ThisMonth)).toEqual('2022-5')
  })

  it('should generate a period key for last month', () => {
    expect(createGenerator().getPeriodKey(Period.LastMonth)).toEqual('2022-4')
  })

  it('should throw error on unsupported period', () => {
    let error = null
    try {
      createGenerator().getPeriodKey(42 as Period)
    } catch (caughtError) {
      error = caughtError
    }

    expect(error).not.toBeNull()
  })

  it('should throw error on unsupported period for discrete generation', () => {
    let error = null
    try {
      createGenerator().getDiscretePeriodKeys(Period.Today)
    } catch (caughtError) {
      error = caughtError
    }

    expect(error).not.toBeNull()
  })
})
