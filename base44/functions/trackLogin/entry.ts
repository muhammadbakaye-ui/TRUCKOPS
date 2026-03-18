import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function parseUserAgent(userAgent) {
  if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device_type: 'desktop' };

  let browser = 'Unknown';
  let os = 'Unknown';
  let device_type = 'desktop';

  // Detect Browser
  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';

  // Detect OS
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

  // Detect Device Type
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) device_type = 'mobile';
  else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) device_type = 'tablet';

  return { browser, os, device_type };
}

function getIpAddress(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         req.headers.get('cf-connecting-ip') ||
         req.headers.get('x-real-ip') ||
         'Unknown';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userAgent = req.headers.get('user-agent') || '';
    const { browser, os, device_type } = parseUserAgent(userAgent);
    const ipAddress = getIpAddress(req);

    await base44.asServiceRole.entities.LoginHistory.create({
      user_email: user.email,
      login_date: new Date().toISOString(),
      browser,
      os,
      device_type,
      ip_address: ipAddress,
      user_agent: userAgent,
      location: 'Geographic lookup not available',
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});