import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=== STARTING AUTOMATED PIPELINE API TESTS ===\n');

  try {
    // 1. Check server status
    console.log('1. Fetching Server Status...');
    const statusRes = await axios.get(`${BASE_URL}/api/status`);
    console.log('   Status Response:', JSON.stringify(statusRes.data, null, 2));
    const today = statusRes.data.today;

    // 2. Fetch queue
    console.log('\n2. Fetching Post Queue...');
    const postsRes = await axios.get(`${BASE_URL}/api/posts`);
    console.log(`   Found ${postsRes.data.length} posts in schedule.`);
    
    // Find today's post
    const todayPost = postsRes.data.find(p => p.date === today);
    if (!todayPost) {
      console.log(`   [WARN] No post scheduled for today (${today}).`);
    } else {
      console.log(`   Today's Post Title: "${todayPost.title}"`);
      console.log(`   Current Status: ${todayPost.status}, Approved: ${todayPost.approved}`);
    }

    // 3. Trigger Content Generation (17:00 step)
    console.log('\n3. Triggering Step 1: Content Generation (17:00)...');
    const genRes = await axios.post(`${BASE_URL}/api/posts/trigger-step`, {
      date: today,
      step: 'generate'
    });
    console.log('   Generation Success!');
    console.log('   Generated Payload Preview:', genRes.data.post.payload.substring(0, 150) + '...\n');

    // 4. Trigger Review Alerts (17:15 step)
    console.log('4. Triggering Step 2: Review Alerts (17:15)...');
    const alertRes = await axios.post(`${BASE_URL}/api/posts/trigger-step`, {
      date: today,
      step: 'alert'
    });
    console.log('   Alerts Dispatch Success!');
    console.log('   Status after alert:', alertRes.data.post.status);

    // 5. Approve Post (Manual action)
    console.log('\n5. Approving Post (Simulating user clicking Approve in Dashboard)...');
    const approveRes = await axios.post(`${BASE_URL}/api/posts/approve`, {
      date: today,
      approved: true
    });
    console.log('   Post Approved:', approveRes.data.post.approved);

    // 6. Trigger Publishing (18:00 step)
    console.log('\n6. Triggering Step 3: Publishing to LinkedIn (18:00)...');
    const publishRes = await axios.post(`${BASE_URL}/api/posts/trigger-step`, {
      date: today,
      step: 'publish'
    });
    console.log('   Publishing Success!');
    console.log('   LinkedIn Share ID:', publishRes.data.post.linkedinPostId);
    console.log('   Final Status:', publishRes.data.post.status);

    // 7. Verify Audit Logs
    console.log('\n7. Fetching Audit Logs...');
    const logsRes = await axios.get(`${BASE_URL}/api/logs`);
    console.log(`   Recent log entries:`);
    logsRes.data.slice(0, 5).forEach(log => {
      console.log(`   [${log.type}] [${log.timestamp.split('T')[1].substring(0, 8)}] - ${log.message}`);
    });

    console.log('\n=== ALL API TESTS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('\n[TEST ERROR] Integration test failed:', err.response?.data || err.message);
  }
}

runTests();
