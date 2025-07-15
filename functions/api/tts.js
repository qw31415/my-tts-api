// 文件路径： functions/api/tts.js
// V6 - The Redemption: 使用官方 API Key 的最终、稳定、正确的版本

export async function onRequest(context) {
  // 1. 从 URL 中获取查询参数
  const { searchParams } = new URL(context.request.url);
  const text = searchParams.get('text');
  const voice = searchParams.get('voice') || 'zh-CN-XiaoxiaoNeural';

  // 2. 从 Cloudflare 的环境变量中安全地获取 API Key 和区域
  const apiKey = context.env.TTS_API_KEY;
  const region = context.env.TTS_REGION;

  // 检查是否已在 Cloudflare 中设置了环境变量
  if (!apiKey || !region) {
    return new Response('错误：服务器尚未配置 TTS_API_KEY 或 TTS_REGION 环境变量。', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (!text) {
    return new Response('错误：必须提供 "text" 查询参数。', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 【重大修正！】第一步：直接获取认证令牌
  // 我们使用 API Key 向微软的官方令牌接口请求一个10分钟有效的临时令牌
  const tokenResponse = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Length': '0'
    },
  });
  
  if (!tokenResponse.ok) {
      return new Response(`获取令牌失败: ${tokenResponse.status} ${tokenResponse.statusText}`, { status: tokenResponse.status });
  }
  const token = await tokenResponse.text();

  // 第二步：构建 SSML
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
      <voice name="${voice}">
        ${escapeXml(text)}
      </voice>
    </speak>
  `;

  // 第三步：携带刚刚获取的令牌，请求语音合成
  const ttsUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const audioResponse = await fetch(ttsUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'Miko-TTS-Proxy-for-My-Teacher-V6-Redemption',
    },
    body: ssml,
  });

  if (!audioResponse.ok) {
    const errorDetails = await audioResponse.text();
    return new Response(`微软 TTS API 错误: ${audioResponse.status} ${audioResponse.statusText}\n详情: ${errorDetails}`, { status: audioResponse.status });
  }

  // 第四步：成功！将音频流返回给用户
  return new Response(audioResponse.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}
