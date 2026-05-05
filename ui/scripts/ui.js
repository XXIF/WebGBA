// === SETTINGS STATE ===
let currentDpadMode = 'dpad';
let gameLoaded = false;

// === PAUSE STATE CALLBACK ===
window.onPauseStateChange = function(isPaused) {
    const btn = document.getElementById('btnPause');
    if (btn) {
        let icon = btn.querySelector('i');
        let textSpan = btn.querySelector('.btn-text');
        
        if (!icon) {
            icon = document.createElement('i');
        }
        if (!textSpan) {
            textSpan = document.createElement('span');
            textSpan.className = 'btn-text';
        }
        
        btn.innerHTML = '';
        
        if (isPaused) {
            icon.className = 'fa-solid fa-play';
            textSpan.textContent = '继续游戏';
        } else {
            icon.className = 'fa-solid fa-pause';
            textSpan.textContent = '暂停游戏';
        }
        
        btn.appendChild(icon);
        btn.appendChild(textSpan);
    }
};

// === SYNC PAUSE BUTTON STATE ===
function syncPauseButtonState() {
    if (gba && typeof gba.paused !== 'undefined') {
        window.onPauseStateChange(gba.paused);
    }
}

function toggleSettingsPanel() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('visible');
}

function toggleHelpModal() {
    const modal = document.getElementById('helpModal');
    modal.classList.toggle('visible');
}

