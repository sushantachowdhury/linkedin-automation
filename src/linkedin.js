import axios from 'axios';
import { logEvent, saveSettings } from './store.js';

/**
 * Generate LinkedIn OAuth 2.0 Authorization URL
 * @param {Object} settings 
 * @returns {String} URL
 */
export function getLinkedInAuthUrl(settings) {
  const clientId = settings.LINKEDIN_CLIENT_ID;
  const redirectUri = encodeURIComponent(settings.LINKEDIN_REDIRECT_URI);
  
  if (!clientId) {
    return '#';
  }

  // standard scopes for publishing and user identifier
  const scope = encodeURIComponent('w_member_social openid profile email');
  const state = Math.random().toString(36).substring(2, 15);

  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
}

/**
 * Handle OAuth redirect callback code exchange
 * @param {Object} settings 
 * @param {String} code 
 */
export async function handleLinkedInCallback(settings, code) {
  const clientId = settings.LINKEDIN_CLIENT_ID;
  const clientSecret = settings.LINKEDIN_CLIENT_SECRET;
  const redirectUri = settings.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn client ID or client secret missing.');
  }

  try {
    logEvent('LINKEDIN_INFO', 'Exchanging OAuth code for LinkedIn access token...');

    // Request Access Token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      throw new Error('Access token not found in response');
    }

    logEvent('LINKEDIN_INFO', 'Access token received. Fetching LinkedIn user profile info...');

    // Fetch user info using OpenID Connect (OIDC) endpoint
    const userinfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    // The sub parameter is the unique ID
    const sub = userinfoResponse.data.sub;
    const name = `${userinfoResponse.data.given_name} ${userinfoResponse.data.family_name}`;
    const picture = userinfoResponse.data.picture;
    const urn = `urn:li:person:${sub}`;

    logEvent('LINKEDIN_SUCCESS', `Successfully authenticated LinkedIn user: ${name} (${urn})`);

    // Save tokens and user info back to settings
    saveSettings({
      LINKEDIN_ACCESS_TOKEN: accessToken,
      LINKEDIN_USER_URN: urn,
      LINKEDIN_USER_NAME: name,
      LINKEDIN_USER_PICTURE: picture
    });

    return { name, urn, picture };
  } catch (err) {
    const errMsg = err.response?.data?.error_description || err.message;
    logEvent('LINKEDIN_ERROR', `OAuth callback failed: ${errMsg}`);
    throw new Error(errMsg);
  }
}

/**
 * Publish post to LinkedIn or fall back to Mock publishing
 * @param {Object} settings 
 * @param {String} text 
 * @returns {Promise<String>} Published post ID
 */
export async function publishToLinkedIn(settings, text) {
  const accessToken = settings.LINKEDIN_ACCESS_TOKEN;
  const userUrn = settings.LINKEDIN_USER_URN;

  if (!accessToken || !userUrn) {
    logEvent('LINKEDIN_WARN', 'LinkedIn credentials not configured. Running in Mock Publishing mode.');
    return simulateMockPublish(text);
  }

  try {
    logEvent('LINKEDIN_INFO', `Publishing to LinkedIn under URN ${userUrn}...`);

    // Use standard UGC Posts API
    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: userUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );

    // Response structure contains an id like "urn:li:share:123456"
    const postId = response.data.id;
    logEvent('LINKEDIN_SUCCESS', `Successfully published to LinkedIn. Share ID: ${postId}`);
    return postId;
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    logEvent('LINKEDIN_ERROR', `LinkedIn publishing failed: ${errMsg}`);
    throw new Error(errMsg);
  }
}

/**
 * Simulate publishing in mock mode
 */
async function simulateMockPublish(text) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockPostId = `urn:li:share:mock_${Math.floor(10000000 + Math.random() * 90000000)}`;
      logEvent('LINKEDIN_SUCCESS', `[MOCK PUBLISH] Successfully posted to LinkedIn feed. Generated ID: ${mockPostId}`);
      resolve(mockPostId);
    }, 1500);
  });
}
