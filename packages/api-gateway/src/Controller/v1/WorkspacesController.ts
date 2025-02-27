import { inject } from 'inversify'
import { Request, Response } from 'express'
import { controller, BaseHttpController, httpPost, httpGet } from 'inversify-express-utils'

import TYPES from '../../Bootstrap/Types'
import { HttpServiceInterface } from '../../Service/Http/HttpServiceInterface'

@controller('/v1/workspaces', TYPES.AuthMiddleware)
export class WorkspacesController extends BaseHttpController {
  constructor(@inject(TYPES.HTTPService) private httpService: HttpServiceInterface) {
    super()
  }

  @httpPost('/')
  async create(request: Request, response: Response): Promise<void> {
    await this.httpService.callWorkspaceServer(request, response, 'workspaces', request.body)
  }

  @httpGet('/:workspaceUuid/users')
  async listWorkspaceUsers(request: Request, response: Response): Promise<void> {
    await this.httpService.callWorkspaceServer(
      request,
      response,
      `workspaces/${request.params.workspaceUuid}/users`,
      request.body,
    )
  }

  @httpPost('/:workspaceUuid/users/:userUuid/keyshare')
  async initiateKeyshare(request: Request, response: Response): Promise<void> {
    await this.httpService.callWorkspaceServer(
      request,
      response,
      `workspaces/${request.params.workspaceUuid}/users/${request.params.userUuid}/keyshare`,
      request.body,
    )
  }

  @httpGet('/')
  async listWorkspaces(request: Request, response: Response): Promise<void> {
    await this.httpService.callWorkspaceServer(request, response, 'workspaces', request.body)
  }

  @httpPost('/:workspaceUuid/invites')
  async invite(request: Request, response: Response): Promise<void> {
    await this.httpService.callWorkspaceServer(
      request,
      response,
      `workspaces/${request.params.workspaceUuid}/invites`,
      request.body,
    )
  }
}
