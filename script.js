(() => {
    const width = 640;
    let height = 0;

    const fps = 5;
    const delayInMillis = 1000 / fps;
    const quality = 1;

    const videoSources = ['environment', 'user'];
    let videoSourceId = -1; // unset
    let video = null;

    let lastFrame = null;
    let frameList = null;

    let playAnimationInterval = null;
    let currentFrameId = 0;

    function load() {
        video = document.getElementById('video');
        lastFrame = document.getElementById('lastFrame');
        frameList = document.getElementById('frameList');

        video.addEventListener(
            'canplay',
            (ev) => {
                height = video.videoHeight / (video.videoWidth / width);
                video.setAttribute('width', width);
                video.setAttribute('height', height);
                frameList.style.width = `${width}px`;
            }
        );

        document.getElementById('captureButton').addEventListener(
            'click',
            (ev) => {
                captureFrame();
                updateCameraOpacity(0.5);
                ev.preventDefault();
            }
        );
        document.getElementById('switchCameraButton').addEventListener(
            'click',
            (ev) => {
                switchCamera();
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

        document.getElementById('save').addEventListener(
            'click',
            (ev) => {
                download();
                ev.preventDefault();
            }
        );

        document.getElementById('cancel').addEventListener(
            'click',
            (ev) => {
                closeDownloadModal();
                ev.preventDefault();
            }
        );

        switchCamera();
        clearFrame();
        refreshControlsState();
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

    function switchCamera() {
        videoSourceId = (videoSourceId + 1) % videoSources.length;

        navigator.mediaDevices
            .getUserMedia({
                video: {
                    facingMode: videoSources[videoSourceId]
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
    }

    function updateCameraOpacity(opacity) {
        document.querySelectorAll('.camera').forEach(camera => {
            camera.style.opacity = opacity;
        });
    }

    function clearFrame() {
        const context = lastFrame.getContext('2d', { willReadFrequently: true });
        context.fillStyle = '#CCC';
        context.fillRect(0, 0, lastFrame.width, lastFrame.height);
    }

    function copyCanvas(canvas) {
        const newCanvas = document.createElement('canvas');
        newCanvas.width = width;
        newCanvas.height = height;
        const newCanvasContext = newCanvas.getContext('2d', { willReadFrequently: true });
        newCanvasContext.drawImage(canvas, 0, 0);
        return newCanvas;
    }

    function captureFrame() {
        const context = lastFrame.getContext('2d');
        lastFrame.width = width;
        lastFrame.height = height;
        context.drawImage(video, 0, 0, width, height);

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
            clearFrame();
            updateCameraOpacity(1);
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
                document.querySelectorAll('.camera').forEach(camera => {
                    camera.style.visibility = 'hidden';
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
            document.querySelectorAll('.camera').forEach(camera => {
                camera.style.visibility = 'visible';
            });
            updateLastFrame(frameList.lastChild);
            const icon = document.getElementById('playPauseButtonIcon');
            icon.classList.remove('fa-stop');
            icon.classList.add('fa-play');

            refreshControlsState(false);
        }
    }

    function showDownloadModal(show) {
        document.getElementById('downloadModal').style.display = show ? 'flex' : 'none';
        document.getElementById('captureWindow').style.display = show ? 'none' : 'flex';
    }
    function prepareDownload() {
        if (!frameList.hasChildNodes()) {
            return;
        }

        document.getElementById('save').disabled = true;

        showDownloadModal(true);

        var gif = new GIF({
            repeat: 0,
            workers: 4,
            quality: quality,
            width: width,
            height: height
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
            document.getElementById('save').disabled = false;
        });

        gif.render();
    }

    function closeDownloadModal() {
        document.getElementById('preview').setAttribute('src', '');
        showDownloadModal(false);
    }

    function download() {
        const link = document.createElement('a');
        link.setAttribute('href', document.getElementById('preview').getAttribute('src'));
        link.setAttribute('download', document.getElementById('fileName').value);
        link.click();
        closeDownloadModal();
    }

    window.addEventListener('load', load, false);
})();