import { Drawing } from '/lib/drawing.js';
import '/lib/gif.js';

(() => {
    const width = 640;
    let height = 480;

    const fps = 5;
    const delayInMillis = 1000 / fps;
    const quality = 1;

    const videoDevices = [];
    let videoDeviceId = -1; // unset
    let video = null;

    let drawing = null;

    const captureList = [];
    let captureId = 0;

    let lastFrame = null;
    let frameList = null;

    let playAnimationInterval = null;
    let currentFrameId = 0;

    let gif = null;

    function load() {
        video = document.getElementById('video');
        captureList.push({ // TODO make Video class
            clear: () => { },
            image: () => video
        })

        drawing = new Drawing(document.getElementById('drawing'), { width, height })
        captureList.push(drawing);

        lastFrame = document.getElementById('lastFrame');
        frameList = document.getElementById('frameList');

        document.getElementById('switchCaptureButton').addEventListener(
            'click',
            (ev) => {
                document.querySelectorAll('#switchCaptureButton i, .input').forEach(
                    element => element.classList.toggle('hidden')
                )
                captureId = (captureId + 1) % captureList.length;

                ev.preventDefault();
            }
        )

        document.getElementById('clearDrawingButton').addEventListener(
            'click',
            (ev) => {
                drawing.clear();
                ev.preventDefault();
            }
        )

        document.getElementById('undoDrawingButton').addEventListener(
            'click',
            (ev) => {
                drawing.undo();
                ev.preventDefault();
            }
        )

        document.getElementById('captureButton').addEventListener(
            'click',
            (ev) => {
                const capture = captureList[captureId];
                captureFrame(capture.image());
                capture.clear();
                updateInputOpacity(0.5);
                ev.preventDefault();
            }
        );

        document.getElementById('playPauseButton').addEventListener(
            'click',
            (ev) => {
                playOrPauseAnimation();
                ev.preventDefault();
            }
        );

        document.getElementById('removeFrameButton').addEventListener(
            'click',
            (ev) => {
                removeFrame();
                ev.preventDefault();
            }
        );

        document.getElementById('downloadButton').addEventListener(
            'click',
            (ev) => {
                prepareDownload();
                ev.preventDefault();
            }
        );

        document.getElementById('saveButton').addEventListener(
            'click',
            (ev) => {
                download();
                ev.preventDefault();
            }
        );

        document.getElementById('cancelButton').addEventListener(
            'click',
            (ev) => {
                closeDownloadScreen();
                ev.preventDefault();
            }
        );

        video.addEventListener(
            'canplay',
            (ev) => {
                video.setAttribute('width', width);
                video.setAttribute('height', height);
            }
        );

        document.getElementById('switchCameraButton').addEventListener(
            'click',
            (ev) => {
                switchCamera();
                ev.preventDefault();
            }
        );

        frameList.style.width = `${width}px`;
        loadCameras();
        refreshControlsState();
    }

    function loadCameras() {
        navigator.mediaDevices.enumerateDevices().then((devices) => {
            devices
                .filter(device => device.kind === 'videoinput' && device.deviceId)
                .forEach(device => {
                    if (device.getCapabilities().facingMode.includes('environment')) {
                        videoDeviceId = videoDevices.length;
                    }
                    videoDevices.push(device);
                });

            if (videoDevices.length < 2) {
                document.getElementById('switchCameraButton').style.display = 'none';
            }

            if (videoDevices.length > 0) {
                switchCamera();
            } else {
                // TODO drawing mode only is possible
                // no cameras
                document.getElementById('loadingScreen').innerText = "Sorry you need a camera for this..."
            }
        });
    }

    function switchCamera() {
        if (video.srcObject) {
            // stop existing video stream
            video.srcObject.getTracks().forEach(track => track.stop());
        }

        navigator.mediaDevices
            .getUserMedia({
                video: {
                    deviceId: {
                        exact: videoDevices[videoDeviceId].deviceId
                    }
                }
            })
            .then((stream) => {
                video.srcObject = stream;
                video.play();
                document.getElementById('loadingScreen').style.display = 'none';
            })
            .catch((err) => {
                console.error(`An error occurred: ${err}`);
            });

        videoDeviceId = (videoDeviceId + 1) % videoDevices.length;
    }

    function refreshControlsState(play) {
        for (const button of document.querySelectorAll('#controls .btn')) {
            button.disabled = play;
        }
        const notEnoughFrames = frameList.children.length < 2;
        document.getElementById('removeFrameButton').disabled = (frameList.children.length < 1) || play;
        document.getElementById('playPauseButton').disabled = notEnoughFrames;
        document.getElementById('downloadButton').disabled = notEnoughFrames || play;
    }

    function updateInputOpacity(opacity) {
        document.querySelectorAll('.capture').forEach(input => {
            input.style.opacity = opacity;
        });
    }

    function copyCanvas(canvas) {
        const newCanvas = document.createElement('canvas');
        newCanvas.width = width;
        newCanvas.height = height;
        const newCanvasContext = newCanvas.getContext('2d', { willReadFrequently: true });
        newCanvasContext.drawImage(canvas, 0, 0);
        return newCanvas;
    }

    function captureFrame(input) {
        const context = lastFrame.getContext('2d');
        lastFrame.width = width;
        lastFrame.height = height;
        context.drawImage(input, 0, 0, width, height);

        const newFrame = copyCanvas(lastFrame);
        newFrame.addEventListener(
            'click',
            (ev) => {
                updateLastFrame(ev.target);
                ev.preventDefault();
            }
        );
        frameList.appendChild(newFrame);
        updateSelectedFrame(newFrame);

        refreshControlsState();
    }

    function updateLastFrame(frame) {
        lastFrame.getContext('2d').drawImage(frame, 0, 0);
        updateSelectedFrame(frame);
    }

    function updateSelectedFrame(frame) {
        for (const frame of frameList.children) {
            frame.classList.remove('selected');
        }
        frame.classList.add('selected');
    }

    function removeFrame() {
        if (!frameList.lastChild) {
            return;
        }
        const selectedFrame = document.querySelector('#frameList .selected');
        const selectedFrameId = Array.from(frameList.children).indexOf(selectedFrame);
        frameList.removeChild(selectedFrame);
        if (frameList.lastChild) {
            updateLastFrame(frameList.children[selectedFrameId] || frameList.lastChild);
        } else {
            updateInputOpacity(1);
        }
        refreshControlsState();
    }

    function renderNextFrame() {
        if (frameList.hasChildNodes()) {
            updateLastFrame(frameList.children[currentFrameId]);
            currentFrameId = (currentFrameId + 1) % frameList.children.length;
        }
    }

    function playOrPauseAnimation() {
        if (playAnimationInterval == null) {
            if (frameList.hasChildNodes()) {
                document.querySelectorAll('.input').forEach(input => {
                    input.style.visibility = 'hidden';
                });
                playAnimationInterval = setInterval(renderNextFrame, delayInMillis);
                const icon = document.getElementById('playPauseButtonIcon');
                icon.classList.remove('fa-play');
                icon.classList.add('fa-stop');

                refreshControlsState(true);
            }
        } else {
            clearInterval(playAnimationInterval);
            playAnimationInterval = null;
            currentFrameId = 0;
            document.querySelectorAll('.input').forEach(input => {
                input.style.visibility = 'visible';
            });
            updateLastFrame(frameList.lastChild);
            const icon = document.getElementById('playPauseButtonIcon');
            icon.classList.remove('fa-stop');
            icon.classList.add('fa-play');

            refreshControlsState(false);
        }
    }

    function showdownloadScreen(show) {
        document.getElementById('downloadScreen').style.display = show ? 'flex' : 'none';
        document.getElementById('captureScreen').style.display = show ? 'none' : 'flex';
    }

    function prepareDownload() {
        if (!frameList.hasChildNodes()) {
            return;
        }

        document.getElementById('saveButton').disabled = true;

        showdownloadScreen(true);

        gif = new GIF({
            repeat: 0,
            workers: 4,
            quality: quality,
            width: width,
            height: height,
            workerScript: 'lib/gif.worker.js'
        });

        for (const frame of frameList.children) {
            gif.addFrame(frame.getContext('2d'), { delay: delayInMillis });
        }

        const progressBar = document.getElementById('progressBar');
        progressBar.style.display = 'block';

        const progress = document.getElementById('progress');
        progress.style.width = '0%';

        gif.on('progress', (percent) => {
            progress.style.width = (100 * percent) + '%';
        });

        gif.on('finished', (blob) => {
            document.getElementById('preview').setAttribute('src', URL.createObjectURL(blob));
            progressBar.style.display = 'none';
            document.getElementById('saveButton').disabled = false;
        });

        gif.render();
    }

    function closeDownloadScreen() {
        document.getElementById('preview').setAttribute('src', '');
        if (gif) {
            gif.abort();
            for (const worker of gif.freeWorkers) {
                worker.terminate();
            }
            gif = null;
        }
        showdownloadScreen(false);
    }

    function download() {
        const link = document.createElement('a');
        link.setAttribute('href', document.getElementById('preview').getAttribute('src'));
        link.setAttribute('download', document.getElementById('fileName').value);
        link.click();
        closeDownloadScreen();
    }

    window.addEventListener('load', load, false);
})();