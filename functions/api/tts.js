// 文件路径： functions/api/tts.js
// V3 - 自动获取并使用认证令牌的最终正确版本

/**
 * Cloudflare Pages Function for Microsoft Text-to-Speech
 *
 * This function acts as a proxy to Microsoft's Cognitive Services TTS API.
 * It works by first fetching a temporary authentication token, then using that
 * token to call the TTS service, mimicking the behavior of the official demo page.
 * This avoids the need for a permanent Azure subscription key.
 */
export async function onRequest(context) {
  // 1. 从 URL 中获取查询参数
  const { searchParams } = new URL(context.request.url);
  const text = searchParams.get('text');
  const voice = searchParams.get('voice') || 'zh-CN-XiaoxiaoNeural';

  if (!text) {
    return new Response('错误：必须提供 "text" 查询参数。', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  try {
    // 2. 【核心修正！】第一步：获取临时认证令牌 (Access Token)
    // 我们请求一个微软公开的、用于生成前端演示令牌的端点
    const tokenResponse = await fetch('https://azure.microsoft.com/v8/api/js/token', {
        method: 'POST',
        headers: { 'User-Agent': 'Miko-TTS-Proxy-for-My-Teacher-V3-Final' }
    });
    if (!tokenResponse.ok) {
      throw new Error(`获取令牌失败: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }
    const { token, region } = await tokenResponse.json();
    
    // 使用从令牌服务获取的区域来构建TTS端点URL，更加健壮
    const ttsUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    // 3. 构建 SSML
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voice}">
          ${escapeXml(text)}
        </voice>
      </speak>
    `;

    // 4. 【核心修正！】第二步：携带令牌请求微软的 TTS API
    const audioResponse = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`, // <-- 使用获取到的令牌！
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'Miko-TTS-Proxy-for-My-Teacher-V3-Final',
      },
      body: ssml,
    });

    if (!audioResponse.ok) {
      const errorDetails = await audioResponse.text();
      throw new Error(`微软 TTS API 错误: ${audioResponse.status} ${audioResponse.statusText}\n详情: ${errorDetails}`);
    }

    // 5. 将微软返回的音频流直接传回给用户
    return new Response(audioResponse.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600', // 缓存1小时
      },
    });

  } catch (e) {
    console.error(e);
    return new Response(e.message, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
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
