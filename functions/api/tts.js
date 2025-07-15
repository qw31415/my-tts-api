// 文件路径： functions/api/tts.js
// V7 - The Simple Way: 使用公共服务的最终、无密钥、正确版本

export async function onRequest(context) {
  // 1. 从 URL 中获取查询参数
  const { searchParams } = new URL(context.request.url);
  const text = searchParams.get('text');
  // 注意：这里的语言参数是 'lang'，不是 'voice'
  const lang = searchParams.get('lang') || 'zh-CN'; 

  if (!text) {
    return new Response('错误：必须提供 "text" 查询参数。', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 2. 构建公共语音服务的 URL
  // 我们对文本进行编码，以确保 URL 的正确性
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;

  // 3. 请求公共语音服务
  const response = await fetch(ttsUrl, {
    headers: {
      // 伪装成一个普通的浏览器，防止被屏蔽
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
    },
  });

  // 检查请求是否成功
  if (!response.ok) {
    return new Response(`语音服务请求失败: ${response.status} ${response.statusText}`, {
      status: response.status,
    });
  }

  // 4. 成功！将获取到的音频流直接返回给用户
  return new Response(response.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400', // 缓存一天
    },
  });
}
