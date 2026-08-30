import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET') || 'dev-secret',
    });
  }

  async validate(payload: any) {
    // Re-check the account on every authenticated request. This means disabling
    // a teacher/admin takes effect immediately instead of waiting for an old
    // 12-hour JWT to expire. It also refreshes the role/name from the database.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is disabled or no longer exists');
    }

    return {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    };
  }
}
