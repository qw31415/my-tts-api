// 文件路径： functions/api/tts.js
// V11 - The Final Correction: 基于 Cloudflare 最新官方文档

export async function onRequest(context) {
  // 1. 检查 AI 绑定是否存在
  if (!context.env.AI) {
    return new Response(
      '错误：AI 功能未在 Cloudflare 项目中绑定。请在“设置”->“函数”->“Workers AI 绑定”中，确保变量名称为 AI。',
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // 2. 获取 URL 参数
  const { searchParams } = new URL(context.request.url);
  const text = searchParams.get('text');
  // 修正 #1：参数名是 'lang'，不是 'locale'
  // 修正 #2：语言代码是 'zh'，不是 'zh-CN'
  const lang = searchParams.get('lang') || 'zh'; 

  if (!text) {
    return new Response('错误：必须提供 "text" 查询参数。', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  try {
    // 3. 运行最新的 AI 模型
    const inputs = { text, lang };
    // 修正 #3：模型名称是 '@cf/meta/mms-tts-1'
    const responseStream = await context.env.AI.run('@cf/meta/mms-tts-1', inputs);

    // 4. 返回正确的音频流
    return new Response(responseStream, {
      headers: {
        // 修正 #4：输出格式是 'audio/ogg'
        'Content-Type': 'audio/ogg', 
        'Cache-Control': 'public, max-age=86400',
      },
    });

  } catch (e) {
    // 增加详细的错误捕捉，避免再出现 1101 泛用错误
    return new Response(`AI 模型执行时发生内部错误: ${e.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
