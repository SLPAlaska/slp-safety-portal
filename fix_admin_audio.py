import sys

path = 'app/admin/lms/page.js'
content = open(path, encoding='utf-8', errors='replace').read()

# Remove duplicate state lines if they exist
lines = content.split('\n')
seen = set()
deduped = []
skip_next = False
for line in lines:
    stripped = line.strip()
    # Detect duplicate useState declarations for our new vars
    if stripped in (
        'const [generatingAudio, setGeneratingAudio] = useState(false)',
        'const [audioResult, setAudioResult] = useState(null)',
    ):
        if stripped in seen:
            continue  # skip duplicate
        seen.add(stripped)
    deduped.append(line)

content = '\n'.join(deduped)

# Now ensure handleGenerateAudio exists
if 'handleGenerateAudio' not in content:
    old_open = "  function openAdd() {"
    new_open = """  async function handleGenerateAudio() {
    setError(''); setGeneratingAudio(true); setAudioResult(null)
    const res = await fetch('/api/lms/generate-audio', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ course_id: selectedCourse.id }),
    })
    const data = await res.json()
    setGeneratingAudio(false)
    if (!res.ok) { setError(data.error); return }
    setAudioResult(data)
  }

  function openAdd() {"""
    content = content.replace(old_open, new_open, 1)

# Ensure button exists
if 'Generate Audio with ElevenLabs' not in content:
    old_panel_end = "          </div>\n\n          {/* Stats */}"
    new_panel_end = """          <div style={{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid rgba(255,255,255,0.15)'}}>
              <div style={{fontSize:'13px',color:'rgba(255,255,255,0.9)',fontWeight:'700',marginBottom:'6px'}}>Professional Audio Narration</div>
              <p style={{fontSize:'12px',color:'rgba(255,255,255,0.7)',margin:'0 0 10px'}}>Generate studio-quality MP3 audio for each slide using ElevenLabs AI voices.</p>
              <button style={{...QB.aiBtn,background:'#10b981'}} onClick={handleGenerateAudio} disabled={generatingAudio}>
                {generatingAudio ? 'Generating Audio...' : 'Generate Audio with ElevenLabs'}
              </button>
              {audioResult && <div style={{...QB.aiResult,marginTop:'8px'}}>Audio generated for {audioResult.generated} slides.</div>}
            </div>
          </div>

          {/* Stats */}"""
    content = content.replace(old_panel_end, new_panel_end, 1)

open(path, 'w', encoding='utf-8').write(content)

checks = [
    'handleGenerateAudio' in content,
    'Generate Audio with ElevenLabs' in content,
    content.count('const [generatingAudio') == 1,
    content.count('const [audioResult') == 1,
]
print('All checks:', checks)
if not all(checks):
    sys.exit(1)
print('Done')
