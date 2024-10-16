import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {

    constructor(private jwtService: JwtService) { }

    async signIn(username: string, pass: string): Promise<any> {
        const user = { username: process.env.USERNAME, password: process.env.PASSWORD }

        if (user.username !== username) {
            throw new UnauthorizedException();
        }

        if (await bcrypt.compare(pass, user.password) === false) {
            throw new UnauthorizedException();
        }

        const payload = { username: user.username };
        return await this.jwtService.signAsync(payload)

    }

}
