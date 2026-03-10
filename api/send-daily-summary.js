// /api/send-daily-summary.js
// Vercel Cron Job: Scheduled SOD & EOD Summaries

import { kv } from '@vercel/kv';

export const config = {
  runtime: 'nodejs'
};

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const DAVID_SLACK_ID = "U08BQH5JJDD";
const ATTENDANCE_CHANNEL = "#attendance-admin";

const FLEXI_MEMBERS = ["Suki Santos", "Kristine Miel Zulaybar"];
const REGULAR_MEMBERS = ["Caleb Bentil", "Cyril Butanas", "Darlene Mae Malolos", "Kristine Mirabueno"];

const ROLE_ICONS = {
  "Caleb Bentil": "📞 Outbound Specialist",
  "Cyril Butanas": "🌟 Influencer Outreach",
  "Suki Santos": "🔧 Lead Operations",
  "Kristine Miel Zulaybar": "📊 Lead Enrichment",
  "Darlene Mae Malolos": "🎨 Graphic Designer",
  "Kristine Mirabueno": "👑 Operations Manager",
  "David Perlov": "🎯 Founder"
};

// Send message to Slack
async function sendToSlack(message, userId = null) {
  try {
    const endpoint = 'https://slack.com/api/chat.postMessage';
    
    const body = userId
      ? { channel: userId, text: message }
      : { channel: ATTENDANCE_CHANNEL, text: message };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Slack error:', error);
    return false;
  }
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

// Generate SOD Summary
function generateSODSummary(sodData, batch, isForce) {
  const members = batch === 'flexi' ? FLEXI_MEMBERS : REGULAR_MEMBERS;
  const batchName = batch === 'flexi' ? 'Flexi Workers' : 'Regular Time';
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long", 
    day: "numeric",
    year: "numeric"
  });
  
  const time = isForce 
    ? (batch === 'flexi' ? '3:30 AM EDT (Final)' : '10:00 AM EDT (Final)')
    : (batch === 'flexi' ? '3:00 AM EDT' : '9:30 AM EDT');
  
  let summary = `📋 *SOD SUMMARY - ${batchName}*\n`;
  summary += `${date} | ${time}\n\n`;
  summary += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  const submitted = [];
  const missing = [];
  
  for (const member of members) {
    if (sodData[member]) {
      submitted.push({ member, sod: sodData[member] });
    } else {
      missing.push(member);
    }
  }
  
  // Submitted SODs
  if (submitted.length > 0) {
    summary += `✅ *SUBMITTED (${submitted.length}/${members.length} members):*\n\n`;
    
    for (const { member, sod } of submitted) {
      summary += `👤 *${member.toUpperCase()}*\n`;
      
      if (ROLE_ICONS[member]) {
        summary += `${ROLE_ICONS[member]}\n`;
      }
      
      summary += `🕐 Logged in at: ${sod.submittedAt}\n\n`;
      
      if (sod.tasks && sod.tasks.length > 0) {
        summary += `📋 *Today's Tasks:*\n`;
        sod.tasks.forEach((task, i) => {
          summary += `${i + 1}. ${task.task} [${task.priority}]\n`;
        });
      }
      
      if (sod.metrics) {
        summary += `\n📊 *Metrics Goal:* ${sod.metrics}\n`;
      }
      
      summary += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
  }
  
  // Missing SODs (only show if force send)
  if (isForce && missing.length > 0) {
    summary += `⚠️ *MISSING SOD (${missing.length} member${missing.length > 1 ? 's' : ''}):*\n`;
    missing.forEach(member => {
      summary += `• ${member}\n`;
    });
    summary += `\n`;
  }
  
  summary += `📎 https://bwl-ops-hub.vercel.app`;
  
  return summary;
}

