path = r"C:\Users\brian\OneDrive\SLP HARD DRIVE\00000-2026\GitHub Safety Portal\app\admin\lms\page.js"

with open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# The duplicate block — second occurrence of handleGenerateAudio
duplicate = '''
  async function handleGenerateAudio() {
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

  function openAdd() {'''

replacement = '''
  function openAdd() {'''

if duplicate in content:
    content = content.replace(duplicate, replacement, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: Duplicate handleGenerateAudio removed")
else:
    # Count occurrences to diagnose
    count = content.count('async function handleGenerateAudio()')
    print(f"Pattern not matched exactly. Found {count} occurrences of handleGenerateAudio.")
    print("Manual check needed — search for the second definition and delete it.")
