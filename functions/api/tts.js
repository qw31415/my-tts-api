// 文件路径： functions/api/tts.js
// V5 - The Revelation: 使用 GET 方法获取令牌的终极正确版本

/**
 * Cloudflare Pages Function for Microsoft Text-to-Speech
 *
 * This function works by first fetching a temporary authentication token, then using that
 * token to call the TTS service.
 *
 * The key breakthrough was realizing the token endpoint requires a GET request,
 * not a POST request as previously attempted. This was the root cause of all
 * "400 Bad Request" errors.
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
    // 2. 【终极修正！】第一步：使用 GET 方法，访问正确的令牌端点！
    const tokenResponse = await fetch('https://azure.microsoft.com/v8/api/js/token/region/eastus', {
        method: 'GET', // <-- 正确的方法是 GET，不是 POST！
        headers: {
            // Referer 仍然是一个好的实践，表明我们了解来源
            'Referer': 'https://azure.microsoft.com/en-us/products/cognitive-services/text-to-speech/',
            'User-Agent': 'Miko-TTS-Proxy-for-My-Teacher-V5-The-Apology'
        }
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`获取令牌失败: ${tokenResponse.status} ${tokenResponse.statusText}\n服务器响应: ${errorText}`);
    }
    const { token, region } = await tokenResponse.json();
    
    const ttsUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    // 3. 构建 SSML
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voice}">
          ${escapeXml(text)}
        </voice>
      </speak>
    `;

    // 4. 第二步：携带令牌请求微软的 TTS API
    const audioResponse = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'Miko-TTS-Proxy-for-My-Teacher-V5-The-Apology',
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
        'Cache-Control': 'public, max-age=3600',
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