// === TAB SWITCHING ===
function switchSettingsTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.settings-tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Show selected tab content
    const targetContent = document.getElementById('tab-' + tabName);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Add active class to selected tab
    const targetTab = document.querySelector(`.settings-tab[data-tab="${tabName}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

function setDpadMode(mode) {
    currentDpadMode = mode;
    const joystick = document.getElementById('joystickContainer');
    const dpad = document.getElementById('dpadContainer');
    
    if (mode === 'joystick') {
        joystick.classList.remove('hidden');
        dpad.classList.remove('visible');
    } else {
        joystick.classList.add('hidden');
        dpad.classList.add('visible');
    }
}

function updateButtonLayout() {
    const checkedRadio = document.querySelector('input[name="btnConfig"]:checked');
    if (!checkedRadio) return;

    const selectedLayout = checkedRadio.value;
    const actionButtons = document.getElementById('actionButtons');
    if (!actionButtons) return;
    
    actionButtons.classList.remove('layout-ab', 'layout-xy');
    
    switch(selectedLayout) {
        case 'ab':
            // Only A&B: horizontal layout
            actionButtons.classList.add('layout-ab');
            break;
        case 'xy':
            // Only X&Y: horizontal layout
            actionButtons.classList.add('layout-xy');
            break;
        case 'all':
            // All buttons: diamond layout
            break;
    }
}

// === CONTROL MODE (Dpad/Joystick) ===
function setControlMode(mode) {
    setDpadMode(mode);
}

// === BUTTON CONFIG ===
function setButtonConfig(config) {
    const radios = document.querySelectorAll('input[name="btnConfig"]');
    radios.forEach(radio => {
        if (radio.value === config) {
            radio.checked = true;
        }
    });
    updateButtonLayout();
}

// === JOYSTICK HANDLING ===
let joystickActive = false;
let joystickX = 0;
let joystickY = 0;
const joystickMax = 40;

function initJoystick() {
    const container = document.getElementById('joystickContainer');
    const handle = document.getElementById('joystickHandle');

    if (!container || !handle) return;

    function handleStart(e) {
        e.preventDefault();
        joystickActive = true;
        handle.classList.add('active');
        updateJoystick(e);
    }

    function handleMove(e) {
        if (!joystickActive) return;
        e.preventDefault();
        updateJoystick(e);
    }

    function handleEnd(e) {
        e.preventDefault();
        joystickActive = false;
        handle.classList.remove('active');
        joystickX = 0;
        joystickY = 0;
        handle.style.transform = 'translate(-50%, -50%)';
        releaseAllDirections();
    }

    function updateJoystick(e) {
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        let dx = clientX - centerX;
        let dy = clientY - centerY;

        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > joystickMax) {
            const ratio = joystickMax / distance;
            dx *= ratio;
            dy *= ratio;
        }

        joystickX = dx;
        joystickY = dy;

        handle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        updateJoystickInput();
    }

    function updateJoystickInput() {
        if (!gba || !gba.keypad) return;
        
        const threshold = 15;
        const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        
        directions.forEach(dir => releaseKey(dir));

        if (joystickY < -threshold) pressKey('UP');
        if (joystickY > threshold) pressKey('DOWN');
        if (joystickX < -threshold) pressKey('LEFT');
        if (joystickX > threshold) pressKey('RIGHT');
    }

    function releaseAllDirections() {
        if (!gba || !gba.keypad) return;
        ['UP', 'DOWN', 'LEFT', 'RIGHT'].forEach(dir => releaseKey(dir));
    }

    container.addEventListener('touchstart', handleStart, { passive: false });
    container.addEventListener('touchmove', handleMove, { passive: false });
    container.addEventListener('touchend', handleEnd, { passive: false });
    container.addEventListener('touchcancel', handleEnd, { passive: false });

    container.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
}

// === D-PAD HANDLING ===
function initDPad() {
    const directions = [
        { id: 'dpadUp', key: 'UP' },
        { id: 'dpadDown', key: 'DOWN' },
        { id: 'dpadLeft', key: 'LEFT' },
        { id: 'dpadRight', key: 'RIGHT' }
    ];

    directions.forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            pressKey(key);
            el.classList.add('pressed');
        }, { passive: false });

        el.addEventListener('touchend', (e) => {
            e.preventDefault();
            releaseKey(key);
            el.classList.remove('pressed');
        }, { passive: false });

        el.addEventListener('touchcancel', () => {
            releaseKey(key);
            el.classList.remove('pressed');
        });

        el.addEventListener('mousedown', () => {
            pressKey(key);
            el.classList.add('pressed');
        });

        el.addEventListener('mouseup', () => {
            releaseKey(key);
            el.classList.remove('pressed');
        });

        el.addEventListener('mouseleave', () => {
            releaseKey(key);
            el.classList.remove('pressed');
        });
    });
}

// === VIRTUAL BUTTON HANDLING ===
function initVirtualButtons() {
    const buttons = [
        { id: 'btnA', key: 'A' },
        { id: 'btnB', key: 'B' },
        { id: 'btnX', key: 'A' },
        { id: 'btnY', key: 'B' },
        { id: 'btnL', key: 'L' },
        { id: 'btnR', key: 'R' },
        { id: 'btnStart', key: 'START' },
        { id: 'btnSelect', key: 'SELECT' }
    ];

    buttons.forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            pressKey(key);
            el.classList.add('pressed');
        }, { passive: false });

        el.addEventListener('touchend', (e) => {
            e.preventDefault();
            releaseKey(key);
            el.classList.remove('pressed');
        }, { passive: false });

        el.addEventListener('touchcancel', () => {
            releaseKey(key);
            el.classList.remove('pressed');
        });

        el.addEventListener('mousedown', () => {
            pressKey(key);
            el.classList.add('pressed');
        });

        el.addEventListener('mouseup', () => {
            releaseKey(key);
            el.classList.remove('pressed');
        });

        el.addEventListener('mouseleave', () => {
            releaseKey(key);
            el.classList.remove('pressed');
        });
    });
}

function pressKey(key) {
    if (!gba || !gba.keypad) return;
    const keyMap = {
        'A': gba.keypad.A,
        'B': gba.keypad.B,
        'SELECT': gba.keypad.SELECT,
        'START': gba.keypad.START,
        'RIGHT': gba.keypad.RIGHT,
        'LEFT': gba.keypad.LEFT,
        'UP': gba.keypad.UP,
        'DOWN': gba.keypad.DOWN,
        'R': gba.keypad.R,
        'L': gba.keypad.L
    };
    const toggle = 1 << keyMap[key];
    gba.keypad.currentDown &= ~toggle;
}

function releaseKey(key) {
    if (!gba || !gba.keypad) return;
    const keyMap = {
        'A': gba.keypad.A,
        'B': gba.keypad.B,
        'SELECT': gba.keypad.SELECT,
        'START': gba.keypad.START,
        'RIGHT': gba.keypad.RIGHT,
        'LEFT': gba.keypad.LEFT,
        'UP': gba.keypad.UP,
        'DOWN': gba.keypad.DOWN,
        'R': gba.keypad.R,
        'L': gba.keypad.L
    };
    const toggle = 1 << keyMap[key];
    gba.keypad.currentDown |= toggle;
}

// === UI FUNCTIONS ===
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function showGameUI(romName) {
    gameLoaded = true;
    document.getElementById('loadHint').classList.add('hidden');
    document.getElementById('centerButtons').classList.add('visible');

    initControlsState();
    
    // 同步暂停按钮状态
    syncPauseButtonState();
    
    // 启用游戏控制按钮
    setGameControlsEnabled(true);

    // 根据开关状态显示虚拟按键
    const virtualToggle = document.getElementById('virtualButtonsToggle');
    if (virtualToggle && virtualToggle.checked) {
        document.getElementById('gamepadContainer').classList.add('visible');
        document.getElementById('shoulderButtons').classList.add('visible');
        document.getElementById('btnSelect')?.classList.add('visible');
        document.getElementById('btnStart')?.classList.add('visible');
    } else {
        document.getElementById('gamepadContainer')?.classList.remove('visible');
        document.getElementById('shoulderButtons')?.classList.remove('visible');
        document.getElementById('btnSelect')?.classList.remove('visible');
        document.getElementById('btnStart')?.classList.remove('visible');
    }
    setDpadMode(currentDpadMode);
    updateButtonLayout();
}

function initControlsState() {
    const soundToggle = document.getElementById('soundToggle');
    if (gba && gba.audio) {
        gba.audio.masterEnable = soundToggle.checked;
        if (gba.audio.context && gba.audio.context.state !== 'running' && soundToggle.checked) {
            gba.audio.context.resume();
        }
    }

    const pixelToggle = document.getElementById('pixelToggle');
    if (pixelToggle) {
        setPixelated(pixelToggle.checked);
    }

    const dpadModeRadio = document.querySelector('input[name="dpadMode"]:checked');
    if (dpadModeRadio) {
        const dpadMode = dpadModeRadio.value;
        currentDpadMode = dpadMode;
        setDpadMode(dpadMode);
    }

    updateButtonLayout();
}

function setPixelated(enabled) {
    const canvas = document.getElementById('screen');
    if (enabled) {
        canvas.style.imageRendering = 'pixelated';
    } else {
        canvas.style.imageRendering = 'auto';
    }
}

function toggleSound(enabled) {
    if (gba && gba.audio) {
        gba.audio.masterEnable = enabled;
        if (enabled && gba.audio.context && gba.audio.context.state !== 'running') {
            gba.audio.context.resume();
        }
    }
}

let gameSpeedMultiplier = 1;
let lastSetSpeed = -1;

function setGameSpeed(speed) {
    const parsed = parseInt(speed);
    if (parsed === lastSetSpeed) return; // 防重复
    lastSetSpeed = parsed;

    // 保存到 localStorage，刷新后保留
    try { localStorage.setItem('gbaSpeed', parsed); } catch (e) {}
    
    const speeds = [0.5, 0.75, 1, 2, 4, 8, 16];
    const labels = ['0.5x', '0.75x', '1x', '2x', '4x', '8x', '16x'];
    const index = parsed - 1;
    gameSpeedMultiplier = speeds[index];

    const label = document.getElementById('speedLabel');
    if (label) {
        label.textContent = labels[index];
    }

    if (gba && gba.setSpeed) {
        gba.setSpeed(gameSpeedMultiplier);
    }
}

function hideGameUI() {
    gameLoaded = false;
    document.getElementById('loadHint').classList.remove('hidden');
    // 不隐藏虚拟按键，保持当前显示状态
    document.getElementById('settingsPanel').classList.remove('visible');
    document.getElementById('helpModal').classList.remove('visible');
    setGameControlsEnabled(false);
}

function setGameControlsEnabled(enabled) {
    const controls = [
        document.getElementById('btnPause'),
        document.getElementById('btnSave'),
        document.getElementById('btnLoad'),
        document.getElementById('closeRom'),
        document.getElementById('speedSlider')
    ];
    
    controls.forEach(control => {
        if (control) {
            control.disabled = !enabled;
        }
    });
}

function toggleVirtualButtons(show) {
    const gamepadContainer = document.getElementById('gamepadContainer');
    const shoulderButtons = document.getElementById('shoulderButtons');
    const btnSelect = document.getElementById('btnSelect');
    const btnStart = document.getElementById('btnStart');
    
    if (show) {
        gamepadContainer?.classList.add('visible');
        shoulderButtons?.classList.add('visible');
        btnSelect?.classList.add('visible');
        btnStart?.classList.add('visible');
    } else {
        gamepadContainer?.classList.remove('visible');
        shoulderButtons?.classList.remove('visible');
        btnSelect?.classList.remove('visible');
        btnStart?.classList.remove('visible');
    }
}

function toggleFpsDisplay(show) {
    const overlay = document.getElementById('fpsOverlay');
    if (overlay) {
        if (show) {
            overlay.classList.add('visible');
        } else {
            overlay.classList.remove('visible');
        }
    }
}

// === SHOW SETTINGS PANEL ===
function showSettings() {
    document.getElementById('settingsPanel').classList.add('visible');
}

// === MODIFIED RUN FUNCTION ===
const originalRun = window.run;
window.run = function(file) {
    showGameUI(file.name);
    originalRun(file);
};

// === MODIFIED TOGGLE PAUSE ===
const originalTogglePause = window.togglePause;
window.togglePause = function() {
    originalTogglePause();
    // 按钮状态更新由 main.js 中的 updatePauseButton() 处理
};

// === CLOSE ROM ===
function closeRomHandler() {
    // 隐藏设置面板
    document.getElementById('settingsPanel').classList.remove('visible');
    
    if (gba && typeof gba.pause === 'function') {
        // 只调用 gba 的公共 API
        gba.pause();
    }

    // 清空画布
    const canvas = document.getElementById('screen');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 重置UI状态
    hideGameUI();

    // 清空文件输入
    const loader = document.getElementById('loader');
    if (loader) loader.value = '';
}

// === Load Hint Interaction ===
const loadHint = document.getElementById('loadHint');

loadHint.addEventListener('click', () => {
    if (!gameLoaded) {
        document.getElementById('loader').click();
    }
});

loadHint.addEventListener('dragover', (e) => {
    e.preventDefault();
    loadHint.classList.add('dragover');
}, { passive: false });

loadHint.addEventListener('dragleave', (e) => {
    loadHint.classList.remove('dragover');
});

loadHint.addEventListener('drop', (e) => {
    e.preventDefault();
    loadHint.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.gba') || file.name.endsWith('.bin'))) {
        run(file);
    }
}, { passive: false });

// === HELP MODAL ESC KEY & F11 INTERCEPT ===
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('helpModal');
        if (modal.classList.contains('visible')) {
            toggleHelpModal();
        }
        // 退出全屏
        if (document.fullscreenElement || document.webkitIsFullScreen) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }
    
    // 拦截 F11 全屏
    if (e.key === 'F11') {
        e.preventDefault();
        fullScreen();
    }
});

// === FULLSCREEN CHANGE HANDLER ===
function handleFullscreenChange() {
    const isFullscreen = document.fullscreenElement || document.webkitIsFullScreen;

    // 更新全屏按钮图标和文字
    const fullscreenBtn = document.querySelector('.settings-btn[onclick="fullScreen()"]');
    if (fullscreenBtn) {
        if (isFullscreen) {
            fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i> 退出全屏';
        } else {
            fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i> 全屏模式';
        }
    }

    // 全屏时确保虚拟按键显示
    if (isFullscreen) {
        document.querySelector('.shoulder-buttons')?.classList.add('visible');
        document.querySelector('.gamepad-container')?.classList.add('visible');
        document.querySelector('.center-buttons')?.classList.add('visible');
        document.querySelector('.screen-container')?.classList.add('visible');
    }
    // 退出全屏时不移除虚拟按键，因为游戏可能还在运行
}

// === INITIALIZE ON LOAD ===
window.addEventListener('DOMContentLoaded', () => {
    // 恢复上次保存的速度
    const savedSpeed = (() => {
        try { return parseInt(localStorage.getItem('gbaSpeed')); } catch (e) { return null; }
    })();
    if (savedSpeed && savedSpeed >= 1 && savedSpeed <= 7) {
        const slider = document.getElementById('speedSlider');
        if (slider) {
            slider.value = savedSpeed;
            setGameSpeed(savedSpeed);
        }
    }

    initJoystick();
    initDPad();
    initVirtualButtons();
    setDpadMode(currentDpadMode);
    updateButtonLayout();

    // 初始化 FPS 覆盖层显示状态
    const fpsToggle = document.getElementById('fpsToggle');
    if (fpsToggle) {
        toggleFpsDisplay(fpsToggle.checked);
    }
    
    // 初始化时禁用游戏控制按钮（ROM 未加载）
    setGameControlsEnabled(false);

    // 初始化虚拟按键显示状态
    const virtualToggle = document.getElementById('virtualButtonsToggle');
    if (virtualToggle && virtualToggle.checked) {
        document.getElementById('gamepadContainer')?.classList.add('visible');
        document.getElementById('shoulderButtons')?.classList.add('visible');
        document.getElementById('btnSelect')?.classList.add('visible');
        document.getElementById('btnStart')?.classList.add('visible');
    }
    // btnMenu 始终可见
    document.getElementById('btnMenu')?.classList.add('visible');
    // center-buttons 容器始终可见
    document.getElementById('centerButtons')?.classList.add('visible');

    // === FULLSCREEN CHANGE EVENT ===
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // === RESIZE EVENT (F11 fullscreen detection) ===
    window.addEventListener('resize', handleFullscreenChange);

    // === ORIENTATION CHANGE ===
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    });
    
    // === MENU BUTTON ===
    document.getElementById('btnMenu').addEventListener('click', () => {
        showSettings();
    });
    
    // === CLOSE ROM ===
    document.getElementById('closeRom').addEventListener('click', closeRomHandler);
    
    // === SETTINGS TABS ===
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchSettingsTab(tab.dataset.tab);
        });
    });
});

document.addEventListener('click', (e) => {
    const panel = document.getElementById('settingsPanel');
    const btn = document.getElementById('btnMenu');
    if (panel.classList.contains('visible') && 
        !panel.contains(e.target) && 
        !btn.contains(e.target)) {
        panel.classList.remove('visible');
    }
});
