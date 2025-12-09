// script.js

// Constants
const ROUNDS_PER_ROLL = 10;
const STORAGE_KEY = 'APP_PREDICTOR_STATE_V4_TerminatedPatterns'; 

// Global variables for game state
let currentDigit = null; 
let appPrediction = null; 
let appExtraPrediction = null; 
let currentRoll = 0; 
let roundInRoll = 0; 
let gameStartTime = null; 
const history = [];
let recordedPatterns = []; 

// UI element references
const currentDigitEl = document.getElementById('current-digit');
const roundDisplayEl = document.getElementById('round-display');
const inputAreaEl = document.getElementById('input-area');
const nextDigitInputEl = document.getElementById('next-digit-input');
const historyLogContainerEl = document.getElementById('history-log-container');
const appPredictionDisplayEl = document.getElementById('app-prediction-display');
const appPredictionEl = document.getElementById('app-prediction');
const appExtraPredictionDisplayEl = document.getElementById('app-extra-prediction-display'); 
const appExtraPredictionEl = document.getElementById('app-extra-prediction'); 
const currentDigitDisplayContainerEl = document.getElementById('current-digit-display'); 
const submitButtonEl = document.getElementById('submit-button'); 
const datetimeDisplayEl = document.getElementById('datetime-display'); 
const gameStartTimeEl = document.getElementById('game-start-time'); 
const patternWarningBoxEl = document.getElementById('pattern-warning-box'); 
const patternRecordsContainerEl = document.getElementById('pattern-records-container'); 

// Modal references
const modalOverlayEl = document.getElementById('confirmation-modal-overlay');
const modalConfirmButtonEl = document.getElementById('modal-confirm-button');
const modalCancelButtonEl = document.getElementById('modal-cancel-button');

// --- Confirmation Modal Logic ---

function hideConfirmationModal() {
     modalOverlayEl.classList.add('hidden');
}

