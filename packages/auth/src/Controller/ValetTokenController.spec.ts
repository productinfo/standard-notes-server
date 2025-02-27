import 'reflect-metadata'

import { Request, Response } from 'express'
import { results } from 'inversify-express-utils'
import { ValetTokenController } from './ValetTokenController'
import { CreateValetToken } from '../Domain/UseCase/CreateValetToken/CreateValetToken'
import { Uuid, ValidatorInterface } from '@standardnotes/common'

describe('ValetTokenController', () => {
  let createValetToken: CreateValetToken
  let uuidValidator: ValidatorInterface<Uuid>
  let request: Request
  let response: Response

  const createController = () => new ValetTokenController(createValetToken, uuidValidator)

  beforeEach(() => {
    createValetToken = {} as jest.Mocked<CreateValetToken>
    createValetToken.execute = jest.fn().mockReturnValue({ success: true, valetToken: 'foobar' })

    uuidValidator = {} as jest.Mocked<ValidatorInterface<Uuid>>
    uuidValidator.validate = jest.fn().mockReturnValue(true)

    request = {
      body: {
        operation: 'write',
        resources: ['1-2-3/2-3-4'],
      },
    } as jest.Mocked<Request>

    response = {
      locals: {},
    } as jest.Mocked<Response>

    response.locals.user = { uuid: '1-2-3' }
  })

  it('should create a valet token', async () => {
    const httpResponse = <results.JsonResult>await createController().create(request, response)
    const result = await httpResponse.executeAsync()

    expect(createValetToken.execute).toHaveBeenCalledWith({
      operation: 'write',
      userUuid: '1-2-3',
      resources: ['1-2-3/2-3-4'],
    })
    expect(await result.content.readAsStringAsync()).toEqual('{"success":true,"valetToken":"foobar"}')
  })

  it('should not create a valet token if the remote resource identifier is not a valid uuid', async () => {
    uuidValidator.validate = jest.fn().mockReturnValue(false)

    const httpResponse = <results.JsonResult>await createController().create(request, response)
    const result = await httpResponse.executeAsync()

    expect(createValetToken.execute).not.toHaveBeenCalled()

    expect(result.statusCode).toEqual(400)
  })

  it('should create a read valet token for read only access session', async () => {
    response.locals.readOnlyAccess = true
    request.body.operation = 'read'

    const httpResponse = <results.JsonResult>await createController().create(request, response)
    const result = await httpResponse.executeAsync()

    expect(createValetToken.execute).toHaveBeenCalledWith({
      operation: 'read',
      userUuid: '1-2-3',
      resources: ['1-2-3/2-3-4'],
    })
    expect(await result.content.readAsStringAsync()).toEqual('{"success":true,"valetToken":"foobar"}')
  })

  it('should not create a write valet token if session has read only access', async () => {
    response.locals.readOnlyAccess = true
    request.body.operation = 'write'

    const httpResponse = <results.JsonResult>await createController().create(request, response)
    const result = await httpResponse.executeAsync()

    expect(createValetToken.execute).not.toHaveBeenCalled()

    expect(result.statusCode).toEqual(401)
  })

  it('should not create a delete valet token if session has read only access', async () => {
    response.locals.readOnlyAccess = true
    request.body.operation = 'delete'

    const httpResponse = <results.JsonResult>await createController().create(request, response)
    const result = await httpResponse.executeAsync()

    expect(createValetToken.execute).not.toHaveBeenCalled()

    expect(result.statusCode).toEqual(401)
  })

  it('should not create a valet token if use case fails', async () => {
    createValetToken.execute = jest.fn().mockReturnValue({ success: false })

    const httpResponse = <results.JsonResult>await createController().create(request, response)
    const result = await httpResponse.executeAsync()

    expect(createValetToken.execute).toHaveBeenCalledWith({
      operation: 'write',
      userUuid: '1-2-3',
      resources: ['1-2-3/2-3-4'],
    })

    expect(await result.content.readAsStringAsync()).toEqual('{"success":false}')
  })
})
