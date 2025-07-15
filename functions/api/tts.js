// 文件路径： functions/api/tts.js
// V8 - The Perfect Solution: 使用 Edge 朗读接口，兼得高品质与隐私

export async function onRequest(context) {
  // 1. 从 URL 中获取查询参数
  const { searchParams } = new URL(context.request.url);
  const text = searchParams.get('text');
  // 参数变回了 'voice'，让我们可以选择喜欢的声音
  const voice = searchParams.get('voice') || 'zh-CN-XiaoxiaoNeural'; 

  if (!text) {
    return new Response('错误：必须提供 "text" 查询参数。', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 2. 构造请求 Edge 朗读服务所需的 SSML
  // 这是一种特殊的 XML，用来告诉服务器我们要用哪种声音、用什么语速和语调
  const ssml = `
    <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
      <voice name='${voice}'>
        <prosody rate='+0.00%' pitch='+0.00%'>
          ${escapeXml(text)}
        </prosody>
      </voice>
    </speak>
  `;

  // 3. 直接请求微软的公共语音合成接口
  const response = await fetch('https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ssml+xml',
      // 这个输出格式提供了很好的音质和文件大小的平衡
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      // 伪装成 Edge 浏览器
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36 Edg/91.0.864.41'
    },
    body: ssml,
  });

  if (!response.ok) {
    return new Response(`Edge 朗读服务请求失败: ${response.status} ${response.statusText}`, {
      status: response.status,
    });
  }

  // 4. 成功！将获取到的高品质音频流直接返回给用户
  return new Response(response.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400', // 缓存一天
    },
  });
}

// 用于转义 SSML 中的特殊字符，防止出错
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
