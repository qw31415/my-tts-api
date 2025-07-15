// 文件路径： functions/api/tts.js
// V10 - The Ultimate Solution: 使用 Cloudflare 自身内置的 Workers AI

export async function onRequest(context) {
  // 1. 检查 AI 功能是否已在 Cloudflare 中正确绑定
  if (!context.env.AI) {
    return new Response(
      '错误：AI 功能未在您的 Cloudflare 账户中启用或绑定。请在 Pages 项目的“设置”->“函数”->“Workers AI 绑定”中，将变量名称设置为 AI。',
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // 2. 从 URL 中获取查询参数
  const { searchParams } = new URL(context.request.url);
  const text = searchParams.get('text');
  // Cloudflare AI 模型使用 'locale' 参数，例如 'zh-CN', 'en-US'
  const locale = searchParams.get('locale') || 'zh-CN';

  if (!text) {
    return new Response('错误：必须提供 "text" 查询参数。', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 3. 直接运行 Cloudflare 平台上的 Facebook MMS 语音合成模型
  const inputs = { text, locale };
  const response = await context.env.AI.run('@cf/facebook/mms-tts', inputs);

  // 4. 成功！将获取到的音频流直接返回给用户 (模型输出为 WAV 格式)
  return new Response(response, {
    headers: {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'public, max-age=86400', // 缓存一天
    },
  });
}