function showConfirmationModal(message, onConfirm) {
    document.getElementById('confirmation-modal-message').textContent = message;
    
    modalOverlayEl.classList.remove('hidden'); 
    
    modalConfirmButtonEl.replaceWith(modalConfirmButtonEl.cloneNode(true));
    modalCancelButtonEl.replaceWith(modalCancelButtonEl.cloneNode(true));
    
    const confirmBtn = document.getElementById('modal-confirm-button');
    const cancelBtn = document.getElementById('modal-cancel-button');

    const handleConfirm = () => {
        hideConfirmationModal();
        onConfirm();
    };

    const handleCancel = () => {
        hideConfirmationModal();
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

function handleConfirmedReset() {
     localStorage.removeItem(STORAGE_KEY);
    recordedPatterns.length = 0; 
    initGame(); 
    alertUserMessage("ဂိမ်းအသစ် စတင်လိုက်ပါပြီ။"); 
}

// --- Local Storage Functions ---

function saveGameState() {
    try {
        const state = {
            history: history,
            currentDigit: currentDigit,
            currentRoll: currentRoll,
            roundInRoll: roundInRoll,
            gameStartTime: gameStartTime ? gameStartTime.toISOString() : null,
            appPrediction: appPrediction,
            appExtraPrediction: appExtraPrediction, 
            recordedPatterns: recordedPatterns,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Error saving game state to localStorage:", e);
    }
}

function loadGameState() {
    try {
        const storedState = localStorage.getItem(STORAGE_KEY);
        if (!storedState) return false;

        const state = JSON.parse(storedState);

        history.splice(0, history.length, ...state.history);
        recordedPatterns.splice(0, recordedPatterns.length, ...(state.recordedPatterns || [])); 
        
        currentDigit = state.currentDigit;
        currentRoll = state.currentRoll;
        roundInRoll = state.roundInRoll;
        appPrediction = state.appPrediction;
        appExtraPrediction = state.appExtraPrediction || null; 
        
        if (state.gameStartTime) {
            gameStartTime = new Date(state.gameStartTime);
        }

        console.log("Game state loaded successfully.");
        return true;

    } catch (e) {
        console.error("Error loading or parsing game state from localStorage:", e);
        localStorage.removeItem(STORAGE_KEY);
        return false;
    }
}

// --- Core Logic Functions (G, P, E Logics are locked) ---

function getGroup(digit) {
    // Target Group (G) Logic: 0-4 is S, 5-9 is B. (Correct logic)
    return digit >= 5 ? 'B' : 'S';
}

function makeAppPrediction() {
    if (currentDigit === null) {
        return null;
    }
    // P Logic: Even (0, 2, 4, 6, 8) -> S ; Odd (1, 3, 5, 7, 9) -> B
    if (currentDigit % 2 === 0) {
        return 'S';
    } 
    else {
        return 'B';
    }
}

function makeAppExtraPrediction() {
    if (history.length < 3) {
        return null; 
    }
    
    // E Logic: Sum of the last 3 userDigits (Manual Inputs) remainder
    const lastThree = history.slice(-3); 
    const sum = lastThree.reduce((total, item) => total + item.userDigit, 0); 
    
    if (sum % 2 === 0) {
        return 'S'; 
    } else {
        return 'B'; 
    }
}

function checkAndRecordPatterns() {
    const minPatternLength = 6;
    const minHistoryLengthForTermination = minPatternLength + 1; 

    if (history.length < minHistoryLengthForTermination) return;

    const fullGroupSequence = history.map(item => item.targetGroup).join('');
    
    const terminatorEntry = history[history.length - 1];
    const terminatorGroup = terminatorEntry.targetGroup;

    const lengths = [8, 7, 6]; 
    
    for (const len of lengths) {
        if (history.length > len) { 
            
            const patternSequence = fullGroupSequence.slice((len + 1) * -1, -1); 
            const patternStartGroup = patternSequence[0];
            const lastPatternGroup = patternSequence[len - 1];

            let patternType = null;
            let isTerminated = false;

            if (new Set(patternSequence).size === 1) {
                if (terminatorGroup !== patternStartGroup) {
                    patternType = 'တူညီဆက်တိုက် (Streak)';
                    isTerminated = true;
                }
            } 
            
            else { 
                let isSingleAlt = true;
                for (let i = 0; i < len - 1; i++) {
                    if (patternSequence[i] === patternSequence[i+1]) {
                        isSingleAlt = false; 
                        break;
                    }
                }
                if (isSingleAlt) {
                    if (terminatorGroup === lastPatternGroup) {
                        patternType = 'တစ်လှည့်စီ (Single Alt)';
                        isTerminated = true;
                    }
                }
            }
            
            if (patternType === null && (len === 6 || len === 8)) {
                const patterns = (len === 6) ? ['SSBBSS', 'BBSSBB'] : ['SSBBSSBB', 'BBSSBBSS'];
                
                if (patterns.includes(patternSequence)) {
                    if (terminatorGroup === lastPatternGroup) {
                        patternType = 'နှစ်ခုပူးတွဲ (Double Alt)';
                        isTerminated = true;
                    }
                }
            }


            if (isTerminated) {
                const patternEndEntry = history[history.length - 2]; 

                const isAlreadyRecorded = recordedPatterns.some(p => 
                    p.sequence === patternSequence && 
                    p.rollNumber === patternEndEntry.rollNumber &&
                    p.roundInRoll === patternEndEntry.roundInRoll
                );

                if (!isAlreadyRecorded) {
                    recordedPatterns.push({
                        patternType: patternType,
                        sequence: patternSequence,
                        length: len,
                        rollNumber: patternEndEntry.rollNumber,
                        roundInRoll: patternEndEntry.roundInRoll,
                        terminatorGroup: terminatorGroup, 
                        timestamp: patternEndEntry.timestamp,
                        id: `${patternEndEntry.rollNumber}-${patternEndEntry.roundInRoll}-${patternSequence}`, 
                    });
                    
                    alertUserMessage(`${patternSequence} ပုံစံ (L=${len}) သည် ${terminatorGroup} ဖြင့် ပြီးဆုံးသွားပြီဖြစ်၍ မှတ်တမ်းတင်လိုက်သည်။`);

                    break; 
                }
            }
        }
    }
}

function submitAnswer(userDigit) {
    
    const isFirstEntry = currentDigit === null;
    const targetGroup = getGroup(userDigit); // G is derived from userDigit

    // P Prediction Correctness Check: P is checked directly against G (targetGroup)
    const isCorrect = appPrediction === targetGroup; 
    
    // E Prediction Correctness Check: E is checked directly against G (targetGroup)
    const isExtraCorrect = appExtraPrediction !== null && appExtraPrediction === targetGroup;

    const previousRoll = currentRoll;
    const previousRoundInRoll = roundInRoll;

    const digitForSum = currentDigit !== null ? currentDigit : 0; 
    const sumRemainder = (digitForSum + userDigit) % 10;

    const roundData = {
        currentDigit: currentDigit, 
        appPrediction: appPrediction,
        appExtraPrediction: appExtraPrediction, 
        userDigit: userDigit, 
        targetGroup: targetGroup,
        isCorrect: isFirstEntry ? false : isCorrect, // First entry is always marked false
        isExtraCorrect: isFirstEntry ? false : isExtraCorrect, // First entry is always marked false
        rollNumber: previousRoll,
        roundInRoll: previousRoundInRoll,
        sumRemainder: sumRemainder, 
        timestamp: new Date().toLocaleTimeString('my-MM', {
            hour: '2-digit', minute: '2-digit', hour12: true
        })
    };
    history.push(roundData);
    
    currentDigit = userDigit; 
    
    if (isFirstEntry) {
        currentDigitDisplayContainerEl.classList.remove('hidden'); 
    }
    triggerFlashEffect();
    
    checkAndRecordPatterns();

    updateHistory(); 
    updatePatternRecordsUI();
    
    updatePatternWarningUI();

    if (previousRoundInRoll === ROUNDS_PER_ROLL) {
        currentRoll++;
        roundInRoll = 1; 
    } else {
        roundInRoll++;
    }
    
    appPrediction = makeAppPrediction();
    appExtraPrediction = makeAppExtraPrediction(); 
    
    updateUI();
    updatePredictionDisplays(); 
    
    saveGameState();
}

function updatePredictionDisplays() {
    // P (ပုံမှန်/Target Group Prediction)
    if (appPrediction !== null) {
        const solidClass = appPrediction === 'B' ? 'neon-solid-b' : 'neon-solid-s';
        appPredictionEl.innerHTML = `<span class="large-bubble ${solidClass}">${appPrediction}</span>`;
        appPredictionDisplayEl.classList.remove('hidden');
    } else {
        appPredictionEl.textContent = '...';
        appPredictionDisplayEl.classList.add('hidden');
    }
    
    // E (အထူးစိတ်ကြိုက်/Extra Prediction)
    if (appExtraPrediction !== null) {
        const borderClass = appExtraPrediction === 'B' ? 'neon-border-b' : 'neon-border-s';
         appExtraPredictionEl.innerHTML = `<span class="large-bubble ${borderClass}">${appExtraPrediction}</span>`;
         appExtraPredictionDisplayEl.classList.remove('hidden');
    } else {
         appExtraPredictionEl.textContent = '...';
         appExtraPredictionDisplayEl.classList.add('hidden');
    }
}


// --- UI Update & Utility Functions ---

function updatePatternRecordsUI() {
    // UNCHANGED
    patternRecordsContainerEl.innerHTML = '';
    
    if (recordedPatterns.length === 0) {
        patternRecordsContainerEl.innerHTML = '<p class="text-gray-500 text-sm text-center py-2">Pattern မှတ်တမ်းများ ဤနေရာတွင် ပေါ်လာမည်။</p>';
        return;
    }

    recordedPatterns.sort((a, b) => {
        if (a.rollNumber !== b.rollNumber) {
            return b.rollNumber - a.rollNumber;
        }
        return b.roundInRoll - a.roundInRoll;
    }).forEach(pattern => {
        const isDoubleAlt = pattern.patternType.includes('နှစ်ခုပူးတွဲ');
        const isSingleAlt = pattern.patternType.includes('တစ်လှည့်စီ');
        const isStreak = pattern.patternType.includes('တူညီဆက်တိုက်');
        
        const bgColor = isDoubleAlt ? 'bg-indigo-900/50 border-indigo-500' : 
                        isSingleAlt ? 'bg-teal-900/50 border-teal-500' : 
                        isStreak ? 'bg-green-900/50 border-green-500' : 'bg-gray-900/50 border-gray-500';

        const patternEl = document.createElement('div');
        patternEl.className = `p-2 rounded-lg text-xs font-mono border ${bgColor} flex justify-between items-center transition duration-200 hover:shadow-xl`;
        
        patternEl.innerHTML = `
            <div class="flex-shrink-0 w-1/4">
                <span class="font-bold text-gray-300 block">${pattern.patternType}</span>
                <span class="text-gray-400 text-[10px]">${pattern.length} အရှည်</span>
            </div>
            <div class="flex-grow text-center">
                <span class="text-lg font-extrabold text-yellow-300 leading-none">${pattern.sequence}</span>
                <span class="text-red-400 text-xs block">(ပြီးဆုံး: ${pattern.terminatorGroup})</span>
            </div>
            <div class="flex-shrink-0 w-1/4 text-right">
                <span class="font-bold text-red-300 block">Roll ${pattern.rollNumber} / S${pattern.roundInRoll}</span>
                <span class="text-gray-400 text-[10px]">${pattern.timestamp}</span>
            </div>
        `;
        patternRecordsContainerEl.appendChild(patternEl);
    });
}


function triggerFlashEffect() {
    // UNCHANGED
    currentDigitDisplayContainerEl.classList.remove('animate-flash');
    void currentDigitDisplayContainerEl.offsetWidth; 
    currentDigitDisplayContainerEl.classList.add('animate-flash');
}

function updateUI() {
    // UNCHANGED
    currentDigitEl.textContent = currentDigit !== null ? currentDigit : '...';
    roundDisplayEl.textContent = `Roll: ${currentRoll} | အဆင့်: ${roundInRoll} / ${ROUNDS_PER_ROLL}`;
}

function updateDateTime() {
    // UNCHANGED
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
    };
    const dateTimeString = now.toLocaleString('my-MM', options); 
    datetimeDisplayEl.textContent = dateTimeString;
}

function updateHistoryHeader() {
     // UNCHANGED
    if (gameStartTime) {
        const formattedTime = gameStartTime.toLocaleString('my-MM', {
            year: 'numeric', month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit', hour12: true
        });
        gameStartTimeEl.textContent = `စတင်ချိန်: ${formattedTime}`;
         gameStartTimeEl.classList.remove('hidden', 'sm:block'); 
    } else {
         gameStartTimeEl.textContent = `စတင်ချိန်: ---`;
         gameStartTimeEl.classList.add('hidden', 'sm:block'); 
    }
}

function updateHistory() {
    historyLogContainerEl.innerHTML = ''; 
    
    if (history.length === 0) {
        historyLogContainerEl.classList.remove('flex');
        historyLogContainerEl.classList.remove('space-x-3');
        historyLogContainerEl.innerHTML = '<p class="text-gray-500 min-w-full text-center" id="initial-history-msg">လေ့ကျင့်ခန်း မှတ်တမ်းများ ဤနေရာတွင် ပေါ်လာမည်။</p>';
        return;
    }
    
    historyLogContainerEl.classList.add('flex');
    historyLogContainerEl.classList.add('space-x-3');

    const rolls = history.reduce((acc, item) => {
        if (!acc[item.rollNumber]) {
            acc[item.rollNumber] = [];
        }
        acc[item.rollNumber].push(item);
        return acc;
    }, {});

    Object.keys(rolls).sort((a, b) => a - b).forEach(rollNumber => {
        const rollData = rolls[rollNumber];
        
        // Column width ကို ၂၀၀px သို့ သတ်မှတ်ထားသည်
        const rollColumn = document.createElement('div');
        rollColumn.className = 'flex-shrink-0 w-[200px] bg-gray-800 rounded-lg shadow-xl p-2 border border-gray-700';
        
        const rollHeader = document.createElement('h3');
        rollHeader.className = 'text-sm font-extrabold text-red-400 text-center mb-1 border-b border-red-600 pb-1';
        rollHeader.textContent = `Roll ${rollNumber}`;
        rollColumn.appendChild(rollHeader);

        // Header 6 နေရာခွဲသည် (အဆင့်, G, P-C, Digit, E, E-C)
        const headerRow = document.createElement('div');
        headerRow.className = 'flex justify-between items-center text-[10px] font-bold text-gray-400 mb-1 border-b border-gray-600 pb-0.5 px-0.5';
        headerRow.innerHTML = `
            <span class="w-[12%] text-left">အဆင့်</span>
            <span class="w-[15%] text-center">G</span> 
            <span class="w-[18%] text-center">P-C</span> 
            <span class="w-[18%] text-center">ဂဏန်း</span>  
            <span class="w-[15%] text-center">E</span>
            <span class="w-[22%] text-center">E-C</span>
        `;
        rollColumn.appendChild(headerRow);

        rollData.forEach(item => {
            const hasPrediction = item.appPrediction !== null;
            
            // Determine Row Background Color
            let entryBgClass = 'bg-transparent';
            if (hasPrediction && item.isCorrect) {
                entryBgClass = 'history-entry-correct-p';
            } else if (hasPrediction && !item.isCorrect) {
                entryBgClass = 'history-entry-incorrect-p';
                // If P is wrong but E is correct, highlight slightly differently
                if (item.appExtraPrediction !== null && item.isExtraCorrect) {
                    entryBgClass = 'history-entry-correct-e'; // Use E's color for visual cue
                }
            } 
            
            // G (Target Group) Bubble Style
            const targetBubbleClass = item.targetGroup === 'B' ? 'neon-solid-b' : 'neon-solid-s';
            
            // P Correctness Icon
            const pCorrectnessIcon = hasPrediction ? (item.isCorrect ? '✅' : '❌') : '—';
            
            // E (Extra Prediction) Bubble Style
            const extraPrediction = item.appExtraPrediction;
            let extraBubbleContent = '—';
            if (extraPrediction) {
                const extraBubbleClass = extraPrediction === 'B' ? 'neon-border-b' : 'neon-border-s';
                 extraBubbleContent = `<span class="history-bubble ${extraBubbleClass}">${extraPrediction}</span>`;
            }
            
            // E Correctness Icon (Uses isExtraCorrect state)
            const eCorrectnessIcon = item.appExtraPrediction !== null ? (item.isExtraCorrect ? '✅' : '❌') : '—'; 


            const roundEntry = document.createElement('div');
            roundEntry.className = `flex justify-between items-center text-xs font-mono px-0.5 py-1.5 rounded-sm transition duration-100 ${entryBgClass}`;
            
            roundEntry.innerHTML = `
                <span class="font-semibold text-gray-300 w-[12%] text-left">${item.roundInRoll}</span>
                
                <span class="w-[15%] text-center leading-none">
                    <span class="history-bubble ${targetBubbleClass}">${item.targetGroup}</span>
                </span>

                <span class="font-extrabold text-white w-[18%] text-center text-base leading-none">${pCorrectnessIcon}</span>

                <span class="font-bold text-yellow-300 w-[18%] text-center">${item.userDigit}</span> 

                <span class="w-[15%] text-center leading-none">
                     ${extraBubbleContent}
                </span>

                <span class="font-extrabold text-white w-[22%] text-center text-base leading-none">${eCorrectnessIcon}</span>
            `;
            rollColumn.appendChild(roundEntry);
        });

        historyLogContainerEl.appendChild(rollColumn);
    });
    
    historyLogContainerEl.scrollLeft = historyLogContainerEl.scrollWidth;
}

// --- CSV Generation Functions (Modified for Symbols) ---

function generateCSV() {
    let csv = '';
    if (gameStartTime) {
        const formattedTime = gameStartTime.toLocaleString('en-US', {
            year: 'numeric', month: 'numeric', day: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false, timeZoneName: 'short'
        }).replace(/,/g, ''); 
        csv += `"မှတ်တမ်းစတင်ချိန် (Game Start Time)","${formattedTime}"\n`;
    }
    
    // Header
    const headers = ["Roll", "Round", "Target Group (G)", "User Digit", "P Prediction", "P Correct", "E Prediction", "E Correct"]; 
    csv += headers.join(',') + '\n';
    
    history.forEach(item => {
        // P Correctness ကို သင်္ကေတဖြင့် ပြောင်းလဲခြင်း
        const pCorrectSymbol = item.appPrediction !== null ? (item.isCorrect ? '✅' : '❌') : '—';
        
        // E Correctness ကို သင်္ကေတဖြင့် ပြောင်းလဲခြင်း
        const eCorrectSymbol = item.appExtraPrediction !== null ? (item.isExtraCorrect ? '✅' : '❌') : '—';

        const row = [
            item.rollNumber,
            item.roundInRoll,
            item.targetGroup, 
            item.userDigit, 
            item.appPrediction || '—', // B/S ကို '—' ဖြင့်အစားထိုး
            pCorrectSymbol,
            item.appExtraPrediction || '—', // B/S ကို '—' ဖြင့်အစားထိုး
            eCorrectSymbol
        ];
        csv += row.join(',') + '\n';
    });

    return csv;
}

async function copyCSVToClipboard() {
    if (history.length === 0) {
        alertUserMessage("မှတ်တမ်းထဲတွင် ထည့်သွင်းရန် အချက်အလက် မရှိသေးပါ!");
        return;
    }
    
    const csvData = generateCSV();
    const copyButton = document.getElementById('copy-csv-button');
    const copyTextSpan = document.getElementById('copy-csv-text');
    const originalText = copyTextSpan.textContent;
    
    copyButton.disabled = true;

    try {
        // Use the correct encoding for symbols (UTF-8)
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvData], {type: "text/csv;charset=utf-8"}); // Added BOM for UTF-8 compatibility
        const data = await blob.text(); // Read back as text
        
        await navigator.clipboard.writeText(data);

        copyTextSpan.textContent = ' ကူးယူပြီးပါပြီ!';
        copyButton.classList.remove('bg-blue-600');
        copyButton.classList.add('bg-green-600');
        
    } catch (err) {
        console.error("Copy failed using navigator.clipboard:", err);
        
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = csvData;
        tempTextArea.style.position = 'absolute';
        tempTextArea.style.left = '-9999px'; 
        document.body.appendChild(tempTextArea);
        tempTextArea.select(); 
        
        try {
            // Fallback using execCommand
            document.execCommand('copy');
            copyTextSpan.textContent = ' ကူးယူပြီးပါပြီ!';
            copyButton.classList.remove('bg-blue-600');
            copyButton.classList.add('bg-green-600');
        } catch (execErr) {
            console.error("Copy failed using execCommand:", execErr);
            copyTextSpan.textContent = ' ကူးယူမရပါ';
            copyButton.classList.remove('bg-blue-600');
            copyButton.classList.add('bg-red-600');
            alertUserMessage("ကူးယူရန် မအောင်မြင်ပါ! Console ကို စစ်ဆေးပါ။");
        } finally {
            document.body.removeChild(tempTextArea);
        }
    } finally {
        setTimeout(() => {
            copyTextSpan.textContent = originalText;
            copyButton.disabled = false;
            copyButton.classList.add('bg-blue-600');
            copyButton.classList.remove('bg-green-600', 'bg-red-600');
        }, 3000);
    }
}


