import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import axios from 'axios';
import User, { IUser } from '../models/User'; // adjust according to your user model
import Repository, { IRepository } from '../models/Repository';
import PullRequest, { IPullRequest } from '../models/PullRequest';
import { fetchUserRepos, fetchPullRequests, fetchPullRequestFiles } from '../services/github';
import { VerifyCallback } from 'passport-oauth2';


interface Profile {
  id?: string;
  displayName?: string;
  emails?: { value: string }[];
  username?: string;
}

// GitHub API user response structure (partial)
interface GitHubUser {
  id: number;
  login: string;
  name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  html_url?: string;
  [key: string]: any;
}

// GitHub PR file structure

interface GitHubPRFile {
  filename: string;
  status: "added" | "modified" | "removed" | string; // to handle raw GitHub
}

{/*
interface IPullRequestFile {
  filename: string;
  status: string; // <--- change from union to string
}

*/}

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: `${process.env.BASE_URL}/auth/github/callback`,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        // Step 1: Get user profile data from GitHub API
        const { data }: { data: GitHubUser } = await axios.get('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!data || !data.id) return done(null, false);

        // Step 2: Check if user exists in DB
        let user = await User.findOne({
          'providerAccounts.provider': 'github',
          'providerAccounts.providerId': data.id,
        });

        // Step 3: Create or update user
        if (!user) {
          const userCount = await User.countDocuments();

          user = await User.create({
            name: data.name || data.login,
            email: profile.emails?.[0]?.value || '',
            username: data.login,
            avatar: data.avatar_url || '',
            role: userCount === 0 ? 'superadmin' : 'user',
            providerAccounts: [
              {
                provider: 'github',
                providerId: data.id,
                accessToken,
                refreshToken,
                profileData: data,
              },
            ],
          });
        } else {
          const githubAccount = user.providerAccounts.find((p) => p.provider === 'github');
          if (githubAccount) {
            githubAccount.accessToken = accessToken;
            githubAccount.refreshToken = refreshToken;
            githubAccount.profileData = data;
          } else {
            user.providerAccounts.push({
              provider: 'github',
              providerId:data.id.toString(),
              accessToken,
              refreshToken,
              profileData: data,
            });
          }

          await user.save();
        }

        // Step 4: Fetch and store repositories
        const repos = await fetchUserRepos(accessToken);

        for (const repoData of repos) {
          let repo = await Repository.findOne({ providerRepoId: repoData.id });

          if (!repo) {
            repo = await Repository.create({
              name: repoData.name,
              fullName: repoData.full_name,
              provider: 'github',
              providerRepoId: repoData.id,
              organization: null,
              createdAtGitHub: repoData.created_at,
              updatedAtGitHub: repoData.updated_at,
              repoUrl: repoData.html_url,
            });
          } else {
            repo.createdAtGitHub = new Date(repoData.created_at);
            repo.updatedAtGitHub = new Date(repoData.updated_at);
            repo.repoUrl = repoData.html_url;
            await repo.save();
          }

          // Step 5: Fetch and store PRs for the repo
          const [owner, repoName] = repoData.full_name.split('/');
          const prs = await fetchPullRequests(accessToken, owner, repoName);

          for (const pr of prs) {
            const existingPR = await PullRequest.findOne({
              providerPrId: pr.id,
            });

            const filesChanged = await fetchPullRequestFiles(accessToken, owner, repoName, pr.number);
            const fileInfo: GitHubPRFile[] = filesChanged.map((file) => ({
              filename: file.filename,
              status: file.status,
            }));

            if (!existingPR) {
              await PullRequest.create({
                title: pr.title,
                status: pr.state,
                url: pr.html_url,
                provider: 'github',
                providerPrId: pr.id,
                author: user._id,
                repository: repo._id,
                createdAt: pr.created_at,
                updatedAt: pr.updated_at,
                files: fileInfo,
              });
            } else {
              existingPR.files = fileInfo as IPullRequest['files'];
              existingPR.updatedAt = new Date(pr.updated_at);
              await existingPR.save();
            }
          }
        }

        // Final step: Pass user to Passport
        return done(null, {
          ...user.toObject(),
          accessToken,
          provider: 'github',
        });
      } catch (err) {
        console.error('GitHub Auth Error:', err);
        return done(err as Error);
      }
    }
  )
);


