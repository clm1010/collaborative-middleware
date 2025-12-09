import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'
import { UsersService } from './users.service'
import { successResponse, errorResponse } from '../common/response.interface'

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name)

  constructor(private readonly usersService: UsersService) {}

  /**
   * 权限校验接口
   * 代理调用 Java 后端: /api/users/getPermissionCheck
   * @param id 文档ID
   * @param userId 用户ID
   */
  @Post('getPermissionCheck')
  async getPermissionCheck(
    @Body() body: { id: string; userId: string },
  ) {
    const { id, userId } = body
    this.logger.log(`权限校验请求: id=${id}, userId=${userId}`)

    if (!id || !userId) {
      throw new HttpException(
        errorResponse('缺少必要参数: id 或 userId', 400),
        HttpStatus.BAD_REQUEST,
      )
    }

    try {
      const result = await this.usersService.checkPermission(id, userId)
      this.logger.log(`权限校验结果: ${JSON.stringify(result)}`)
      return result
    } catch (error) {
      this.logger.error(`权限校验失败: ${error.message}`)
      // 返回无权限
      return {
        code: 200,
        data: false,
        status: 500,
        msg: '权限校验失败',
      }
    }
  }

  /**
   * 获取文件流接口
   * 代理调用 Java 后端: /api/users/getfileStream
   * @param id 文档ID
   * @param res Express Response 对象
   */
  @Get('getfileStream')
  async getFileStream(@Query('id') id: number, @Res() res: Response) {
    this.logger.log(`获取文件流请求: id=${id}`)

    if (!id) {
      res.status(HttpStatus.BAD_REQUEST).json(errorResponse('缺少必要参数: id', 400))
      return
    }

    try {
      const result = await this.usersService.getFileStream(id)

      if (result.hasData && result.data) {
        // 有文件流数据，返回二进制
        this.logger.log(`返回文件流数据, 大小: ${result.data.length} bytes`)
        res.set({
          'Content-Type': result.contentType || 'application/octet-stream',
          'Content-Length': result.data.length,
          'Content-Disposition': `attachment; filename="document_${id}"`,
        })
        res.send(result.data)
      } else {
        // 无文件流数据
        this.logger.log('无文件流数据，返回空响应')
        res.json(successResponse(null, '无文件内容'))
      }
    } catch (error) {
      this.logger.error(`获取文件流失败: ${error.message}`)
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
        errorResponse('获取文件流失败: ' + error.message, 500),
      )
    }
  }
}
