import cron from 'node-cron';
import { getSettings, logEvent, savePost, getPosts } from './store.js';
import { getSheetQueue, updateSheetQueue } from './sheets.js';
import { generateDraftPost } from './gemini.js';
import { sendReviewAlert, sendSuccessAlert } from './alerts.js';
import { publishToLinkedIn } from './linkedin.js';

// Helper to get local date string (YYYY-MM-DD)
export function getLocalDateString(d = new Date()) {
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - (offset * 60 * 1000));
  return local.toISOString().split('T')[0];
}

/**
 * Step 1: Content Generation (5:00 PM / 17:00)
 * Reads row from sheet/DB for date, fetches live analytics triggers, drafts post using Gemini
 */
export async function triggerContentGen(date) {
  const settings = getSettings();
  logEvent('PIPELINE', `Starting step 1: Content Generation for date ${date}...`);

  try {
    // 1. Sync & fetch sheet queue
    const queue = await getSheetQueue(settings);
    const post = queue.find(p => p.date === date);

    if (!post) {
      logEvent('PIPELINE_ERROR', `No scheduled post found for date ${date} in queue.`);
      return { success: false, error: 'No scheduled post found for date.' };
    }

    // Determine analytics status/trigger
    const analyticsTrigger = post.analyticsStatus || 'No active traffic triggers';

    // 2. Draft 3 content options using Gemini API
    const drafts = await generateDraftPost(settings, post.title, analyticsTrigger);

    // 3. Update local DB (save drafts and set status to Awaiting)
    const updatedPost = {
      ...post,
      draftOptions: drafts,
      messagePayload: '', // Empty until selected
      status: 'Awaiting',
      approved: false
    };
    savePost(updatedPost);

    // Update Sheets with status Awaiting Option Selection
    await updateSheetQueue(settings, date, {
      messagePayload: '', // Empty until selected
      analyticsStatus: 'Awaiting Option Selection'
    });

    logEvent('PIPELINE_SUCCESS', `Content Generation complete (3 drafts generated) for date ${date}`);
    return { success: true, post: updatedPost };
  } catch (err) {
    logEvent('PIPELINE_ERROR', `Content Generation failed for date ${date}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Step 2: Review & Alert (5:15 PM / 17:15)
 * Sends post preview via Email and WhatsApp to user for approval
 */
export async function triggerAlert(date) {
  const settings = getSettings();
  logEvent('PIPELINE', `Starting step 2: Review & Alerts for date ${date}...`);

  try {
    // Sync sheets/DB
    const queue = await getSheetQueue(settings);
    const post = queue.find(p => p.date === date);

    const activePayload = post ? (post.messagePayload || post.payload) : '';
    const hasOptions = post && post.draftOptions && Array.isArray(post.draftOptions) && post.draftOptions.length > 0;

    if (!post || (!activePayload && !hasOptions)) {
      logEvent('PIPELINE_ERROR', `Cannot alert for date ${date}: Post draft does not exist.`);
      return { success: false, error: 'Draft content is empty. Generate content first.' };
    }

    // Send notifications (sendReviewAlert will handle multiple options formatting internally)
    await sendReviewAlert(settings, post);

    // Update status to Awaiting Approval (only if they selected option already, otherwise keep Awaiting selection)
    const nextStatus = activePayload ? 'Awaiting Approval' : 'Awaiting';
    const updatedPost = {
      ...post,
      status: nextStatus
    };
    savePost(updatedPost);

    logEvent('PIPELINE_SUCCESS', `Review Alerts sent successfully for date ${date}`);
    return { success: true, post: updatedPost };
  } catch (err) {
    logEvent('PIPELINE_ERROR', `Review Alerts failed for date ${date}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Step 3: Auto Publishing (6:00 PM / 18:00)
 * Publishes post to LinkedIn if user has approved it in the dashboard
 */
export async function triggerPublish(date) {
  const settings = getSettings();
  logEvent('PIPELINE', `Starting step 3: LinkedIn Publishing for date ${date}...`);

  try {
    const queue = await getSheetQueue(settings);
    const post = queue.find(p => p.date === date);

    if (!post) {
      logEvent('PIPELINE_ERROR', `No scheduled post found for date ${date}`);
      return { success: false, error: 'Post not found in queue.' };
    }

    // Verify approval
    if (!post.approved) {
      logEvent('PIPELINE_WARN', `Publishing skipped for ${date}: Draft is not approved by user.`);
      savePost({ ...post, status: 'Missed Approval' });
      return { success: false, error: 'Post is not approved yet.' };
    }

    const payloadText = post.messagePayload || post.payload;
    if (!payloadText) {
      logEvent('PIPELINE_ERROR', `Publishing failed for ${date}: Message payload is empty.`);
      return { success: false, error: 'Message payload is empty.' };
    }

    // Publish to LinkedIn
    const postId = await publishToLinkedIn(settings, payloadText);

    // Update status in sheet & local store
    await updateSheetQueue(settings, date, {
      analyticsStatus: 'Published'
    });

    const publishedPost = {
      ...post,
      status: 'Published',
      linkedinPostId: postId,
      publishedAt: new Date().toISOString()
    };
    savePost(publishedPost);

    // Send success notifications
    await sendSuccessAlert(settings, publishedPost);

    logEvent('PIPELINE_SUCCESS', `Successfully published post to LinkedIn for date ${date}`);
    return { success: true, post: publishedPost };
  } catch (err) {
    logEvent('PIPELINE_ERROR', `Publishing failed for date ${date}: ${err.message}`);
    savePost({ ...post, status: 'Failed' });
    return { success: false, error: err.message };
  }
}

// Start the scheduler
export function startScheduler() {
  logEvent('SCHEDULER', 'Initializing background schedule listeners (Local System Time)...');

  // 17:00 - Content Generation cron (every day at 5:00 PM)
  cron.schedule('0 17 * * *', async () => {
    const today = getLocalDateString();
    logEvent('SCHEDULER', `Cron triggered: Content Generation (17:00) for ${today}`);
    await triggerContentGen(today);
  });

  // 17:15 - Alerts cron (every day at 5:15 PM)
  cron.schedule('15 17 * * *', async () => {
    const today = getLocalDateString();
    logEvent('SCHEDULER', `Cron triggered: Review Alert (17:15) for ${today}`);
    await triggerAlert(today);
  });

  // 18:00 - Publishing cron (every day at 6:00 PM)
  cron.schedule('0 18 * * *', async () => {
    const today = getLocalDateString();
    logEvent('SCHEDULER', `Cron triggered: LinkedIn Publishing (18:00) for ${today}`);
    await triggerPublish(today);
  });

  logEvent('SCHEDULER', 'Cron listener active: Content Gen (17:00), Review Alerts (17:15), Publishing (18:00)');
}
