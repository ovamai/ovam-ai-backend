// Load and initialize all OAuth strategies so they register with Passport
// These files each set up a different third-party login method

import './github';    // GitHub OAuth setup
import './gitlab';    // GitLab OAuth setup
import './azure';     // Microsoft Azure OAuth setup
import './bitbucket'; // Bitbucket OAuth setup
