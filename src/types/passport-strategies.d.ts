declare module 'passport-azure-ad-oauth2';
declare module 'passport-bitbucket-oauth2';
declare module 'passport-gitlab2' {
  import { Request } from 'express';
  import { Strategy as OAuth2Strategy } from 'passport-oauth2';

  export interface GitLabStrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
  }

  export interface GitLabStrategyOptionsWithRequest
    extends GitLabStrategyOptions {
    passReqToCallback: true;
  }

  export class Strategy extends OAuth2Strategy {
    constructor(
      options: GitLabStrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: (error: any, user?: any, info?: any) => void,
      ) => void,
    );
    constructor(
      options: GitLabStrategyOptionsWithRequest,
      verify: (
        req: Request,
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: (error: any, user?: any, info?: any) => void,
      ) => void,
    );
  }
}