// --- Other UI/Utility Functions ---

function alertUserMessage(message) {
    const container = document.getElementById('game-container');
    let msgBox = document.getElementById('user-alert-box');
    if (!msgBox) {
        msgBox = document.createElement('div');
        msgBox.id = 'user-alert-box';
        msgBox.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white p-3 rounded-lg shadow-2xl z-50 transition duration-300 opacity-0 pointer-events-none text-center';
        document.body.appendChild(msgBox);
    }
    msgBox.textContent = message;
    msgBox.style.opacity = '1';
    msgBox.style.pointerEvents = 'auto';
    
    setTimeout(() => {
        msgBox.style.opacity = '0';
        msgBox.style.pointerEvents = 'none';
    }, 3000);
}

function getPatternWarning() {
    const minCheckLength = 3;
    if (history.length < minCheckLength) return { pattern: null, message: null }; 

    const gSequence = history.slice(-8).map(item => item.targetGroup).join('');
    const len = gSequence.length;
    
    const isStreak = (seq) => !seq.includes(seq[0] === 'S' ? 'B' : 'S');
    const isSingleAlternating = (seq) => {
        for (let i = 0; i < seq.length - 1; i++) {
            if (seq[i] === seq[i+1]) return false;
        }
        return true;
    };

    for (let l = Math.min(len, 8); l >= 4; l--) {
        const subSeq = gSequence.slice(l * -1);
        if (isStreak(subSeq)) {
            return { 
                pattern: subSeq, 
                message: `${subSeq} ပုံစံ (တူညီခြင်း) ဆက်တိုက် ${l} ကြိမ်ဖြစ်နေသည်။ သတိထားပါ။`
            };
        }
    }
    
    const doubleAltPatterns = {
        4: ['SSBB', 'BBSS'],
        8: ['SSBBSSBB', 'BBSSBBSS']
    };
    for (const l of [8, 4]) {
        if (len >= l) {
            const subSeq = gSequence.slice(l * -1);
            if (doubleAltPatterns[l] && doubleAltPatterns[l].includes(subSeq)) {
                return { 
                    pattern: subSeq, 
                    message: `${subSeq} ပုံစံ (နှစ်ခုပူးတွဲ တစ်လှည့်စီ) ဆက်တိုက် ${l} ကြိမ်ဖြစ်နေသည်။ သတိထားပါ။`
                };
            }
        }
    }

    for (let l = Math.min(len, 8); l >= 3; l--) {
        const subSeq = gSequence.slice(l * -1);
        if (isSingleAlternating(subSeq)) {
             return { 
                pattern: subSeq, 
                message: `${subSeq} ပုံစံ (တစ်လှည့်စီ) ဆက်တိုက် ${l} ကြိမ်ဖြစ်နေသည်။ သတိထားပါ။`
            };
        }
    }

    return { pattern: null, message: null };
}

