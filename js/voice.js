// עטיפה קלילה סביב Web Speech API לזיהוי קולי בעברית

let _recognition = null;
let _finalTranscript = '';
let _isListening = false;

function isSpeechSupported() {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

function startListening(onError) {
  if (!isSpeechSupported()) {
    if (onError) onError(new Error('unsupported'));
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  _recognition = new SR();
  _recognition.lang = 'he-IL';
  _recognition.interimResults = false;
  _recognition.continuous = true;
  _finalTranscript = '';
  _isListening = true;

  _recognition.onresult = function (event) {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        _finalTranscript += event.results[i][0].transcript + ' ';
      }
    }
  };
  _recognition.onerror = function (event) {
    if (onError) onError(event);
  };

  try {
    _recognition.start();
  } catch (e) {
    if (onError) onError(e);
  }
}

function stopListening(callback) {
  if (!_recognition || !_isListening) {
    callback('');
    return;
  }
  _isListening = false;
  _recognition.onend = function () {
    callback(_finalTranscript.trim());
  };
  try {
    _recognition.stop();
  } catch (e) {
    callback(_finalTranscript.trim());
  }
}
