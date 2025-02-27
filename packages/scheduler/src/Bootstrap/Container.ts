import * as winston from 'winston'
import Redis from 'ioredis'
import * as AWS from 'aws-sdk'
import { Container } from 'inversify'
import {
  DomainEventHandlerInterface,
  DomainEventMessageHandlerInterface,
  DomainEventSubscriberFactoryInterface,
} from '@standardnotes/domain-events'

import { Env } from './Env'
import TYPES from './Types'
import { AppDataSource } from './DataSource'
import { DomainEventFactory } from '../Domain/Event/DomainEventFactory'
import {
  RedisDomainEventPublisher,
  RedisDomainEventSubscriberFactory,
  RedisEventMessageHandler,
  SNSDomainEventPublisher,
  SQSDomainEventSubscriberFactory,
  SQSEventMessageHandler,
  SQSNewRelicEventMessageHandler,
} from '@standardnotes/domain-events-infra'
import { Timer, TimerInterface } from '@standardnotes/time'
import { PredicateRepositoryInterface } from '../Domain/Predicate/PredicateRepositoryInterface'
import { MySQLPredicateRepository } from '../Infra/MySQL/MySQLPredicateRepository'
import { JobRepositoryInterface } from '../Domain/Job/JobRepositoryInterface'
import { MySQLJobRepository } from '../Infra/MySQL/MySQLJobRepository'
import { Repository } from 'typeorm'
import { Predicate } from '../Domain/Predicate/Predicate'
import { Job } from '../Domain/Job/Job'
import { JobDoneInterpreterInterface } from '../Domain/Job/JobDoneInterpreterInterface'
import { JobDoneInterpreter } from '../Domain/Job/JobDoneInterpreter'
import { UpdatePredicateStatus } from '../Domain/UseCase/UpdatePredicateStatus/UpdatePredicateStatus'
import { PredicateVerifiedEventHandler } from '../Domain/Handler/PredicateVerifiedEventHandler'
import { VerifyPredicates } from '../Domain/UseCase/VerifyPredicates/VerifyPredicates'
import { UserRegisteredEventHandler } from '../Domain/Handler/UserRegisteredEventHandler'
import { SubscriptionCancelledEventHandler } from '../Domain/Handler/SubscriptionCancelledEventHandler'
import { ExitDiscountAppliedEventHandler } from '../Domain/Handler/ExitDiscountAppliedEventHandler'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const newrelicFormatter = require('@newrelic/winston-enricher')

