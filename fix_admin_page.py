import sys
content = open('app/admin/lms/page.js', encoding='utf-8', errors='replace').read()
old = "  async function handleAIGenerate() {\n    setError(''); setGenerating(true); setJobProgress(null)\n    const res = await fetch('/api/lms/ai-generate', {\n      method: 'POST',\n      headers: {'Content-Type':'application/json'},\n      body: JSON.stringify({course_id: selectedCourse.id, mode: generateMode})\n    })\n    const data = await res.json()\n    if (!res.ok) { setError(data.error); setGenerating(false); return }\n    setJobId(data.job_id)\n    setJobProgress({ status: 'pending', progress: 0, total_slides: data.total_slides, percent: 0 })\n  }"
new = "  async function handleAIGenerate() {\n    setError(''); setGenerating(true); setJobProgress(null)\n    const res = await fetch('/api/lms/ai-generate', {\n      method: 'POST',\n      headers: {'Content-Type':'application/json'},\n      body: JSON.stringify({course_id: selectedCourse.id, mode: generateMode})\n    })\n    const data = await res.json()\n    if (!res.ok) { setError(data.error); setGenerating(false); return }\n    setJobId(data.job_id)\n    setJobProgress({ status: 'pending', progress: 0, total_slides: data.total_slides, percent: 0 })\n    const edgeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/process-ai-job'\n    fetch(edgeUrl, {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },\n      body: JSON.stringify({ job_id: data.job_id }),\n    }).catch(err => console.error('Edge function error:', err))\n  }"
result = content.replace(old, new)
if result == content:
    print('ERROR: String not found')
    sys.exit(1)
open('app/admin/lms/page.js', 'w', encoding='utf-8').write(result)
print('Done')
