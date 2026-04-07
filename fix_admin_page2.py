import sys
content = open('app/admin/lms/page.js', encoding='utf-8', errors='replace').read()
old = "    setJobId(data.job_id)\n    setJobProgress({ status: 'pending', progress: 0, total_slides: data.total_slides, percent: 0 })\n    const edgeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/process-ai-job'\n    fetch(edgeUrl, {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },\n      body: JSON.stringify({ job_id: data.job_id }),\n    }).catch(err => console.error('Edge function error:', err))"
new = "    // Route handles everything synchronously — poll job status for progress\n    setJobId(data.job_id)\n    setJobProgress({ status: data.status || 'running', progress: data.slides_processed || 0, total_slides: data.total_slides, percent: data.total_slides > 0 ? Math.round(((data.slides_processed||0)/data.total_slides)*100) : 0 })\n    if (data.status === 'complete') {\n      setGenerating(false)\n      setJobId(null)\n      loadQuestions()\n    }"
result = content.replace(old, new)
if result == content:
    print('ERROR: String not found')
    sys.exit(1)
open('app/admin/lms/page.js', 'w', encoding='utf-8').write(result)
print('Done')
