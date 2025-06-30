declare module 'passport-azure-ad-oauth2' {
  import { Request } from 'express';
  import passport = require('passport');

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    tenant?: string;
  }

  export type VerifyCallback = (
    accessToken: string,
    refreshToken: string,
    params: any,
    profile: any,
    done: (error: any, user?: any) => void
  ) => void;

  export class Strategy extends passport.Strategy {
    constructor(options: StrategyOptions, verify: VerifyCallback);
    name: string;
    authenticate(req: Request, options?: object): void;
  }
}

declare module 'passport-bitbucket-oauth2' {
  import passport = require('passport');

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
  }

  export type VerifyCallback = (
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void
  ) => void;

  export class Strategy extends passport.Strategy {
    constructor(options: StrategyOptions, verify: VerifyCallback);
    name: string;
    authenticate(req: any, options?: any): void;
  }
}

declare module 'passport-github2' {
  import passport = require('passport');

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
  }

  export interface StrategyOptionsWithRequest extends StrategyOptions {
    passReqToCallback: true;
  }

  export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void
  ) => void;

  export type VerifyFunctionWithRequest = (
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void
  ) => void;

  export class Strategy extends passport.Strategy {
    constructor(options: StrategyOptions, verify: VerifyFunction);
    constructor(
      options: StrategyOptionsWithRequest,
      verify: VerifyFunctionWithRequest
    );
    name: string;
    authenticate(req: any, options?: object): void;
  }
}

declare module 'passport-gitlab2' {
  import passport = require('passport');

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
  }

  export interface Profile {
    id: string;
    displayName: string;
    username: string;
    emails?: { value: string }[];
    avatarUrl?: string;
    _raw: string;
    _json: any;
  }

  export type VerifyCallback = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void
  ) => void;

  export class Strategy extends passport.Strategy {
    constructor(options: StrategyOptions, verify: VerifyCallback);
    name: string;
    authenticate(req: any, options?: any): void;
  }
}