// Generate EOD Summary
function generateEODSummary(attendanceLogs, sodData, eodData, isForce) {
  const today = getTodayStr();
  const todayLogs = attendanceLogs.filter(log => log.date === today && log.type === 'in');
  const presentMembers = [...new Set(todayLogs.map(log => log.member))];
  
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long", 
    day: "numeric",
    year: "numeric"
  });
  
  const time = isForce ? "7:00 PM EDT (Final Report)" : "6:00 PM EDT";
  
  let summary = `📊 *DAILY EOD SUMMARY*\n`;
  summary += `${date} | ${time}\n\n`;
  summary += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  const completed = [];
  const incomplete = [];
  
  for (const member of presentMembers) {
    const hasSod = !!sodData[member];
    const hasEod = !!eodData[member];
    
    if (hasSod && hasEod) {
      completed.push(member);
    } else {
      const logs = attendanceLogs.filter(log => log.member === member && log.date === today);
      const outLogs = logs.filter(log => log.type === 'out');
      const latestOut = outLogs.length > 0 ? outLogs[outLogs.length - 1].time : null;
      
      incomplete.push({
        member,
        loggedOut: outLogs.length > 0,
        outTime: latestOut,
        hasSod,
        hasEod
      });
    }
  }
  
  // Completed
  if (completed.length > 0) {
    summary += `✅ *COMPLETED (${completed.length}/${presentMembers.length} members):*\n\n`;
    
    for (const member of completed) {
      const sod = sodData[member];
      const eod = eodData[member];
      
      summary += `👤 *${member.toUpperCase()}*\n`;
      
      if (ROLE_ICONS[member]) {
        summary += `${ROLE_ICONS[member]}\n\n`;
      }
      
      // SOD tasks
      if (sod && sod.tasks && sod.tasks.length > 0) {
        summary += `📋 *Planned Tasks:*\n`;
        sod.tasks.slice(0, 3).forEach(task => {
          summary += `• ${task.task}\n`;
        });
        summary += `\n`;
      }
      
      // EOD accomplishments
      if (eod && eod.metrics && eod.metrics.length > 0) {
        summary += `🎯 *Key Accomplishments:*\n`;
        eod.metrics.forEach(metric => {
          summary += `• *${metric.name}:* ${metric.value}\n`;
        });
      }
      
      summary += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
  }
  
  // Incomplete (only for force send)
  if (isForce && incomplete.length > 0) {
    summary += `⚠️ *INCOMPLETE (${incomplete.length} member${incomplete.length > 1 ? 's' : ''}):*\n\n`;
    
    for (const item of incomplete) {
      summary += `👤 *${item.member.toUpperCase()}*\n`;
      
      if (item.loggedOut) {
        summary += `Status: Logged out at ${item.outTime}\n`;
      } else {
        summary += `Status: Still logged in or auto-logged out\n`;
      }
      
      const missing = [];
      if (!item.hasSod) missing.push("SOD");
      if (!item.hasEod) missing.push("EOD");
      
      summary += `Missing: ${missing.join(", ")} not submitted\n\n`;
    }
    
    summary += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }
  
  summary += `📎 https://bwl-ops-hub.vercel.app`;
  
  return summary;
}

export default async function handler(req, res) {
  try {
    const { type, batch, force } = req.query;
    const today = getTodayStr();
    const isForce = force === 'true';
    
    console.log(`🕐 Cron triggered: type=${type}, batch=${batch}, force=${isForce}`);
    
    // Fetch data from KV
    const attendanceLogs = await kv.get('attendance-logs') || [];
    const sodData = await kv.get(`sod-${today}`) || {};
    const eodData = await kv.get(`eod-${today}`) || {};
    
    let summary = '';
    let shouldSend = false;
    
    // SOD Summary
    if (type === 'sod') {
      const members = batch === 'flexi' ? FLEXI_MEMBERS : REGULAR_MEMBERS;
      
      // Check if all submitted
      const allSubmitted = members.every(m => sodData[m]);
      
      console.log(`📋 SOD ${batch}: ${Object.keys(sodData).filter(m => members.includes(m)).length}/${members.length} submitted`);
      
      // First check: only send if all complete
      // Force send: send regardless
      shouldSend = isForce || allSubmitted;
      
      if (shouldSend) {
        summary = generateSODSummary(sodData, batch, isForce);
      } else {
        console.log(`⏳ Not all ${batch} SODs submitted, waiting for force send`);
        return res.status(200).json({ 
          success: true, 
          message: 'Waiting for all submissions' 
        });
      }
    }
    
    // EOD Summary
    if (type === 'eod') {
      const todayLogs = attendanceLogs.filter(log => log.date === today && log.type === 'in');
      const presentMembers = [...new Set(todayLogs.map(log => log.member))];
      
      if (presentMembers.length === 0) {
        console.log('ℹ️ No one present today');
        return res.status(200).json({ 
          success: true, 
          message: 'No one present' 
        });
      }
      
      const allComplete = presentMembers.every(m => sodData[m] && eodData[m]);
      
      console.log(`📊 EOD: ${Object.keys(eodData).length}/${presentMembers.length} submitted, all complete: ${allComplete}`);
      
      shouldSend = isForce || allComplete;
      
      if (shouldSend) {
        summary = generateEODSummary(attendanceLogs, sodData, eodData, isForce);
      } else {
        console.log('⏳ Not all EODs submitted, waiting for 7 PM');
        return res.status(200).json({ 
          success: true, 
          message: 'Waiting for all submissions' 
        });
      }
    }
    
    // Send to Slack
    console.log('📤 Sending to David...');
    const davidSent = await sendToSlack(summary, DAVID_SLACK_ID);
    
    console.log('📤 Sending to channel...');
    const channelSent = await sendToSlack(summary);
    
    if (davidSent && channelSent) {
      console.log('✅ Summary sent successfully!');
      return res.status(200).json({ 
        success: true, 
        message: 'Summary sent',
        type,
        batch,
        force: isForce
      });
    } else {
      console.error('❌ Failed to send to Slack');
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send to Slack' 
      });
    }
    
  } catch (error) {
    console.error('❌ Cron error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
