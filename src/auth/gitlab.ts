// import passport from 'passport';
// import { Strategy as GitLabStrategy } from 'passport-gitlab2';
// import axios from 'axios';
// import User, { IUser } from '../models/User'; // Make sure User model exports IUser interface
// import { VerifyCallback } from 'passport-oauth2';

// // ✅ Safe and valid to define manually
// interface Profile {
//   id?: string;
//   displayName?: string;
//   emails?: { value: string }[];
//   username?: string;
// }

// interface GitLabUserResponse {
//   id: number;
//   name: string;
//   username: string;
//   avatar_url: string;
//   [key: string]: any;
// }

// passport.use(
//   new GitLabStrategy(
//     {
//       clientID: process.env.GITLAB_CLIENT_ID!,
//       clientSecret: process.env.GITLAB_CLIENT_SECRET!,
//       callbackURL: `${process.env.BASE_URL}/auth/gitlab/callback`,
//     },
//     async (
//       accessToken: string,
//       refreshToken: string,
//       profile: Profile,
//       done: VerifyCallback,
//     ) => {
//       try {
//         const { data } = await axios.get<GitLabUserResponse>(
//           'https://gitlab.com/api/v4/user',
//           {
//             headers: { Authorization: `Bearer ${accessToken}` },
//           },
//         );

//         if (!data || !data.id) return done(null, false);

//         let user: IUser | null = await User.findOne({
//           provider: 'gitlab',
//           providerId: data.id,
//         });

//         if (!user) {
//           user = await User.create({
//             provider: 'gitlab',
//             providerId: data.id,
//             name: data.name,
//             email: profile.emails?.[0]?.value || '',
//             username: data.username,
//             avatar: data.avatar_url,
//           });
//         }

//         return done(null, {
//           ...user.toObject(),
//           accessToken,
//           provider: 'gitlab',
//         });
//       } catch (err) {
//         return done(err as Error);
//       }
//     },
//   ),
// );
