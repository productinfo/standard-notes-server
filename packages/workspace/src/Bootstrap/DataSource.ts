import { DataSource, LoggerOptions } from 'typeorm'
import { WorkspaceInvite } from '../Domain/Invite/WorkspaceInvite'
import { Workspace } from '../Domain/Workspace/Workspace'
import { WorkspaceUser } from '../Domain/Workspace/WorkspaceUser'
import { Env } from './Env'

const env: Env = new Env()
env.load()

const maxQueryExecutionTime = env.get('DB_MAX_QUERY_EXECUTION_TIME', true)
  ? +env.get('DB_MAX_QUERY_EXECUTION_TIME', true)
  : 45_000

export const AppDataSource = new DataSource({
  type: 'mysql',
  charset: 'utf8mb4',
  supportBigNumbers: true,
  bigNumberStrings: false,
  maxQueryExecutionTime,
  replication: {
    master: {
      host: env.get('DB_HOST'),
      port: parseInt(env.get('DB_PORT')),
      username: env.get('DB_USERNAME'),
      password: env.get('DB_PASSWORD'),
      database: env.get('DB_DATABASE'),
    },
    slaves: [
      {
        host: env.get('DB_REPLICA_HOST'),
        port: parseInt(env.get('DB_PORT')),
        username: env.get('DB_USERNAME'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
    ],
    removeNodeErrorCount: 10,
  },
  entities: [Workspace, WorkspaceUser, WorkspaceInvite],
  migrations: [env.get('DB_MIGRATIONS_PATH', true) ?? 'dist/migrations/*.js'],
  migrationsRun: true,
  logging: <LoggerOptions>env.get('DB_DEBUG_LEVEL'),
})
