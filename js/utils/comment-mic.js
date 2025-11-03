(function(){
    if (window.attachCommentMic) return;

    let active = null; // {recognition, button, textarea}

    function createRecognition(){
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return null;
        const r = new SR();
        r.lang = 'he-IL';
        r.interimResults = true;
        r.continuous = true;
        return r;
    }

    function stopActive(manual){
        if (!active) return;
        try { active.recognition.stop(); } catch(_){}
        active.button.classList.remove('listening');
        active.button.textContent = '🎤';
        active = null;
    }

    function startFor(button, textarea){
        // כבה קודם אם יש משהו פעיל
        stopActive(true);

        const rec = createRecognition();
        if (!rec){
            button.disabled = true;
            button.title = 'הקלטה קולית לא נתמכת בדפדפן זה';
            return;
        }

        const baseAtStart = textarea.value;
        active = { recognition: rec, button, textarea };
        button.classList.add('listening');
        button.textContent = '🔴';

        rec.onresult = (ev)=>{
            let txt = baseAtStart;
            for (let i=ev.resultIndex;i<ev.results.length;i++){
                const res = ev.results[i];
                const tr = res[0].transcript;
                if (res.isFinal){
                    txt = (txt && !txt.endsWith(' ') ? txt + ' ' : txt) + tr.trim();
                }
            }
            textarea.value = txt;
        };
        rec.onend = ()=>{
            // אם המערכת סגרה - ננקה
            if (active && active.recognition === rec){
                stopActive(false);
            }
        };
        rec.onerror = ()=>{
            if (active && active.recognition === rec){
                stopActive(false);
            }
        };
        try { rec.start(); } catch(_){ stopActive(false); }
    }

    function attach(button, textarea){
        if (!button || !textarea) return;
        if (button._commentMicAttached) return;
        button._commentMicAttached = true;

        // הסרת ההתנהגות של קליק רגיל - רק לחיצה ארוכה
        button.addEventListener('click', e=>{
            e.preventDefault();
            e.stopPropagation();
            // לא עושים כלום בקליק רגיל
        });

        // לחיצה ארוכה – מקליט רק בזמן ההחזקה
        let isRecording = false;
        
        function pressStart(e){
            e.preventDefault();
            if (isRecording) return;
            isRecording = true;
            startFor(button, textarea);
        }
        
        function pressEnd(e){
            e.preventDefault();
            if (!isRecording) return;
            isRecording = false;
            if (active && active.button === button){
                stopActive(true);
            }
        }

        // עבור עכבר
        button.addEventListener('mousedown', pressStart);
        button.addEventListener('mouseup', pressEnd);
        button.addEventListener('mouseleave', pressEnd);
        
        // עבור מגע
        button.addEventListener('touchstart', pressStart, { passive: false });
        button.addEventListener('touchend', pressEnd);
        button.addEventListener('touchcancel', pressEnd);
    }

    window.attachCommentMic = attach;
    window.stopAllCommentMics = ()=>stopActive(true);
})();