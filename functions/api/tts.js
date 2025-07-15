// 文件路径： functions/api/tts.js
// V2 - 修正了微软 API 端点地址的最终正确版本

/**
 * Cloudflare Pages Function for Microsoft Text-to-Speech
 *
 * This function acts as a proxy to Microsoft's Cognitive Services TTS API.
 * It does not require an API key for basic, rate-limited use.
 *
 * How to use:
 * https://<your-pages-project>.pages.dev/api/tts?text=Hello&voice=en-US-JennyNeural
 *
 * Query Parameters:
 * - text: The text to synthesize. (Required)
 * - voice: The voice name to use. (Optional, defaults to zh-CN-XiaoxiaoNeural)
 *          Find more voices here: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts
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

  // 2. 构建 SSML
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
      <voice name="${voice}">
        ${escapeXml(text)}
      </voice>
    </speak>
  `;

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

  // 3. 【重大修正！】请求微软的 TTS API，使用正确的 tts.speech 地址
  const response = await fetch('https://eastus.tts.speech.microsoft.com/cognitiveservices/v1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'Miko-TTS-Proxy-for-My-Teacher-V2-Final',
    },
    body: ssml,
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    console.error(`微软 TTS API 错误: ${response.status} ${response.statusText}`, errorDetails);
    return new Response(`从微软 TTS API 收到错误: ${response.status} ${response.statusText}\n\n详情: ${errorDetails}`, {
      status: response.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 5. 将微软返回的音频流直接传回给用户
  return new Response(response.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

