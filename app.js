document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소
    const connectionModeSelect = document.getElementById('connectionMode');
    const connectionIdInput = document.getElementById('connectionId');
    const copyIdButton = document.getElementById('copyId');
    const remoteIdInput = document.getElementById('remoteId');
    const connectButton = document.getElementById('connect');
    const startSharingButton = document.getElementById('startSharing');
    const stopSharingButton = document.getElementById('stopSharing');
    const disconnectButton = document.getElementById('disconnect');
    const statusDiv = document.getElementById('status');
    const remoteScreen = document.getElementById('remoteScreen');

    // 변수
    let peer = null;
    let connection = null;
    let localStream = null;
    let call = null;
    let isHost = true;

    // 초기화
    function initialize() {
        // 랜덤 ID 생성
        const peerId = generateRandomId();
        
        // PeerJS 초기화
        peer = new Peer(peerId, {
            debug: 2
        });

        peer.on('open', (id) => {
            connectionIdInput.value = id;
            statusDiv.textContent = '연결 준비 완료. ID를 공유하세요.';
        });

        peer.on('error', (err) => {
            console.error('PeerJS 오류:', err);
            statusDiv.textContent = `오류 발생: ${err.type}`;
        });

        // 연결 요청 수신 처리
        peer.on('connection', (conn) => {
            connection = conn;
            setupConnectionHandlers();
            statusDiv.textContent = '연결됨! 화면 공유를 시작할 수 있습니다.';
            disconnectButton.disabled = false;
        });

        // 미디어 스트림 수신 처리
        peer.on('call', (incomingCall) => {
            call = incomingCall;
            call.answer(); // 응답 (로컬 스트림 없이)
            
            call.on('stream', (stream) => {
                remoteScreen.srcObject = stream;
                remoteScreen.style.display = 'block';
                statusDiv.textContent = '원격 화면을 수신 중입니다.';
            });
        });

        // 모드에 따른 UI 조정
        updateUIForMode();
    }

    // 연결 모드 변경 시 UI 업데이트
    connectionModeSelect.addEventListener('change', () => {
        isHost = connectionModeSelect.value === 'host';
        updateUIForMode();
    });

    // 모드에 따른 UI 조정
    function updateUIForMode() {
        if (isHost) {
            startSharingButton.style.display = 'block';
            remoteIdInput.parentElement.style.display = 'none';
            connectButton.style.display = 'none';
        } else {
            startSharingButton.style.display = 'none';
            remoteIdInput.parentElement.style.display = 'block';
            connectButton.style.display = 'inline-block';
        }
    }

    // 연결 ID 복사
    copyIdButton.addEventListener('click', () => {
        connectionIdInput.select();
        document.execCommand('copy');
        statusDiv.textContent = 'ID가 클립보드에 복사되었습니다!';
        setTimeout(() => {
            statusDiv.textContent = '연결 준비 완료. ID를 공유하세요.';
        }, 2000);
    });

    // 연결 버튼 클릭
    connectButton.addEventListener('click', () => {
        const remoteId = remoteIdInput.value.trim();
        if (!remoteId) {
            statusDiv.textContent = '원격 ID를 입력하세요.';
            return;
        }

        statusDiv.textContent = '연결 중...';
        connection = peer.connect(remoteId);
        setupConnectionHandlers();
    });

    // 연결 핸들러 설정
    function setupConnectionHandlers() {
        connection.on('open', () => {
            statusDiv.textContent = '연결됨! 원격 화면을 기다리는 중...';
            disconnectButton.disabled = false;
        });

        connection.on('data', (data) => {
            console.log('데이터 수신:', data);
            // 원격 제어 명령 처리
            if (data.type === 'control') {
                handleRemoteControl(data.action);
            }
        });

        connection.on('close', () => {
            statusDiv.textContent = '연결이 종료되었습니다.';
            resetConnection();
        });

        connection.on('error', (err) => {
            console.error('연결 오류:', err);
            statusDiv.textContent = `연결 오류: ${err}`;
            resetConnection();
        });
    }

    // 화면 공유 시작
    startSharingButton.addEventListener('click', async () => {
        try {
            localStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });

            startSharingButton.disabled = true;
            stopSharingButton.disabled = false;
            statusDiv.textContent = '화면 공유 중...';

            // 연결된 피어에게 스트림 전송
            if (connection && connection.open) {
                call = peer.call(connection.peer, localStream);
            }

            // 로컬 스트림 종료 감지
            localStream.getVideoTracks()[0].onended = () => {
                stopSharing();
            };
        } catch (err) {
            console.error('화면 공유 오류:', err);
            statusDiv.textContent = '화면 공유를 시작할 수 없습니다.';
        }
    });

    // 화면 공유 중지
    stopSharingButton.addEventListener('click', stopSharing);

    function stopSharing() {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        startSharingButton.disabled = false;
        stopSharingButton.disabled = true;
        statusDiv.textContent = '화면 공유가 중지되었습니다.';
    }

    // 연결 종료
    disconnectButton.addEventListener('click', () => {
        if (connection) {
            connection.close();
        }
        resetConnection();
    });

    // 연결 초기화
    function resetConnection() {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        if (call) {
            call.close();
            call = null;
        }
        
        connection = null;
        remoteScreen.srcObject = null;
        remoteScreen.style.display = 'none';
        startSharingButton.disabled = false;
        stopSharingButton.disabled = true;
        disconnectButton.disabled = true;
        statusDiv.textContent = '연결 준비 완료. ID를 공유하세요.';
    }

    // 원격 제어 처리
    function handleRemoteControl(action) {
        // 마우스 및 키보드 이벤트 처리
        console.log('원격 제어 명령:', action);
        
        if (action.type === 'click') {
            // 화면 크기에 맞게 좌표 변환
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            
            const x = Math.floor(action.x * screenWidth);
            const y = Math.floor(action.y * screenHeight);
            
            // 클릭 이벤트 시뮬레이션
            simulateClick(x, y);
        }
    }

    // 클릭 시뮬레이션 함수
    function simulateClick(x, y) {
        // 브라우저에서 직접 클릭을 시뮬레이션하는 것은 보안상 제한이 있습니다.
        // 따라서 사용자에게 클릭 위치를 알려주는 시각적 표시를 제공합니다.
        const clickIndicator = document.createElement('div');
        clickIndicator.style.position = 'fixed';
        clickIndicator.style.left = `${x}px`;
        clickIndicator.style.top = `${y}px`;
        clickIndicator.style.width = '20px';
        clickIndicator.style.height = '20px';
        clickIndicator.style.borderRadius = '50%';
        clickIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
        clickIndicator.style.zIndex = '9999';
        clickIndicator.style.pointerEvents = 'none'; // 클릭 이벤트를 방해하지 않도록
        
        document.body.appendChild(clickIndicator);
        
        // 애니메이션 효과
        clickIndicator.animate([
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'scale(2)' }
        ], {
            duration: 500,
            easing: 'ease-out'
        }).onfinish = () => {
            document.body.removeChild(clickIndicator);
        };
        
        // 실제 클릭 이벤트 발생 (참고: 브라우저 보안 정책으로 인해 제한적으로 작동)
        try {
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
            });
            
            // 클릭 위치에 있는 요소 찾기
            const element = document.elementFromPoint(x, y);
            if (element) {
                element.dispatchEvent(clickEvent);
                statusDiv.textContent = `${element.tagName} 요소를 클릭했습니다.`;
            }
        } catch (err) {
            console.error('클릭 시뮬레이션 오류:', err);
        }
    }

    // 랜덤 ID 생성
    function generateRandomId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // 원격 화면에 마우스 이벤트 리스너 추가
    remoteScreen.addEventListener('click', (e) => {
        if (!connection || !connection.open || isHost) return;
        
        const rect = remoteScreen.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width).toFixed(4);
        const y = ((e.clientY - rect.top) / rect.height).toFixed(4);
        
        connection.send({
            type: 'control',
            action: {
                type: 'click',
                x: parseFloat(x),
                y: parseFloat(y)
            }
        });
    });

    // 초기화 실행
    initialize();
}); 