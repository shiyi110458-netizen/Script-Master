import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import handler from './evaluate.js'

const originalFetch = globalThis.fetch
const originalKey = process.env.DEEPSEEK_API_KEY

before(() => { process.env.DEEPSEEK_API_KEY = 'test-key' })
after(() => {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.DEEPSEEK_API_KEY
  else process.env.DEEPSEEK_API_KEY = originalKey
})

async function request(body) {
  let status
  let payload
  await handler({ method: 'POST', body }, {
    setHeader() {},
    set statusCode(value) { status = value },
    end(value) { payload = JSON.parse(value) },
  })
  return { status, payload }
}

test('rejects an empty dimension selection', async () => {
  const response = await request({ script: '剧本正文', criteria: [] })
  assert.equal(response.status, 400)
})

test('sends only selected document prompts and returns only selected results', async () => {
  let sentPrompt = ''
  globalThis.fetch = async (_url, options) => {
    sentPrompt = JSON.parse(options.body).messages[1].content
    return {
      ok: true,
      async json() {
        return { choices: [{ message: { content: JSON.stringify({
          scores: { '主线是否清晰': 78 },
          feedback: [{ name: '主线是否清晰', problem: '目标不明确', suggestions: ['明确目标'] }],
          revised_script: '优化后的剧本',
        }) } }] }
      },
    }
  }
  const response = await request({ script: '剧本正文', criteria: ['1'] })
  assert.equal(response.status, 200)
  assert.match(sentPrompt, /你是「男频漫剧剧本评估AI」/)
  assert.doesNotMatch(sentPrompt, /【开头与钩子】/)
  assert.deepEqual(response.payload.scores, [{ subject: '主线是否清晰', value: 78, fullMark: 100 }])
  assert.equal(response.payload.overall, 78)
  assert.equal(response.payload.feedback[0].problem, '目标不明确')
})
