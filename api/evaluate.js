import { criteria as availableCriteria } from '../src/criteria.js'

const MAX_SCRIPT_LENGTH = 3500
const criteriaById = new Map(availableCriteria.map((item) => [item.id, item]))

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

function normalizeResponse(content, selectedCriteria) {
  const parsed = JSON.parse(content)
  const scores = selectedCriteria.map((criterion) => {
    const value = parsed.scores?.[criterion.name]
    if (value === undefined || !Number.isFinite(Number(value))) throw new Error(`缺少${criterion.name}的评分`)
    return { subject: criterion.name, value: clampScore(value), fullMark: 100 }
  })
  const feedbackByName = new Map(
    Array.isArray(parsed.feedback)
      ? parsed.feedback.filter((item) => item && selectedCriteria.some((criterion) => criterion.name === item.name)).map((item) => [item.name, item])
      : [],
  )
  const feedback = scores.map((score) => {
    const item = feedbackByName.get(score.subject) ?? {}
    return {
      name: score.subject,
      score: score.value,
      problem: typeof item.problem === 'string' ? item.problem : '该维度暂未生成具体问题描述。',
      suggestions: Array.isArray(item.suggestions) ? item.suggestions.filter((suggestion) => typeof suggestion === 'string').slice(0, 3) : [],
    }
  }).sort((left, right) => left.score - right.score)

  return {
    overall: clampScore(scores.reduce((sum, score) => sum + score.value, 0) / scores.length),
    scores,
    feedback,
    revised: typeof parsed.revised_script === 'string' ? parsed.revised_script : '',
  }
}

function createPrompt(script, selectedCriteria) {
  const names = selectedCriteria.map((item) => item.name)
  const rubrics = selectedCriteria.map((item) => `【${item.name}】\n${item.prompt}`).join('\n\n')
  return `你是一名男频漫剧剧本评估助手。仅评估本次选中的维度：${names.join('、')}。

以下是各维度来自评估文档的原始提示词。逐项遵循其分析方法和评分标准。文档中的 {chapters_data} 指下方同一份待评估剧本；不要评估未选中的维度。原始提示词中的单项输出格式仅供理解评价内容，最终统一按本消息末尾的 JSON 格式返回。若原始标准为 0-10 分，换算成 0-100 分后填入 scores。

${rubrics}

待评估剧本：
${script}

只返回有效 JSON，不要使用 Markdown 或代码围栏。严格使用此结构：
{
  "scores": { ${names.map((name) => `"${name}": 0`).join(', ')} },
  "feedback": [
    { "name": "维度名称", "problem": "结合剧本具体情节、场次或台词的问题描述", "suggestions": ["可直接执行的修改建议"] }
  ],
  "revised_script": "保留原剧本核心故事、针对所选维度优化后的完整剧本"
}
scores 必须且只能包含全部 ${selectedCriteria.length} 个选中维度，数值为 0-100。feedback 必须覆盖这些维度，每项给出 1-3 条具体建议。`
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: '仅支持 POST 请求' })
  if (!process.env.DEEPSEEK_API_KEY) return sendJson(response, 500, { error: '服务端未配置 DEEPSEEK_API_KEY' })

  try {
    const { script, criteria: selectedIds } = await readBody(request)
    if (typeof script !== 'string' || !script.trim()) return sendJson(response, 400, { error: '请提供剧本文本' })
    if (script.length > MAX_SCRIPT_LENGTH) return sendJson(response, 400, { error: `剧本文本不能超过 ${MAX_SCRIPT_LENGTH} 字` })
    if (!Array.isArray(selectedIds) || selectedIds.length < 1 || selectedIds.length > availableCriteria.length || new Set(selectedIds).size !== selectedIds.length || selectedIds.some((id) => typeof id !== 'string' || !criteriaById.has(id))) {
      return sendJson(response, 400, { error: '请至少选择一个有效的评估维度' })
    }
    const selectedCriteria = selectedIds.map((id) => criteriaById.get(id))
    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: '你是专业的中文男频漫剧剧本评估助手。遵循选中维度的评估规则，仅返回要求的 JSON。' },
          { role: 'user', content: createPrompt(script, selectedCriteria) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 8000,
      }),
    })
    if (!deepseekResponse.ok) {
      const details = await deepseekResponse.text()
      console.error('DeepSeek API error:', deepseekResponse.status, details)
      const error = deepseekResponse.status === 401 || deepseekResponse.status === 403
        ? 'DeepSeek API 密钥无效或无访问权限，请更新服务端配置'
        : 'DeepSeek 服务暂时不可用，请稍后重试'
      return sendJson(response, 502, { error })
    }
    const completion = await deepseekResponse.json()
    const content = completion.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('DeepSeek 未返回有效内容')
    sendJson(response, 200, normalizeResponse(content, selectedCriteria))
  } catch (error) {
    console.error('Evaluation error:', error)
    sendJson(response, 500, { error: '评估失败，请稍后重试' })
  }
}
