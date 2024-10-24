import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';

@Controller()
export class AuthController {

    constructor(private authService: AuthService) {}

    @HttpCode(HttpStatus.OK)
    @Post('login')
    async signIn(@Body() signInDto: Record<string, any>, @Res() res: Response) {
      const jwt = await this.authService.signIn(signInDto.username, signInDto.password);

      var date = new Date();
      date.setDate(date.getDate() + 30);

      res.cookie("auth-cookie", jwt, {expires: date})
      res.redirect("/")
    }

    @HttpCode(HttpStatus.OK)
    @Get('logout')
    async logout(@Res() res: Response) {
      res.clearCookie("auth-cookie");
      res.redirect("/")
    }

    @HttpCode(HttpStatus.OK)
    @Get('login')
    getSignIn(@Res() res: Response) {
        res.render("login")
    }
}
