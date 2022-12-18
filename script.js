(() => {
    const width = 640;
    const fps = 5; // 200 ms/frame
    let height = 0;

    let video = null;
    let lastFrame = null;
    let frameList = null;

    let playAnimationInterval = null;
    let currentFrame = 0;

    const videoSources = ['environment', 'user'];
    let videoSourceId = -1; // unset

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
            })
            .catch((err) => {
                console.error(`An error occurred: ${err}`);
            });
    }

    function load() {
        video = document.getElementById('video');
        lastFrame = document.getElementById('lastFrame');
        frameList = document.getElementById('frameList');

        switchCamera();

        video.addEventListener(
            'canplay',
            (ev) => {
                height = video.videoHeight / (video.videoWidth / width);
                video.setAttribute('width', width);
                video.setAttribute('height', height);
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
            switchCamera
        );

        document.getElementById('playOrPauseButton').addEventListener(
            'click',
            (ev) => {
                playOrPauseAnimation();
                ev.preventDefault();
            }
        );

        document.getElementById('undoButton').addEventListener(
            'click',
            (ev) => {
                if (!frameList.lastChild) {
                    return;
                }
                frameList.removeChild(frameList.lastChild);
                if (frameList.lastChild) {
                    updateLastFrame(frameList.lastChild);
                } else {
                    clearFrame();
                    updateCameraOpacity(1);
                }
                ev.preventDefault();
            }
        );

        document.getElementById('downloadButton').addEventListener(
            'click',
            (ev) => {
                download();
                ev.preventDefault();
            }
        );

        clearFrame();
    }

    function updateCameraOpacity(opacity) {
        document.querySelectorAll('.camera').forEach(camera => {
           camera.style.opacity = opacity;
        });
    }

    function clearFrame() {
        const context = lastFrame.getContext('2d');
        context.fillStyle = '#CCC';
        context.fillRect(0, 0, lastFrame.width, lastFrame.height);
    }

    function copyCanvas(canvas) {
        const newCanvas = document.createElement('canvas');
        newCanvas.width = width;
        newCanvas.height = height;
        const newCanvasContext = newCanvas.getContext('2d');
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
    }

    function playOrPauseAnimation() {
        if (playAnimationInterval == null) {
            if (frameList.hasChildNodes()) {
                document.querySelectorAll('.camera').forEach(camera => {
                   camera.style.visibility = 'hidden';
                });
                playAnimationInterval = setInterval(renderNextFrame, 1000/fps);
                playOrPauseButton.textContent = 'Pause';
            }
        } else {
            clearInterval(playAnimationInterval);
            playAnimationInterval = null;
            currentFrame = 0;
            document.querySelectorAll('.camera').forEach(camera => {
               camera.style.visibility = 'visible';
            });
            updateLastFrame(frameList.lastChild);
            playOrPauseButton.textContent = 'Play';
        }
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

    function renderNextFrame() {
        if (frameList.hasChildNodes()) {
            updateLastFrame(frameList.children[currentFrame]);
            currentFrame = (currentFrame + 1) % frameList.children.length;
        }
    }

    function download() {
        if (!frameList.hasChildNodes()) {
            return;
        }

        const encoder = new GIFEncoder();
        encoder.setRepeat(0);
        encoder.setFrameRate(fps);
        encoder.start();

        var i = 0;
        const progress = document.getElementById('progress');
        var downloadIntervalId = setInterval(function() {
            if (i < frameList.children.length) {
                encoder.addFrame(frameList.children[i].getContext('2d', {willReadFrequently: true}));
                i += 1;
                progress.innerText = (100.0*i/frameList.children.length).toFixed(0) + '%';
            } else {
                encoder.finish();
                document.getElementById('preview').setAttribute('src', 'data:image/gif;base64,' + btoa(encoder.stream().getData()));
                encoder.download('stop-motion-animation.gif');

                progress.innerText = 'Download Complete';
                clearInterval(downloadIntervalId);
            }
        }, 1);
    }

    window.addEventListener('load', load, false);
})();