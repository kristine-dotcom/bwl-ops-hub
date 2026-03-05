export const config = {
  maxDuration: 60,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'Missing ANTHROPIC_API_KEY' } })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify(req.body)
    })

    const contentType = response.headers.get('content-type') || ''
    let data

    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      console.error('Non-JSON response from Anthropic:', text)
      data = { error: { message: text || 'Unknown error from Anthropic' } }
    }

    return res.status(response.status).json(data)
  } catch (err) {
    console.error('Claude API error:', err)
    return res.status(500).json({ error: { message: err.message } })
  }
}