function updatePatternWarningUI() {
    const warning = getPatternWarning();
    
    if (warning.message) {
        patternWarningBoxEl.textContent = warning.message;
        patternWarningBoxEl.classList.remove('hidden');
        patternWarningBoxEl.style.opacity = '1';
    } else {
        patternWarningBoxEl.style.opacity = '0';
        setTimeout(() => {
            patternWarningBoxEl.classList.add('hidden');
        }, 300); 
    }
}

function initGame() {
    let stateLoaded = loadGameState();

    if (!stateLoaded) {
        currentRoll = 1;
        roundInRoll = 1;
        history.length = 0;
        recordedPatterns.length = 0; 
        currentDigit = null; 
        gameStartTime = new Date();
        appPrediction = null; 
        appExtraPrediction = null; 
    }
    
    if(stateLoaded) {
         appPrediction = makeAppPrediction();
         appExtraPrediction = makeAppExtraPrediction(); 
    }

    
    updateUI();
    updateHistory();
    updatePatternRecordsUI(); 
    updateDateTime(); 
    updateHistoryHeader(); 
    updatePatternWarningUI();
    updatePredictionDisplays(); 
    
    if (!window.dateTimeInterval) {
         window.dateTimeInterval = setInterval(updateDateTime, 1000);
    }

    inputAreaEl.classList.remove('hidden');
    
    setTimeout(() => {
        nextDigitInputEl.focus();
    }, 50);

    submitButtonEl.disabled = true;

    if (currentDigit === null) {
         currentDigitDisplayContainerEl.classList.add('hidden');
    } else {
         currentDigitDisplayContainerEl.classList.remove('hidden');
         triggerFlashEffect(); 
    }
}

function handleInput(event) {
    const inputEl = event.target;
    let value = inputEl.value.trim();

    if (value.length > 1) {
        value = value.charAt(0);
    }
    inputEl.value = value; 

    const isValid = value.length === 1 && /^[0-9]$/.test(value);
    submitButtonEl.disabled = !isValid;
}

function checkEnter(event) {
    if (event.key === 'Enter' && !submitButtonEl.disabled) {
        event.preventDefault(); 
        submitDigit();
    }
}

function submitDigit() {
    const inputEl = nextDigitInputEl;
    const value = inputEl.value.trim();

    if (value.length === 1 && /^[0-9]$/.test(value)) {
        const userDigit = parseInt(value);
        
        submitAnswer(userDigit);

        inputEl.value = '';
        submitButtonEl.disabled = true;
        inputEl.focus(); 

    } else {
        console.warn("Invalid input digit for submission.");
    }
}

// Global functions exposed to HTML via inline handlers
window.showConfirmationModal = showConfirmationModal;
window.handleConfirmedReset = handleConfirmedReset;
window.copyCSVToClipboard = copyCSVToClipboard;
window.handleInput = handleInput;
window.checkEnter = checkEnter;
window.submitDigit = submitDigit;

window.onload = initGame; 
