import { WorkspaceAccessLevel, WorkspaceUserStatus } from '@standardnotes/common'
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Workspace } from './Workspace'

@Entity({ name: 'workspace_users' })
@Index('index_workspace_users_on_workspace_and_user', ['userUuid', 'workspaceUuid'], { unique: true })
export class WorkspaceUser {
  @PrimaryGeneratedColumn('uuid')
  declare uuid: string

  @Column({
    name: 'access_level',
    length: 64,
  })
  declare accessLevel: WorkspaceAccessLevel

  @Column({
    name: 'user_uuid',
    length: 36,
  })
  declare userUuid: string

  @Column({
    name: 'user_display_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  declare userDisplayName: string | null

  @Column({
    name: 'workspace_uuid',
    length: 36,
  })
  declare workspaceUuid: string

  @Column({
    name: 'encrypted_workspace_key',
    length: 255,
    type: 'varchar',
    nullable: true,
  })
  declare encryptedWorkspaceKey: string | null

  @Column({
    name: 'public_key',
    length: 255,
    type: 'varchar',
    nullable: true,
  })
  declare publicKey: string | null

  @Column({
    name: 'encrypted_private_key',
    length: 255,
    type: 'varchar',
    nullable: true,
  })
  declare encryptedPrivateKey: string | null

  @Column({
    name: 'status',
    length: 64,
  })
  declare status: WorkspaceUserStatus

  @Column({
    name: 'key_rotation_index',
    default: 0,
  })
  declare keyRotationIndex: number

  @Column({
    name: 'created_at',
    type: 'bigint',
  })
  declare createdAt: number

  @Column({
    name: 'updated_at',
    type: 'bigint',
  })
  declare updatedAt: number

  @ManyToOne(
    /* istanbul ignore next */
    () => Workspace,
    /* istanbul ignore next */
    (workspace) => workspace.users,
    /* istanbul ignore next */
    { onDelete: 'CASCADE' },
  )
  @JoinColumn(
    /* istanbul ignore next */
    { name: 'workspace_uuid' },
  )
  declare workspace: Promise<Workspace>
}
