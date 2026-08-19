const MAX_SCRIPT_LENGTH = 3500
const MAX_CRITERIA_LENGTH = 600

const CRITERION_NAMES = ['钩子强度', '节奏控制', '人物弧光', '情感张力', '反转设计', '短剧适配度']

function sendJson(response, status, payload) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

async function readBody(request) {
  if (request.body && typeof request.body === 'object') return request.body

  let raw = ''
  for await (const chunk of request) raw += chunk
  return raw ? JSON.parse(raw) : {}
}

function clampScore(score) {
  const value = Number(score)
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0
}

function normalizeResponse(content) {
  const parsed = JSON.parse(content)
  const scores = CRITERION_NAMES.map((name) => ({
    subject: name,
    value: clampScore(parsed.scores?.[name]),
    fullMark: 100,
  }))
  const feedbackByName = new Map(
    Array.isArray(parsed.feedback)
      ? parsed.feedback.filter((item) => item && CRITERION_NAMES.includes(item.name)).map((item) => [item.name, item])
      : [],
  )

  const feedback = scores
    .map((score) => {
      const item = feedbackByName.get(score.subject) ?? {}
      return {
        name: score.subject,
        score: score.value,
        problem: typeof item.problem === 'string' ? item.problem : '该维度暂未生成具体问题描述。',
        suggestions: Array.isArray(item.suggestions)
          ? item.suggestions.filter((suggestion) => typeof suggestion === 'string').slice(0, 3)
          : [],
      }
    })
    .sort((left, right) => left.score - right.score)

  return {
    overall: clampScore(parsed.overall ?? scores.reduce((sum, score) => sum + score.value, 0) / scores.length),
    scores,
    feedback,
    revised: typeof parsed.revised_script === 'string' ? parsed.revised_script : '',
  }
}

function createPrompt(script, criteria) {
  const criteriaText = criteria.map((item) => `- ${item.name}：${item.text}`).join('\n')
  return `你是一名擅长竖屏短剧与漫剧开发的资深编剧顾问。请评估剧本并提供可执行的改稿建议。

评估标准：
${criteriaText}

必须只返回有效 JSON，不要使用 Markdown 或代码围栏，且严格符合以下结构：
{
  "scores": {
    "钩子强度": 0,
    "节奏控制": 0,
    "人物弧光": 0,
    "情感张力": 0,
    "反转设计": 0,
    "短剧适配度": 0
  },
  "overall": 0,
  "feedback": [
    {
      "name": "评估维度名称",
      "problem": "针对具体场次或台词的问题描述，1至2句",
      "suggestions": ["可直接执行的修改建议，1至3条"]
    }
  ],
  "revised_script": "保留原剧本核心故事、对完整剧本进行优化后的文本"
}

评分范围为 0 到 100。feedback 必须覆盖全部六个维度，建议必须具体到情节、场次、人物或台词。

待评估剧本：
${script}`
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: '仅支持 POST 请求' })
    return
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    sendJson(response, 500, { error: '服务端未配置 DEEPSEEK_API_KEY' })
    return
  }

  try {
    const { script, criteria } = await readBody(request)
    if (typeof script !== 'string' || !script.trim()) {
      sendJson(response, 400, { error: '请提供剧本文本' })
      return
    }
    if (script.length > MAX_SCRIPT_LENGTH) {
      sendJson(response, 400, { error: `剧本文本不能超过 ${MAX_SCRIPT_LENGTH} 字` })
      return
    }
    if (!Array.isArray(criteria) || criteria.length !== CRITERION_NAMES.length) {
      sendJson(response, 400, { error: '评估标准不完整' })
      return
    }

    const safeCriteria = criteria.map((criterion) => ({
      name: CRITERION_NAMES.includes(criterion?.name) ? criterion.name : '',
      text: typeof criterion?.text === 'string' ? criterion.text.trim().slice(0, MAX_CRITERIA_LENGTH) : '',
    }))
    if (safeCriteria.some((criterion) => !criterion.name || !criterion.text)) {
      sendJson(response, 400, { error: '评估标准格式无效' })
      return
    }

    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: '你是专业的中文短剧剧本评估助手。始终遵循用户要求的 JSON 结构。' },
          { role: 'user', content: createPrompt(script, safeCriteria) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 5000,
      }),
    })

    if (!deepseekResponse.ok) {
      const details = await deepseekResponse.text()
      console.error('DeepSeek API error:', deepseekResponse.status, details)
      const error = deepseekResponse.status === 401 || deepseekResponse.status === 403
        ? 'DeepSeek API 密钥无效或无访问权限，请更新服务端配置'
        : 'DeepSeek 服务暂时不可用，请稍后重试'
      sendJson(response, 502, { error })
      return
    }

    const completion = await deepseekResponse.json()
    const content = completion.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('DeepSeek 未返回有效内容')

    sendJson(response, 200, normalizeResponse(content))
  } catch (error) {
    console.error('Evaluation error:', error)
    sendJson(response, 500, { error: '评估失败，请稍后重试' })
  }
}
