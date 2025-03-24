document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소
    const connectionMode = document.getElementById('connectionMode');
    const connectionId = document.getElementById('connectionId');
    const copyIdBtn = document.getElementById('copyId');
    const remoteId = document.getElementById('remoteId');
    const connectBtn = document.getElementById('connect');
    const startSharingBtn = document.getElementById('startSharing');
    const stopSharingBtn = document.getElementById('stopSharing');
    const disconnectBtn = document.getElementById('disconnect');
    const statusDisplay = document.getElementById('status');
    const remoteScreen = document.getElementById('remoteScreen');
    const enableControlBtn = document.getElementById('enableControl');
    const disableControlBtn = document.getElementById('disableControl');

    // PeerJS 객체
    let peer = null;
    let connection = null;
    let stream = null;
    let call = null;
    let remoteControlEnabled = false;

    // 초기화
    function initialize() {
        peer = new Peer(null, {
            debug: 2
        });

        peer.on('open', (id) => {
            connectionId.value = id;
            statusDisplay.textContent = '연결 ID가 생성되었습니다. 상대방에게 공유하세요.';
        });

        peer.on('connection', (conn) => {
            connection = conn;
            setupConnectionHandlers();
            statusDisplay.textContent = '상대방이 연결되었습니다.';
            disconnectBtn.disabled = false;
        });

        peer.on('call', (incomingCall) => {
            call = incomingCall;
            call.answer();
            
            call.on('stream', (remoteStream) => {
                remoteScreen.srcObject = remoteStream;
                remoteScreen.style.display = 'block';
                statusDisplay.textContent = '원격 화면을 수신 중입니다.';
            });
        });

        peer.on('error', (err) => {
            console.error('PeerJS 오류:', err);
            statusDisplay.textContent = `오류 발생: ${err.type}`;
        });
    }

    // 연결 핸들러 설정
    function setupConnectionHandlers() {
        connection.on('open', () => {
            statusDisplay.textContent = '데이터 채널이 열렸습니다.';
            disconnectBtn.disabled = false;
        });

        connection.on('data', (data) => {
            if (data.type === 'mouse') {
                handleRemoteMouseEvent(data);
            } else if (data.type === 'keyboard') {
                handleRemoteKeyboardEvent(data);
            } else if (data.type === 'control') {
                if (data.action === 'enable') {
                    statusDisplay.textContent = '상대방이 원격 제어를 활성화했습니다.';
                } else if (data.action === 'disable') {
                    statusDisplay.textContent = '상대방이 원격 제어를 비활성화했습니다.';
                }
            }
        });

        connection.on('close', () => {
            statusDisplay.textContent = '연결이 종료되었습니다.';
            resetConnection();
        });

        connection.on('error', (err) => {
            console.error('연결 오류:', err);
            statusDisplay.textContent = `연결 오류: ${err}`;
            resetConnection();
        });
    }

    // 원격 마우스 이벤트 처리
    function handleRemoteMouseEvent(data) {
        if (connectionMode.value === 'host') {
            // 호스트 모드에서는 원격 마우스 이벤트를 시스템에 전달
            const event = new MouseEvent(data.event, {
                clientX: data.x,
                clientY: data.y,
                button: data.button,
                buttons: data.buttons,
                ctrlKey: data.ctrlKey,
                altKey: data.altKey,
                shiftKey: data.shiftKey,
                metaKey: data.metaKey
            });
            
            // 시스템 레벨 이벤트 발생 (Node.js 또는 Electron 환경에서 사용)
            if (window.electronAPI) {
                window.electronAPI.sendMouseEvent(data);
            }
        }
    }

    // 원격 키보드 이벤트 처리
    function handleRemoteKeyboardEvent(data) {
        if (connectionMode.value === 'host') {
            // 호스트 모드에서는 원격 키보드 이벤트를 시스템에 전달
            if (window.electronAPI) {
                window.electronAPI.sendKeyboardEvent(data);
            }
        }
    }

    // 마우스 이벤트 전송
    function setupRemoteControl() {
        remoteScreen.addEventListener('mousedown', (e) => {
            if (!remoteControlEnabled) return;
            
            const rect = remoteScreen.getBoundingClientRect();
            const scaleX = remoteScreen.videoWidth / rect.width;
            const scaleY = remoteScreen.videoHeight / rect.height;
            
            connection.send({
                type: 'mouse',
                event: 'mousedown',
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
                button: e.button,
                buttons: e.buttons,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                metaKey: e.metaKey
            });
        });

        remoteScreen.addEventListener('mouseup', (e) => {
            if (!remoteControlEnabled) return;
            
            const rect = remoteScreen.getBoundingClientRect();
            const scaleX = remoteScreen.videoWidth / rect.width;
            const scaleY = remoteScreen.videoHeight / rect.height;
            
            connection.send({
                type: 'mouse',
                event: 'mouseup',
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
                button: e.button,
                buttons: e.buttons,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                metaKey: e.metaKey
            });
        });

        remoteScreen.addEventListener('mousemove', (e) => {
            if (!remoteControlEnabled) return;
            
            const rect = remoteScreen.getBoundingClientRect();
            const scaleX = remoteScreen.videoWidth / rect.width;
            const scaleY = remoteScreen.videoHeight / rect.height;
            
            connection.send({
                type: 'mouse',
                event: 'mousemove',
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
                button: e.button,
                buttons: e.buttons,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                metaKey: e.metaKey
            });
        });

        // 키보드 이벤트도 추가
        document.addEventListener('keydown', (e) => {
            if (!remoteControlEnabled) return;
            if (!remoteScreen.style.display === 'block') return;
            
            connection.send({
                type: 'keyboard',
                event: 'keydown',
                key: e.key,
                keyCode: e.keyCode,
                code: e.code,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                metaKey: e.metaKey
            });
            
            // 브라우저 기본 동작 방지
            e.preventDefault();
        });

        document.addEventListener('keyup', (e) => {
            if (!remoteControlEnabled) return;
            if (!remoteScreen.style.display === 'block') return;
            
            connection.send({
                type: 'keyboard',
                event: 'keyup',
                key: e.key,
                keyCode: e.keyCode,
                code: e.code,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                metaKey: e.metaKey
            });
            
            // 브라우저 기본 동작 방지
            e.preventDefault();
        });
    }

    // 연결 초기화
    function resetConnection() {
        if (connection) {
            connection.close();
            connection = null;
        }
        
        if (call) {
            call.close();
            call = null;
        }
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        remoteScreen.style.display = 'none';
        remoteScreen.srcObject = null;
        startSharingBtn.disabled = false;
        stopSharingBtn.disabled = true;
        disconnectBtn.disabled = true;
        enableControlBtn.disabled = true;
        disableControlBtn.disabled = true;
        remoteControlEnabled = false;
    }

    // 이벤트 리스너
    copyIdBtn.addEventListener('click', () => {
        connectionId.select();
        document.execCommand('copy');
        statusDisplay.textContent = 'ID가 클립보드에 복사되었습니다.';
    });

    connectBtn.addEventListener('click', () => {
        const targetId = remoteId.value.trim();
        if (!targetId) {
            statusDisplay.textContent = '연결할 상대방 ID를 입력하세요.';
            return;
        }

        connection = peer.connect(targetId);
        setupConnectionHandlers();
        statusDisplay.textContent = '연결 중...';
    });

    startSharingBtn.addEventListener('click', async () => {
        try {
            // 전체 화면 공유 (바탕화면 포함)
            stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    displaySurface: 'monitor' // 모니터 전체 화면 공유
                },
                audio: false
            });
            
            if (connection) {
                call = peer.call(connection.peer, stream);
                statusDisplay.textContent = '화면 공유 중...';
            } else {
                statusDisplay.textContent = '화면 공유를 시작했지만, 연결된 상대방이 없습니다.';
            }
            
            startSharingBtn.disabled = true;
            stopSharingBtn.disabled = false;
            
            // 원격 제어 버튼 활성화
            if (connectionMode.value === 'client') {
                enableControlBtn.disabled = false;
            }
            
            // 스트림 종료 감지
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                stopSharingBtn.click();
            });
        } catch (err) {
            console.error('화면 공유 오류:', err);
            statusDisplay.textContent = `화면 공유 오류: ${err.message}`;
        }
    });

    stopSharingBtn.addEventListener('click', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        if (call) {
            call.close();
            call = null;
        }
        
        startSharingBtn.disabled = false;
        stopSharingBtn.disabled = true;
        enableControlBtn.disabled = true;
        disableControlBtn.disabled = true;
        remoteControlEnabled = false;
        statusDisplay.textContent = '화면 공유가 중지되었습니다.';
    });

    disconnectBtn.addEventListener('click', () => {
        resetConnection();
        statusDisplay.textContent = '연결이 종료되었습니다.';
    });

    enableControlBtn.addEventListener('click', () => {
        remoteControlEnabled = true;
        enableControlBtn.disabled = true;
        disableControlBtn.disabled = false;
        enableControlBtn.classList.add('disabled');
        disableControlBtn.classList.remove('disabled');
        
        if (connection) {
            connection.send({
                type: 'control',
                action: 'enable'
            });
        }
        
        statusDisplay.textContent = '원격 제어가 활성화되었습니다.';
    });

    disableControlBtn.addEventListener('click', () => {
        remoteControlEnabled = false;
        enableControlBtn.disabled = false;
        disableControlBtn.disabled = true;
        enableControlBtn.classList.remove('disabled');
        disableControlBtn.classList.add('disabled');
        
        if (connection) {
            connection.send({
                type: 'control',
                action: 'disable'
            });
        }
        
        statusDisplay.textContent = '원격 제어가 비활성화되었습니다.';
    });

    // 모드 변경 시 UI 업데이트
    connectionMode.addEventListener('change', () => {
        resetConnection();
        if (connectionMode.value === 'host') {
            statusDisplay.textContent = '호스트 모드: 화면을 공유하고 원격 제어를 허용합니다.';
        } else {
            statusDisplay.textContent = '클라이언트 모드: 상대방의 화면을 보고 원격 제어합니다.';
        }
    });

    // 초기화 및 원격 제어 설정
    initialize();
    setupRemoteControl();
}); 