path = r'app\api\lms\ai-generate\route.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """    // Fire and forget -- do NOT await, return immediately
    const edgeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/process-ai-job'
    fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ job_id: job.id, slide_index: 0 })
    }).catch(err => console.error('Edge trigger error:', err))
    return NextResponse.json({ job_id: job.id, total_slides: count })"""

new = """    const edgeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/process-ai-job'
    await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ job_id: job.id, slide_index: 0 })
    }).catch(err => console.error('Edge trigger error:', err))
    return NextResponse.json({ job_id: job.id, total_slides: count })"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done.')
else:
    print('ERROR: Target string not found. No changes made.')
