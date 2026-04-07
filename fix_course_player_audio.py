import sys

path = 'app/lms/course/[id]/page.js'
content = open(path, encoding='utf-8', errors='replace').read()

# Add audio ref and public URL helper
old_refs = """  const utteranceRef = useRef(null)
  const skipTimerRef = useRef(null)
  const slideTimeRef = useRef(null)"""

new_refs = """  const utteranceRef = useRef(null)
  const skipTimerRef = useRef(null)
  const slideTimeRef = useRef(null)
  const audioRef = useRef(null)

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  function getAudioUrl(audioPath) {
    if (!audioPath) return null
    return SUPABASE_URL + '/storage/v1/object/public/lms-audio/' + audioPath
  }"""

result = content.replace(old_refs, new_refs)
if result == content:
    print('ERROR: refs not found')
    sys.exit(1)

# Replace narrateSlide to use MP3 when available
old_narrate = """  // Narrate current slide
  const narrateSlide = useCallback((slide, rate) => {
    window.speechSynthesis?.cancel()
    if (!slide?.speaker_notes) {
      setNarrating(false)
      setCanAdvance(true)
      return
    }

    setNarrating(true)
    setCanAdvance(false)
    setSkipVisible(false)

    // Show skip button after 5 seconds
    skipTimerRef.current = setTimeout(() => setSkipVisible(true), 5000)

    const utterance = new SpeechSynthesisUtterance(slide.speaker_notes)
    utterance.rate = rate || 1
    utterance.onend = () => {
      setNarrating(false)
      setCanAdvance(true)
      clearTimeout(skipTimerRef.current)
    }
    utterance.onerror = () => {
      setNarrating(false)
      setCanAdvance(true)
    }
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])"""

new_narrate = """  // Narrate current slide -- use ElevenLabs MP3 if available, fallback to Web Speech
  const narrateSlide = useCallback((slide, rate) => {
    window.speechSynthesis?.cancel()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }

    if (!slide?.speaker_notes && !slide?.audio_path) {
      setNarrating(false)
      setCanAdvance(true)
      return
    }

    setNarrating(true)
    setCanAdvance(false)
    setSkipVisible(false)
    skipTimerRef.current = setTimeout(() => setSkipVisible(true), 5000)

    const audioUrl = getAudioUrl(slide.audio_path)
    if (audioUrl) {
      // Use ElevenLabs MP3
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.onended = () => {
        setNarrating(false)
        setCanAdvance(true)
        clearTimeout(skipTimerRef.current)
        audioRef.current = null
      }
      audio.onerror = () => {
        setNarrating(false)
        setCanAdvance(true)
        audioRef.current = null
      }
      audio.play().catch(() => {
        setNarrating(false)
        setCanAdvance(true)
      })
    } else if (slide.speaker_notes) {
      // Fallback to Web Speech API
      const utterance = new SpeechSynthesisUtterance(slide.speaker_notes)
      utterance.rate = rate || 1
      utterance.onend = () => {
        setNarrating(false)
        setCanAdvance(true)
        clearTimeout(skipTimerRef.current)
      }
      utterance.onerror = () => {
        setNarrating(false)
        setCanAdvance(true)
      }
      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    } else {
      setNarrating(false)
      setCanAdvance(true)
    }
  }, [])"""

result = result.replace(old_narrate, new_narrate)
if 'ElevenLabs MP3' not in result:
    print('ERROR: narrateSlide not found')
    sys.exit(1)

# Also update handleSkip to stop MP3
old_skip = """  function handleSkip() {
    window.speechSynthesis?.cancel()
    clearTimeout(skipTimerRef.current)
    setNarrating(false)
    setCanAdvance(true)
    setSkipVisible(false)
  }"""

new_skip = """  function handleSkip() {
    window.speechSynthesis?.cancel()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    clearTimeout(skipTimerRef.current)
    setNarrating(false)
    setCanAdvance(true)
    setSkipVisible(false)
  }"""

result = result.replace(old_skip, new_skip)

open(path, 'w', encoding='utf-8').write(result)
print('Done')
