(() => {
    const width = 640;
    const fps = 5; // 200 ms/frame
    let height = 0;

    let video = null;
    let lastPhoto = null;
    let photoList = null;

    let playAnimationInterval = null;
    let currentFrame = 0;

    const videoSources = ['environment', 'user'];
    let videoSourceId = -1; // unset

    function switchCamera() {
        videoSourceId = (videoSourceId + 1) % videoSources.length;

        navigator.mediaDevices
            .getUserMedia({
                video: {
                  facingMode: { exact: videoSources[videoSourceId] }
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
        video = document.getElementById("video");
        lastPhoto = document.getElementById("lastPhoto");
        photoList = document.getElementById("photoList");

        switchCamera();

        video.addEventListener(
            "canplay",
            (ev) => {
                height = video.videoHeight / (video.videoWidth / width);
                video.setAttribute("width", width);
                video.setAttribute("height", height);
            }
        );

        document.getElementById("captureButton").addEventListener(
            "click",
            (ev) => {
                takePhoto();
                updateCameraOpacity(0.5);
                ev.preventDefault();
            }
        );
        document.getElementById('switchCameraButton').addEventListener(
            'click',
            switchCamera
        );

        document.getElementById("playOrPauseButton").addEventListener(
            "click",
            (ev) => {
                playOrPauseAnimation();
                ev.preventDefault();
            }
        );

        document.getElementById("resetButton").addEventListener(
            "click",
            (ev) => {
                clearPhoto();
                photoList.replaceChildren();
                document.getElementById('preview').setAttribute('src', '');
                updateCameraOpacity(1);
                ev.preventDefault();
            }
        );

        document.getElementById("undoButton").addEventListener(
            "click",
            (ev) => {
                if (!photoList.lastChild) {
                    return;
                }
                photoList.removeChild(photoList.lastChild);
                // repaint canvas with last child if any otherwise clearPhoto()
                if (photoList.lastChild) {
                    const lastPhotoContext = lastPhoto.getContext("2d");
                    lastPhotoContext.drawImage(photoList.lastChild, 0, 0);
                } else {
                    clearPhoto();
                    updateCameraOpacity(1);
                }
                ev.preventDefault();
            }
        );

        document.getElementById("downloadButton").addEventListener(
            "click",
            (ev) => {
                download();
            }
        );

        clearPhoto();
    }

    function updateCameraOpacity(opacity) {
        document.querySelectorAll('.camera').forEach(camera => {
           camera.style.opacity = opacity;
        });
    }

    function clearPhoto() {
        const context = lastPhoto.getContext("2d");
        context.fillStyle = "#CCC";
        context.fillRect(0, 0, lastPhoto.width, lastPhoto.height);
    }

    function copyCanvas(canvas) {
        const newCanvas = document.createElement("canvas");
        newCanvas.width = width;
        newCanvas.height = height;
        const newCanvasContext = newCanvas.getContext("2d");
        newCanvasContext.drawImage(canvas, 0, 0);
        return newCanvas;
    }

    function takePhoto() {
        const context = lastPhoto.getContext("2d");
        lastPhoto.width = width;
        lastPhoto.height = height;
        context.drawImage(video, 0, 0, width, height);

        photoList.appendChild(copyCanvas(lastPhoto));
    }

    function playOrPauseAnimation() {
        if (playAnimationInterval == null) {
            if (photoList.hasChildNodes()) {
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
            lastPhoto.getContext('2d').drawImage(photoList.children[photoList.children.length-1], 0, 0);
            playOrPauseButton.textContent = 'Play';
        }
    }

    function renderNextFrame() {
        if (photoList.hasChildNodes()) {
            lastPhoto.getContext('2d').drawImage(photoList.children[currentFrame], 0, 0);
            currentFrame = (currentFrame + 1) % photoList.children.length;
        }
    }

    function download() {
        if (!photoList.hasChildNodes()) {
            return;
        }

        const encoder = new GIFEncoder();
        encoder.setRepeat(0);
        encoder.setFrameRate(5 /* FPS */);
        encoder.start();

        var i = 0;
        const progress = document.getElementById('progress');
        var downloadIntervalId = setInterval(function() {
            if (i < photoList.children.length) {
                encoder.addFrame(photoList.children[i].getContext("2d", {willReadFrequently: true}));
                i += 1;
                progress.innerText = (100.0*i/photoList.children.length).toFixed(0) + '%';
            } else {
                encoder.finish();
                document.getElementById('preview').setAttribute('src', 'data:image/gif;base64,' + btoa(encoder.stream().getData()));
                encoder.download('stop-motion-animation.gif');

                progress.innerText = 'Download Complete';
                clearInterval(downloadIntervalId);
            }
        }, 1);
    }

    window.addEventListener("load", load, false);
})();