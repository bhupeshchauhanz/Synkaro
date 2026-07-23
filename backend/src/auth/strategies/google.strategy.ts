import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfilePayload {
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    const clientId = config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars are required');
    }
    super({
      clientID: clientId,
      clientSecret,
      callbackURL:
        config.get<string>('GOOGLE_CALLBACK_URL') ??
        'http://localhost:3001/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('No email returned from Google'), false);
      return;
    }
    const payload: GoogleProfilePayload = {
      googleId: profile.id,
      email,
      name: profile.displayName ?? email.split('@')[0],
      picture: profile.photos?.[0]?.value ?? null,
    };
    done(null, payload);
  }
}
