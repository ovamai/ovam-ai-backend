declare module 'passport-bitbucket-oauth2' {
  import {
    Strategy as OAuth2Strategy,
    StrategyOptions,
    VerifyFunction,
  } from 'passport-oauth2';
  import { Request } from 'express';

  export interface Profile {
    id: string;
    username: string;
    displayName: string;
    emails: { value: string }[];
    _raw: string;
    _json: any;
  }

  export class Strategy extends OAuth2Strategy {
    constructor(
      options: StrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyFunction,
      ) => void,
    );
  }
}