export class ContainerConfigLoader {
  async load(): Promise<Container> {
    const env: Env = new Env()
    env.load()

    const container = new Container()

    await AppDataSource.initialize()

    const redisUrl = env.get('REDIS_URL')
    const isRedisInClusterMode = redisUrl.indexOf(',') > 0
    let redis
    if (isRedisInClusterMode) {
      redis = new Redis.Cluster(redisUrl.split(','))
    } else {
      redis = new Redis(redisUrl)
    }

    container.bind(TYPES.Redis).toConstantValue(redis)

    const newrelicWinstonFormatter = newrelicFormatter(winston)
    const winstonFormatters = [winston.format.splat(), winston.format.json()]
    if (env.get('NEW_RELIC_ENABLED', true) === 'true') {
      winstonFormatters.push(newrelicWinstonFormatter())
    }

    const logger = winston.createLogger({
      level: env.get('LOG_LEVEL') || 'info',
      format: winston.format.combine(...winstonFormatters),
      transports: [new winston.transports.Console({ level: env.get('LOG_LEVEL') || 'info' })],
    })
    container.bind<winston.Logger>(TYPES.Logger).toConstantValue(logger)

    if (env.get('SNS_TOPIC_ARN', true)) {
      const snsConfig: AWS.SNS.Types.ClientConfiguration = {
        apiVersion: 'latest',
        region: env.get('SNS_AWS_REGION', true),
      }
      if (env.get('SNS_ENDPOINT', true)) {
        snsConfig.endpoint = env.get('SNS_ENDPOINT', true)
      }
      if (env.get('SNS_DISABLE_SSL', true) === 'true') {
        snsConfig.sslEnabled = false
      }
      if (env.get('SNS_ACCESS_KEY_ID', true) && env.get('SNS_SECRET_ACCESS_KEY', true)) {
        snsConfig.credentials = {
          accessKeyId: env.get('SNS_ACCESS_KEY_ID', true),
          secretAccessKey: env.get('SNS_SECRET_ACCESS_KEY', true),
        }
      }
      container.bind<AWS.SNS>(TYPES.SNS).toConstantValue(new AWS.SNS(snsConfig))
    }

    if (env.get('SQS_QUEUE_URL', true)) {
      const sqsConfig: AWS.SQS.Types.ClientConfiguration = {
        apiVersion: 'latest',
        region: env.get('SQS_AWS_REGION', true),
      }
      if (env.get('SQS_ACCESS_KEY_ID', true) && env.get('SQS_SECRET_ACCESS_KEY', true)) {
        sqsConfig.credentials = {
          accessKeyId: env.get('SQS_ACCESS_KEY_ID', true),
          secretAccessKey: env.get('SQS_SECRET_ACCESS_KEY', true),
        }
      }
      container.bind<AWS.SQS>(TYPES.SQS).toConstantValue(new AWS.SQS(sqsConfig))
    }

    // env vars
    container.bind(TYPES.REDIS_URL).toConstantValue(env.get('REDIS_URL'))
    container.bind(TYPES.SNS_TOPIC_ARN).toConstantValue(env.get('SNS_TOPIC_ARN', true))
    container.bind(TYPES.SNS_AWS_REGION).toConstantValue(env.get('SNS_AWS_REGION', true))
    container.bind(TYPES.SQS_QUEUE_URL).toConstantValue(env.get('SQS_QUEUE_URL', true))
    container.bind(TYPES.REDIS_EVENTS_CHANNEL).toConstantValue(env.get('REDIS_EVENTS_CHANNEL'))
    container.bind(TYPES.NEW_RELIC_ENABLED).toConstantValue(env.get('NEW_RELIC_ENABLED', true))

    // Repositories
    container.bind<PredicateRepositoryInterface>(TYPES.PredicateRepository).to(MySQLPredicateRepository)
    container.bind<JobRepositoryInterface>(TYPES.JobRepository).to(MySQLJobRepository)

    // ORM
    container
      .bind<Repository<Predicate>>(TYPES.ORMPredicateRepository)
      .toConstantValue(AppDataSource.getRepository(Predicate))
    container.bind<Repository<Job>>(TYPES.ORMJobRepository).toConstantValue(AppDataSource.getRepository(Job))

    // Use Case
    container.bind<UpdatePredicateStatus>(TYPES.UpdatePredicateStatus).to(UpdatePredicateStatus)
    container.bind<VerifyPredicates>(TYPES.VerifyPredicates).to(VerifyPredicates)

    // Hanlders
    container.bind<PredicateVerifiedEventHandler>(TYPES.PredicateVerifiedEventHandler).to(PredicateVerifiedEventHandler)
    container.bind<UserRegisteredEventHandler>(TYPES.UserRegisteredEventHandler).to(UserRegisteredEventHandler)
    container
      .bind<SubscriptionCancelledEventHandler>(TYPES.SubscriptionCancelledEventHandler)
      .to(SubscriptionCancelledEventHandler)
    container
      .bind<ExitDiscountAppliedEventHandler>(TYPES.ExitDiscountAppliedEventHandler)
      .to(ExitDiscountAppliedEventHandler)

    // Services
    container.bind<DomainEventFactory>(TYPES.DomainEventFactory).to(DomainEventFactory)
    container.bind<TimerInterface>(TYPES.Timer).toConstantValue(new Timer())
    container.bind<JobDoneInterpreterInterface>(TYPES.JobDoneInterpreter).to(JobDoneInterpreter)

    if (env.get('SNS_TOPIC_ARN', true)) {
      container
        .bind<SNSDomainEventPublisher>(TYPES.DomainEventPublisher)
        .toConstantValue(new SNSDomainEventPublisher(container.get(TYPES.SNS), container.get(TYPES.SNS_TOPIC_ARN)))
    } else {
      container
        .bind<RedisDomainEventPublisher>(TYPES.DomainEventPublisher)
        .toConstantValue(
          new RedisDomainEventPublisher(container.get(TYPES.Redis), container.get(TYPES.REDIS_EVENTS_CHANNEL)),
        )
    }

    const eventHandlers: Map<string, DomainEventHandlerInterface> = new Map([
      ['PREDICATE_VERIFIED', container.get(TYPES.PredicateVerifiedEventHandler)],
      ['USER_REGISTERED', container.get(TYPES.UserRegisteredEventHandler)],
      ['SUBSCRIPTION_CANCELLED', container.get(TYPES.SubscriptionCancelledEventHandler)],
      ['EXIT_DISCOUNT_APPLIED', container.get(TYPES.ExitDiscountAppliedEventHandler)],
    ])

    if (env.get('SQS_QUEUE_URL', true)) {
      container
        .bind<DomainEventMessageHandlerInterface>(TYPES.DomainEventMessageHandler)
        .toConstantValue(
          env.get('NEW_RELIC_ENABLED', true) === 'true'
            ? new SQSNewRelicEventMessageHandler(eventHandlers, container.get(TYPES.Logger))
            : new SQSEventMessageHandler(eventHandlers, container.get(TYPES.Logger)),
        )
      container
        .bind<DomainEventSubscriberFactoryInterface>(TYPES.DomainEventSubscriberFactory)
        .toConstantValue(
          new SQSDomainEventSubscriberFactory(
            container.get(TYPES.SQS),
            container.get(TYPES.SQS_QUEUE_URL),
            container.get(TYPES.DomainEventMessageHandler),
          ),
        )
    } else {
      container
        .bind<DomainEventMessageHandlerInterface>(TYPES.DomainEventMessageHandler)
        .toConstantValue(new RedisEventMessageHandler(eventHandlers, container.get(TYPES.Logger)))
      container
        .bind<DomainEventSubscriberFactoryInterface>(TYPES.DomainEventSubscriberFactory)
        .toConstantValue(
          new RedisDomainEventSubscriberFactory(
            container.get(TYPES.Redis),
            container.get(TYPES.DomainEventMessageHandler),
            container.get(TYPES.REDIS_EVENTS_CHANNEL),
          ),
        )
    }

    return container
  }
}
