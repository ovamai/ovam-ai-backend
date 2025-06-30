import passport from "passport";
const AzureOAuth2 = require("passport-azure-ad-oauth2");
import * as graph from "@microsoft/microsoft-graph-client";
import User from "../models/User";

const AzureStrategy = AzureOAuth2.Strategy;

passport.use(
  new AzureStrategy(
    {
      clientID: process.env.AZURE_CLIENT_ID as string,
      clientSecret: process.env.AZURE_CLIENT_SECRET as string,
      callbackURL: `${process.env.BASE_URL}/auth/azure/callback`,
      tenant: "common",
    },
    async (
      accessToken: string,
      refreshToken: string,
      params: any,
      profile: any,
      done: (error: any, user?: Express.User | false | null) => void
    ) => {
      try {
        const client = graph.Client.init({
          authProvider: (doneFn) => doneFn(null, accessToken),
        });

        const me = await client.api("/me").get();
        const email = me.mail || me.userPrincipalName;

        let user = await User.findOne({
          provider: "azure",
          providerId: me.id,
        });

        if (!user) {
          user = await User.create({
            provider: "azure",
            providerId: me.id,
            name: me.displayName,
            email,
            avatar: null,
          });
        }

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);
