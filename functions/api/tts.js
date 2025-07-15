// 文件路径： functions/api/tts.js
// V12 - The Last Hope: 放弃 Meta，使用 Microsoft SpeechT5 模型

export async function onRequest(context) {
  // 1. 检查 AI 绑定
  if (!context.env.AI) {
    return new Response(
      '错误：AI 功能未在 Cloudflare 项目中绑定。',
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // 2. 获取 URL 参数
  const { searchParams } = new URL(context.request.url);
  const text = searchParams.get('text');

  if (!text) {
    return new Response('错误：必须提供 "text" 查询参数。', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  try {
    // 3. 运行 Microsoft 的 SpeechT5 模型
    // 这个模型更简单，只需要 text 参数
    const inputs = { text };
    const responseStream = await context.env.AI.run(
      '@cf/microsoft/speecht5-tts', // 我们最后的希望
      inputs
    );

    // 4. 返回音频流 (OGG 格式)
    return new Response(responseStream, {
      headers: {
        'Content-Type': 'audio/ogg',
        'Cache-Control': 'public, max-age=86400',
      },
    });

  } catch (e) {
    return new Response(`AI 模型执行时发生内部错误: ${e.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
